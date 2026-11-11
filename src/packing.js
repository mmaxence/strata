function packPanels(panels, width, height, { gap = 18, margin = 20 } = {}) {
  const nodes = panels.map((p) => ({ ...p, shrink: 1 }));
  const constrain = (n) => {
    if (n.pinned) return;
    const availableX = Math.max(0, width / 2 - margin - Math.abs(n.x)), availableY = Math.max(0, height / 2 - margin - Math.abs(n.y));
    n.shrink = Math.max(n.minShrink || 0.52, Math.min(n.shrink, availableX * 2 / n.w, availableY * 2 / n.h));
    const bx = Math.max(0, (width - n.w * n.shrink) / 2 - margin), by = Math.max(0, (height - n.h * n.shrink) / 2 - margin);
    n.x = Math.max(-bx, Math.min(bx, n.x));
    n.y = Math.max(-by, Math.min(by, n.y));
  };
  for (let step = 0; step < 18; step++) {
    const previous = nodes.map((n) => [n.x, n.y, n.shrink]);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], dx = b.x - a.x, dy = b.y - a.y;
      const ox = (a.w * a.shrink + b.w * b.shrink) / 2 + gap - Math.abs(dx), oy = (a.h * a.shrink + b.h * b.shrink) / 2 + gap - Math.abs(dy);
      if (ox <= 0 || oy <= 0 || a.pinned && b.pinned) continue;
      const axis = ox < oy ? "x" : "y", delta = (axis === "x" ? ox : oy) * ((axis === "x" ? dx : dy) < 0 ? -1 : 1);
      if (!a.pinned) a[axis] -= delta * (b.pinned ? 1 : 0.5);
      if (!b.pinned) b[axis] += delta * (a.pinned ? 1 : 0.5);
    }
    nodes.forEach(constrain);
    if (nodes.every((n, i) => Math.abs(n.x - previous[i][0]) + Math.abs(n.y - previous[i][1]) + Math.abs(n.shrink - previous[i][2]) < 1e-3)) break;
  }
  return new Map(nodes.map((n) => [n.id, n]));
}
export {
  packPanels
};
