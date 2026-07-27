import React from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import DataGrid from "./DataGrid.jsx";

// data: { table, rows, total, direction, via, onDrillInto }
export default function LinkedTableNode({ data, selected }) {
  return (
    <div
      style={{
        border: "1px solid #444",
        borderRadius: 6,
        background: "#1e1e1e",
        color: "#eee",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      }}
    >
      <NodeResizer isVisible={selected} minWidth={260} minHeight={140} />
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
          flexShrink: 0,
        }}
      >
        <span>{data.table}</span>
        <span style={{ color: "#888", fontWeight: "normal", fontSize: 10 }}>
          {data.direction === "references" ? "→ references" : "← referenced by"}
        </span>
      </div>
      <div style={{ padding: 8, flex: 1, minHeight: 0, display: "flex" }}>
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
