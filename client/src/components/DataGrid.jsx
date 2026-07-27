import React, { useEffect, useState } from "react";
import { fetchTableRows, runCustomQuery } from "../api.js";

// props: { table, initialRows, initialTotal, pageSize, onRowClick }
// If initialRows is provided (e.g. from the /linked endpoint) it's shown
// first; pagination/custom-query fetches replace it.
export default function DataGrid({
  table,
  initialRows = [],
  initialTotal = null,
  pageSize = 10,
  onRowClick,
}) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryMode, setQueryMode] = useState(false);
  const [sql, setSql] = useState(`SELECT * FROM ${table} LIMIT 25`);

  useEffect(() => {
    // If no rows were handed to us up front, this grid is being used
    // standalone (e.g. the row picker) — load page 1 ourselves.
    if (initialRows.length === 0) {
      loadPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  async function loadPage(newOffset) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTableRows(table, pageSize, newOffset);
      setRows(data.rows);
      setTotal(data.total);
      setOffset(newOffset);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runQuery() {
    setLoading(true);
    setError(null);
    try {
      const data = await runCustomQuery(table, sql);
      setRows(data.rows);
      setTotal(null); // custom query result isn't paginated against COUNT(*)
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const columns = rows.length ? Object.keys(rows[0]) : [];
  const showPagination = total !== null && total > rows.length;
  const needsPagination = (total ?? rows.length) > pageSize;

  return (
    <div style={{ fontSize: 11, fontFamily: "monospace" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#888" }}>
          {total !== null ? `${total} rows` : `${rows.length} rows (custom query)`}
        </span>
        {needsPagination && (
          <button onClick={() => setQueryMode((v) => !v)} style={btnStyle}>
            {queryMode ? "close query" : "custom query"}
          </button>
        )}
      </div>

      {queryMode && (
        <div style={{ marginBottom: 6 }}>
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            rows={3}
            style={{ width: "100%", background: "#111", color: "#eee", fontFamily: "monospace" }}
          />
          <button onClick={runQuery} style={btnStyle}>
            run
          </button>
        </div>
      )}

      {error && <div style={{ color: "#e66" }}>{error}</div>}
      {loading && <div style={{ color: "#888" }}>loading…</div>}

      <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #333" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} style={thStyle}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
              >
                {columns.map((c) => (
                  <td key={c} style={tdStyle}>
                    {String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && !queryMode && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <button disabled={offset === 0} onClick={() => loadPage(Math.max(0, offset - pageSize))} style={btnStyle}>
            prev
          </button>
          <span style={{ color: "#888" }}>
            {offset + 1}–{Math.min(offset + pageSize, total)}
          </span>
          <button disabled={offset + pageSize >= total} onClick={() => loadPage(offset + pageSize)} style={btnStyle}>
            next
          </button>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #444",
  padding: "2px 6px",
  color: "#aaa",
  position: "sticky",
  top: 0,
  background: "#1e1e1e",
};
const tdStyle = { borderBottom: "1px solid #2a2a2a", padding: "2px 6px" };
const btnStyle = {
  background: "#333",
  color: "#eee",
  border: "1px solid #555",
  borderRadius: 4,
  padding: "2px 8px",
  cursor: "pointer",
  fontSize: 10,
};
