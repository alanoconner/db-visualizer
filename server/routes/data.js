import { Router } from "express";
import { readOnlyQuery } from "../db.js";

export const dataRouter = Router();

// Only allow simple table/column identifiers (letters, digits, underscore).
// Anything else is rejected before it ever touches string-built SQL.
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function quoteIdent(name) {
  if (!IDENT_RE.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${name}"`;
}

// Only a single, standalone SELECT statement is allowed for custom queries.
// This is a coarse guard, not a full SQL parser — the READ ONLY transaction
// in db.js is the real backstop against mutation.
function assertSelectOnly(sql) {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!/^select\s/i.test(trimmed)) {
    throw new Error("Only SELECT statements are allowed");
  }
  if (trimmed.includes(";")) {
    throw new Error("Multiple statements are not allowed");
  }
  return trimmed;
}

// GET /api/table/:table/rows?limit=25&offset=0
dataRouter.get("/table/:table/rows", async (req, res) => {
  try {
    const table = quoteIdent(req.params.table);
    const limit = Math.min(parseInt(req.query.limit) || 25, 200);
    const offset = parseInt(req.query.offset) || 0;

    const rows = await readOnlyQuery(
      `SELECT * FROM ${table} ORDER BY 1 LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const count = await readOnlyQuery(`SELECT COUNT(*) FROM ${table}`);

    res.json({
      rows: rows.rows,
      total: parseInt(count.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/table/:table/query   { sql: "SELECT id, name FROM ... WHERE ..." }
// Lets the user run a scoped, read-only custom SELECT against one table.
dataRouter.post("/table/:table/query", async (req, res) => {
  try {
    const sql = assertSelectOnly(req.body.sql || "");
    const result = await readOnlyQuery(sql);
    res.json({ rows: result.rows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/linked
// Body: { table, column, value, foreignKeys: [...] }
// Given a selected row (identified by one column's value), finds rows in
// every directly linked table (one hop, both directions along FKs).
dataRouter.post("/linked", async (req, res) => {
  try {
    const { table, column, value, foreignKeys } = req.body;
    quoteIdent(table);
    quoteIdent(column);

    const results = [];

    for (const fk of foreignKeys) {
      // Table references another table (outgoing FK)
      if (fk.sourceTable === table && fk.sourceColumn === column) {
        const t = quoteIdent(fk.targetTable);
        const c = quoteIdent(fk.targetColumn);
        const r = await readOnlyQuery(
          `SELECT * FROM ${t} WHERE ${c} = $1 LIMIT 50`,
          [value]
        );
        results.push({
          table: fk.targetTable,
          direction: "references",
          via: `${table}.${column} -> ${fk.targetTable}.${fk.targetColumn}`,
          rows: r.rows,
        });
      }
      // Another table references this one (incoming FK)
      if (fk.targetTable === table && fk.targetColumn === column) {
        const t = quoteIdent(fk.sourceTable);
        const c = quoteIdent(fk.sourceColumn);
        const r = await readOnlyQuery(
          `SELECT * FROM ${t} WHERE ${c} = $1 LIMIT 50`,
          [value]
        );
        results.push({
          table: fk.sourceTable,
          direction: "referencedBy",
          via: `${fk.sourceTable}.${fk.sourceColumn} -> ${table}.${column}`,
          rows: r.rows,
        });
      }
    }

    res.json({ linked: results });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
