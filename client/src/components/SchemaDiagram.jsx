import React, { useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import TableNode from "./TableNode.jsx";
import { layoutGraph } from "../layout.js";

const nodeTypes = { table: TableNode };

// props: { schema: { tables, foreignKeys }, onSelectTable }
export default function SchemaDiagram({ schema, onSelectTable }) {
  const { nodes, edges } = useMemo(() => {
    const rawNodes = schema.tables.map((t) => ({
      id: t.name,
      type: "table",
      data: {
        name: t.name,
        columns: t.columns,
        onSelect: onSelectTable,
      },
      // rough height estimate so dagre spaces rows sensibly
      width: 240,
      height: 40 + t.columns.length * 22,
      position: { x: 0, y: 0 },
    }));

    const rawEdges = schema.foreignKeys.map((fk) => ({
      id: fk.name,
      source: fk.sourceTable,
      target: fk.targetTable,
      label: `${fk.sourceColumn} → ${fk.targetColumn}`,
      animated: false,
      style: { stroke: "#888" },
      labelStyle: { fill: "#aaa", fontSize: 10 },
    }));

    return {
      nodes: layoutGraph(rawNodes, rawEdges),
      edges: rawEdges,
    };
  }, [schema, onSelectTable]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      style={{ background: "#141414" }}
    >
      <Background color="#333" gap={16} />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
