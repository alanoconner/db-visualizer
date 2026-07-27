import React from "react";
import { Handle, Position } from "reactflow";

// One source+target handle per side, so edges can connect via whichever
// side is actually nearest the other table after layout, instead of always
// wrapping through a single fixed left/right pair.
const SIDES = [
  { side: "top", position: Position.Top },
  { side: "bottom", position: Position.Bottom },
  { side: "left", position: Position.Left },
  { side: "right", position: Position.Right },
];

// data: { name, columns, columnMode, fkColumnNames, onSelect, onHover, onToggle, onShowNeighbors, isFocus }
export default function TableNode({ data }) {
  const pkColumns = data.columns.filter((c) => c.isPrimaryKey);
  const collapsed = data.columnMode === "collapsed";
  const visibleColumns =
    data.columnMode === "keys"
      ? data.columns.filter((c) => c.isPrimaryKey || data.fkColumnNames.has(c.name))
      : data.columns;

  function toggleCollapsed(e) {
    e.stopPropagation();
    data.onToggle(data.name);
  }

  function showNeighbors(e) {
    e.stopPropagation();
    data.onShowNeighbors(data.name);
  }

  return (
    <div
      onClick={() => data.onSelect && data.onSelect(data.name)}
      onMouseEnter={() => data.onHover && data.onHover(data.name)}
      onMouseLeave={() => data.onHover && data.onHover(null)}
      style={{
        border: data.isFocus ? "1px solid #5c9eff" : "1px solid #444",
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
      {SIDES.map(({ side, position }) => (
        <React.Fragment key={side}>
          <Handle type="target" id={`${side}-target`} position={position} />
          <Handle type="source" id={`${side}-source`} position={position} />
        </React.Fragment>
      ))}
      <div
        style={{
          background: "#333",
          padding: "6px 10px",
          fontWeight: "bold",
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{data.name}</span>
        <span style={{ display: "flex", gap: 4 }}>
          {data.onShowNeighbors && (
            <button onClick={showNeighbors} style={toggleBtnStyle} title="Show linked tables">
              🔗
            </button>
          )}
          <button onClick={toggleCollapsed} style={toggleBtnStyle} title={collapsed ? "Expand columns" : "Collapse columns"}>
            {collapsed ? "+" : "−"}
          </button>
        </span>
      </div>
      {collapsed ? (
        <div style={{ padding: "3px 10px", color: "#888" }}>
          {pkColumns.length > 0 ? `🔑 ${pkColumns.map((c) => c.name).join(", ")} · ` : ""}
          {data.columns.length} columns
        </div>
      ) : (
        <div>
          {visibleColumns.map((col) => (
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
      )}
    </div>
  );
}

const toggleBtnStyle = {
  background: "transparent",
  color: "#eee",
  border: "1px solid #555",
  borderRadius: 3,
  width: 18,
  height: 18,
  lineHeight: "16px",
  padding: 0,
  cursor: "pointer",
  fontSize: 12,
};
