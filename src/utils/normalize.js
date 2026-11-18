// Photos/texts/strokes are stored as fractions of the page size (0..1) rather
// than raw pixels, so the same content lands in the same relative spot on the
// page no matter what pixel size the canvas renders at on a given device —
// phone and desktop viewports compute very different pageSize values.
export function denormalizePoints(points, width, height) {
  if (!points) return [];
  // Strokes saved before fraction-based coordinates existed still have plain
  // x/y — keep showing them as-is rather than producing NaN/garbage.
  return points.map((p) =>
    p.xFrac === undefined ? { x: p.x, y: p.y } : { x: p.xFrac * width, y: p.yFrac * height }
  );
}

export function normalizePoints(points, width, height) {
  if (!points || !width || !height) return [];
  return points.map((p) => ({ xFrac: p.x / width, yFrac: p.y / height }));
}
