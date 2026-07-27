import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

// Lays out nodes using ELK's layered algorithm (real crossing minimization,
// unlike dagre) for the whole-DB schema view. Async — call from an effect,
// not a render-time useMemo.
export async function layoutGraphElk(nodes, edges, direction = "LR") {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction === "LR" ? "RIGHT" : "DOWN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width || 260,
      height: n.height || 160,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const result = await elk.layout(graph);
  const byId = new Map(result.children.map((c) => [c.id, c]));

  return nodes.map((n) => {
    const pos = byId.get(n.id);
    return { ...n, position: { x: pos.x, y: pos.y } };
  });
}
