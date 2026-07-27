import { Router } from "express";
import { readOnlyQuery } from "../db.js";

export const schemaRouter = Router();

// GET /api/schema
// Returns { tables: [{ name, columns: [...] }], foreignKeys: [...] }
schemaRouter.get("/schema", async (req, res) => {
  try {
    const columnsResult = await readOnlyQuery(`
      SELECT c.table_name, c.column_name, c.data_type, c.is_nullable
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    const pkResult = await readOnlyQuery(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    `);

    const fkResult = await readOnlyQuery(`
      SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    const pkSet = new Set(
      pkResult.rows.map((r) => `${r.table_name}.${r.column_name}`)
    );

    const tablesByName = new Map();
    for (const col of columnsResult.rows) {
      if (!tablesByName.has(col.table_name)) {
        tablesByName.set(col.table_name, {
          name: col.table_name,
          columns: [],
        });
      }
      tablesByName.get(col.table_name).columns.push({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === "YES",
        isPrimaryKey: pkSet.has(`${col.table_name}.${col.column_name}`),
      });
    }

    res.json({
      tables: Array.from(tablesByName.values()),
      foreignKeys: fkResult.rows.map((r) => ({
        sourceTable: r.source_table,
        sourceColumn: r.source_column,
        targetTable: r.target_table,
        targetColumn: r.target_column,
        name: r.constraint_name,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
