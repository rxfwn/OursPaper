function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function strokeNearPoint(points, x, y, radius) {
  if (!points || points.length === 0) return false;
  if (points.length === 1) {
    return Math.hypot(points[0].x - x, points[0].y - y) <= radius;
  }
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (distanceToSegment(x, y, a.x, a.y, b.x, b.y) <= radius) return true;
  }
  return false;
}
