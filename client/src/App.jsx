import React, { useEffect, useState } from "react";
import SchemaDiagram from "./components/SchemaDiagram.jsx";
import DataDiagram from "./components/DataDiagram.jsx";
import DataGrid from "./components/DataGrid.jsx";
import { fetchSchema } from "./api.js";

export default function App() {
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);

  // mode: "schema" | "pickRow" | "data"
  const [mode, setMode] = useState("schema");
  const [activeTable, setActiveTable] = useState(null);
  const [activeRow, setActiveRow] = useState(null);

  useEffect(() => {
    fetchSchema().then(setSchema).catch((e) => setError(e.message));
  }, []);

  function handleSelectTable(tableName) {
    setActiveTable(tableName);
    setActiveRow(null);
    setMode("pickRow");
  }

  function handleDrillInto(tableName, row) {
    setActiveTable(tableName);
    setActiveRow(row);
    setMode("data");
  }

  if (error) {
    return <div style={{ color: "#e66", padding: 20 }}>Error: {error}</div>;
  }
  if (!schema) {
    return <div style={{ color: "#aaa", padding: 20 }}>Loading schema…</div>;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#141414", color: "#eee" }}>
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #333",
          display: "flex",
          gap: 12,
          alignItems: "center",
          fontFamily: "sans-serif",
        }}
      >
        <button style={navBtn} onClick={() => setMode("schema")}>
          ← Whole DB
        </button>
        {activeTable && (
          <span style={{ color: "#888" }}>
            {mode === "pickRow" && `Select a row in "${activeTable}" to see linked data`}
            {mode === "data" && `Linked data for "${activeTable}"`}
          </span>
        )}
      </div>

      <div style={{ height: "calc(100% - 40px)" }}>
        {mode === "schema" && (
          <SchemaDiagram schema={schema} onSelectTable={handleSelectTable} />
        )}

        {mode === "pickRow" && activeTable && (
          <div style={{ padding: 16, maxWidth: 700 }}>
            <DataGrid
              table={activeTable}
              pageSize={10}
              onRowClick={(row) => handleDrillInto(activeTable, row)}
            />
          </div>
        )}

        {mode === "data" && activeTable && activeRow && (
          <DataDiagram
            schema={schema}
            rootTable={activeTable}
            rootRow={activeRow}
            onDrillInto={handleDrillInto}
          />
        )}
      </div>
    </div>
  );
}

const navBtn = {
  background: "#333",
  color: "#eee",
  border: "1px solid #555",
  borderRadius: 4,
  padding: "4px 10px",
  cursor: "pointer",
};
