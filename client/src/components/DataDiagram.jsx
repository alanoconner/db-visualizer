import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from "reactflow";
import LinkedTableNode from "./LinkedTableNode.jsx";
import { layoutGraph } from "../layout.js";
import { fetchLinked } from "../api.js";

const nodeTypes = { linked: LinkedTableNode };

// props: { schema, rootTable, rootRow, onDrillInto }
export default function DataDiagram({ schema, rootTable, rootRow, onDrillInto }) {
  const [linked, setLinked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pkColumn = useMemo(() => {
    const table = schema.tables.find((t) => t.name === rootTable);
    const pk = table?.columns.find((c) => c.isPrimaryKey);
    return pk?.name || Object.keys(rootRow)[0];
  }, [schema, rootTable, rootRow]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLinked(rootTable, pkColumn, rootRow[pkColumn], schema.foreignKeys)
      .then((data) => {
        if (!cancelled) setLinked(data.linked);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [rootTable, pkColumn, rootRow, schema.foreignKeys]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Only (re)lay out the graph when a genuinely new root row's linked data
  // arrives — not on every render — so manual drags/resizes aren't wiped out
  // by an unrelated parent re-render (e.g. onDrillInto's identity changing).
  useEffect(() => {
    const rootNode = {
      id: `${rootTable}:root`,
      type: "linked",
      width: 340,
      height: 220,
      position: { x: 0, y: 0 },
      data: {
        table: rootTable,
        direction: "root",
        rows: [rootRow],
        onDrillInto,
      },
    };

    const linkedNodes = linked.map((l, i) => ({
      id: `${l.table}:${i}`,
      type: "linked",
      width: 340,
      height: 220,
      position: { x: 0, y: 0 },
      data: { ...l, onDrillInto },
    }));

    const linkedEdges = linked.map((l, i) => ({
      id: `edge-${i}`,
      source: l.direction === "references" ? rootNode.id : `${l.table}:${i}`,
      target: l.direction === "references" ? `${l.table}:${i}` : rootNode.id,
      label: l.via,
      style: { stroke: "#888" },
      labelStyle: { fill: "#aaa", fontSize: 10 },
    }));

    const allNodes = [rootNode, ...linkedNodes];
    setNodes(layoutGraph(allNodes, linkedEdges));
    setEdges(linkedEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {loading && (
        <div style={{ position: "absolute", top: 8, left: 8, color: "#aaa", zIndex: 10 }}>
          loading linked data…
        </div>
      )}
      {error && (
        <div style={{ position: "absolute", top: 8, left: 8, color: "#e66", zIndex: 10 }}>
          {error}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: "#141414" }}
      >
        <Background color="#333" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
