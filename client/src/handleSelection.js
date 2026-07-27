// Given two laid-out nodes (with .position, .width, .height), picks the
// nearest-side handle pair so an edge connects via the shortest path
// instead of always routing through a fixed left/right handle.
export function selectBestHandles(sourceNode, targetNode) {
  const sourceCenter = centerOf(sourceNode);
  const targetCenter = centerOf(targetNode);

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  const sourceSide = cardinalSide(dx, dy);
  const targetSide = cardinalSide(-dx, -dy);

  return {
    sourceHandle: `${sourceSide}-source`,
    targetHandle: `${targetSide}-target`,
  };
}

function centerOf(node) {
  return {
    x: node.position.x + (node.width || 0) / 2,
    y: node.position.y + (node.height || 0) / 2,
  };
}

function cardinalSide(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}
