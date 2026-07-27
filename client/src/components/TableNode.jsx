import React from "react";
import { Handle, Position } from "reactflow";

// data: { name, columns, onSelect }
export default function TableNode({ data }) {
  return (
    <div
      onClick={() => data.onSelect && data.onSelect(data.name)}
      style={{
        border: "1px solid #444",
        borderRadius: 6,
        background: "#1e1e1e",
        color: "#eee",
        minWidth: 220,
        fontFamily: "monospace",
        fontSize: 12,
        cursor: data.onSelect ? "pointer" : "default",
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
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
        }}
      >
        {data.name}
      </div>
      <div>
        {data.columns.map((col) => (
          <div
            key={col.name}
            style={{
              padding: "3px 10px",
              borderTop: "1px solid #2a2a2a",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              background: col.isPrimaryKey ? "#2a2a10" : "transparent",
            }}
          >
            <span>
              {col.isPrimaryKey ? "🔑 " : ""}
              {col.name}
            </span>
            <span style={{ color: "#888" }}>{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
