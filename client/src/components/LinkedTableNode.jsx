import React from "react";
import { Handle, Position } from "reactflow";
import DataGrid from "./DataGrid.jsx";

// data: { table, rows, total, direction, via, onDrillInto }
export default function LinkedTableNode({ data }) {
  return (
    <div
      style={{
        border: "1px solid #444",
        borderRadius: 6,
        background: "#1e1e1e",
        color: "#eee",
        width: 340,
        fontFamily: "monospace",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div
        style={{
          background: "#333",
          padding: "6px 10px",
          fontWeight: "bold",
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{data.table}</span>
        <span style={{ color: "#888", fontWeight: "normal", fontSize: 10 }}>
          {data.direction === "references" ? "→ references" : "← referenced by"}
        </span>
      </div>
      <div style={{ padding: 8 }}>
        <DataGrid
          table={data.table}
          initialRows={data.rows}
          initialTotal={data.rows.length}
          pageSize={5}
          onRowClick={(row) => data.onDrillInto && data.onDrillInto(data.table, row)}
        />
      </div>
    </div>
  );
}
