import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, ControlButton, MiniMap, Panel, useNodesState } from "reactflow";
import TableNode from "./TableNode.jsx";
import { layoutGraphElk } from "../layoutElk.js";
import { selectBestHandles } from "../handleSelection.js";
import { getNeighborTables, isHubTable, getFkColumnNames } from "../schemaGraph.js";

const nodeTypes = { table: TableNode };

// Collapsed node height fed to the layout engine — nodes render collapsed
// by default (see TableNode.jsx), so giving ELK the compact size lets it
// pack the graph tighter and reduces avoidable edge crossings.
const COLLAPSED_HEIGHT = 56;
const HEADER_HEIGHT = 34;
const ROW_HEIGHT = 22;

// Global column-display cycle, driven by the extra Controls button.
const MODES = ["collapsed", "keys", "all"];
const MODE_LABELS = { collapsed: "Collapsed", keys: "Keys only", all: "All columns" };
const MODE_ICONS = { collapsed: "▢", keys: "🔑", all: "▤" };

// Manually-dragged table positions, persisted across reloads. Keyed per
// focus table so a linked-tables view's layout doesn't collide with the
// whole-DB layout or another table's linked-tables view.
function storageKeyFor(focusTable) {
  return focusTable ? `schemaDiagramPositions:${focusTable}` : "schemaDiagramPositions";
}

function loadSavedPositions(focusTable) {
  try {
    return JSON.parse(localStorage.getItem(storageKeyFor(focusTable))) ?? {};
  } catch {
    return {};
  }
}

function savePositions(focusTable, positionsByTableName) {
  try {
    localStorage.setItem(storageKeyFor(focusTable), JSON.stringify(positionsByTableName));
  } catch {
    // localStorage unavailable/full — dragging still works for this session.
  }
}

// props: { schema: { tables, foreignKeys }, onSelectTable, onShowNeighbors, focusTable }
// When focusTable is set, the diagram is scoped to just that table and its
// direct FK neighbors (structure only, no hub-table filtering) instead of
// the whole DB.
export default function SchemaDiagram({ schema, onSelectTable, onShowNeighbors, focusTable }) {
  const [hoveredTable, setHoveredTable] = useState(null);
  const [showHubTables, setShowHubTables] = useState(false);
  // Raw ELK layout result (position per node, recomputed only on structural
  // graph changes) — kept separate from the draggable `nodes` state below so
  // edge handle-side selection always uses the laid-out positions, not
  // wherever the user has since dragged a node to.
  const [layoutNodes, setLayoutNodes] = useState([]);
  // Draggable node state React Flow actually renders. Only ever replaced
  // wholesale when the graph structurally changes (new layout below); hover
  // dimming patches existing entries in place so manual drag positions
  // survive it.
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [globalModeIndex, setGlobalModeIndex] = useState(0);
  // Per-table binary override set by that table's own +/- toggle; falls
  // back to the global mode when a table has no override of its own.
  const [columnOverrides, setColumnOverrides] = useState({});

  function getMode(name) {
    return columnOverrides[name] ?? MODES[globalModeIndex];
  }

  function toggleNodeColumns(name) {
    setColumnOverrides((prev) => {
      const current = prev[name] ?? MODES[globalModeIndex];
      return { ...prev, [name]: current === "collapsed" ? "all" : "collapsed" };
    });
  }

  function cycleGlobalMode() {
    setGlobalModeIndex((i) => (i + 1) % MODES.length);
    setColumnOverrides({});
  }

  // Pure many-to-many bridge tables (mostly FK columns, little own data) —
  // hidden by default since they add edges without much information.
  const hubNames = useMemo(
    () =>
      new Set(
        schema.tables
          .filter((t) => isHubTable(t, schema.foreignKeys))
          .map((t) => t.name)
      ),
    [schema]
  );

  const neighborNames = useMemo(
    () => (focusTable ? getNeighborTables(focusTable, schema.foreignKeys) : null),
    [focusTable, schema.foreignKeys]
  );

  const { rawNodes, rawEdges } = useMemo(() => {
    const visibleTables = focusTable
      ? schema.tables.filter((t) => t.name === focusTable || neighborNames.has(t.name))
      : schema.tables.filter((t) => showHubTables || !hubNames.has(t.name));
    const visibleNames = new Set(visibleTables.map((t) => t.name));

    const nodes = visibleTables.map((t) => {
      const fkColumnNames = getFkColumnNames(t.name, schema.foreignKeys);
      const mode = getMode(t.name);
      const keyCount = t.columns.filter(
        (c) => c.isPrimaryKey || fkColumnNames.has(c.name)
      ).length;
      const rowCount =
        mode === "all" ? t.columns.length : mode === "keys" ? Math.max(keyCount, 1) : 0;
      const height = mode === "collapsed" ? COLLAPSED_HEIGHT : HEADER_HEIGHT + rowCount * ROW_HEIGHT;

      return {
        id: t.name,
        type: "table",
        data: {
          name: t.name,
          columns: t.columns,
          columnMode: mode,
          fkColumnNames,
          onSelect: onSelectTable,
          onHover: setHoveredTable,
          onToggle: toggleNodeColumns,
          onShowNeighbors,
          isFocus: focusTable ? t.name === focusTable : false,
        },
        width: 240,
        height,
        position: { x: 0, y: 0 },
      };
    });

    const edges = schema.foreignKeys
      .filter(
        (fk) => visibleNames.has(fk.sourceTable) && visibleNames.has(fk.targetTable)
      )
      .map((fk) => ({
        id: fk.name,
        source: fk.sourceTable,
        target: fk.targetTable,
        via: `${fk.sourceColumn} → ${fk.targetColumn}`,
      }));

    return { rawNodes: nodes, rawEdges: edges };
  }, [
    schema,
    onSelectTable,
    onShowNeighbors,
    focusTable,
    neighborNames,
    showHubTables,
    hubNames,
    columnOverrides,
    globalModeIndex,
  ]);

  function nodeStyleFor(id, hovered, foreignKeys) {
    if (!hovered) return undefined;
    const neighbors = getNeighborTables(hovered, foreignKeys);
    return id !== hovered && !neighbors.has(id) ? { opacity: 0.25 } : undefined;
  }

  // ELK layout is async, unlike the previous dagre call — run it as an
  // effect on structural graph changes only, and push the result straight
  // into the draggable node state. This intentionally does NOT depend on
  // hoveredTable — a hover shouldn't trigger a relayout/position reset.
  useEffect(() => {
    let cancelled = false;
    layoutGraphElk(rawNodes, rawEdges).then((result) => {
      if (cancelled) return;
      const saved = loadSavedPositions(focusTable);
      const positioned = result.map((n) => ({
        ...n,
        position: saved[n.id] ?? n.position,
      }));
      setLayoutNodes(positioned);
      setNodes(
        positioned.map((n) => ({
          ...n,
          style: nodeStyleFor(n.id, hoveredTable, schema.foreignKeys),
        }))
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes, rawEdges]);

  // Hover-driven neighbor dimming: patch style on the existing node objects
  // in place rather than rebuilding from layoutNodes, so a dragged node's
  // current position is preserved.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: nodeStyleFor(n.id, hoveredTable, schema.foreignKeys),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredTable, schema.foreignKeys]);

  const edges = useMemo(() => {
    // Guard against the brief gap between rawNodes/rawEdges changing (e.g.
    // toggling hub tables) and the async layout effect catching up.
    const currentIds = new Set(rawNodes.map((n) => n.id));
    const nodesById = new Map(
      layoutNodes.filter((n) => currentIds.has(n.id)).map((n) => [n.id, n])
    );

    return rawEdges
      .filter((e) => nodesById.has(e.source) && nodesById.has(e.target))
      .map((e) => {
        const handles = selectBestHandles(nodesById.get(e.source), nodesById.get(e.target));
        const isRelevant =
          hoveredTable && (e.source === hoveredTable || e.target === hoveredTable);

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          ...handles,
          // Labels only render for the hovered table's own edges — keeps
          // the default view free of unreadable floating label clutter.
          label: isRelevant ? e.via : undefined,
          style: { stroke: "#888", opacity: hoveredTable && !isRelevant ? 0.15 : 1 },
          labelStyle: { fill: "#aaa", fontSize: 10 },
        };
      });
  }, [layoutNodes, rawNodes, rawEdges, hoveredTable]);

  // Persist positions once a drag ends (not on every intermediate move).
  // Saves every node's current position, not just the one that was directly
  // dragged, so multi-select drags are captured in full.
  function handleNodeDragStop() {
    const positions = {};
    nodes.forEach((n) => {
      positions[n.id] = n.position;
    });
    savePositions(focusTable, positions);
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeDragStop={handleNodeDragStop}
      nodeTypes={nodeTypes}
      fitView
      style={{ background: "#141414" }}
    >
      <Background color="#333" gap={16} />
      <Controls>
        <ControlButton
          onClick={cycleGlobalMode}
          title={`Columns: ${MODE_LABELS[MODES[globalModeIndex]]} (click to cycle)`}
        >
          {MODE_ICONS[MODES[globalModeIndex]]}
        </ControlButton>
      </Controls>
      <MiniMap />
      {!focusTable && hubNames.size > 0 && (
        <Panel position="top-left">
          <button onClick={() => setShowHubTables((v) => !v)} style={toggleBtnStyle}>
            {showHubTables
              ? "Hide junction tables"
              : `Show junction tables (${hubNames.size} hidden)`}
          </button>
        </Panel>
      )}
    </ReactFlow>
  );
}

const toggleBtnStyle = {
  background: "#333",
  color: "#eee",
  border: "1px solid #555",
  borderRadius: 4,
  padding: "4px 10px",
  cursor: "pointer",
  fontFamily: "sans-serif",
  fontSize: 12,
};
