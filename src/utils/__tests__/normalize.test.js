import { normalizePoints, denormalizePoints } from '../normalize';

describe('normalizePoints / denormalizePoints', () => {
  it('round-trips pixel points through fractions', () => {
    const width = 400;
    const height = 200;
    const points = [
      { x: 0, y: 0 },
      { x: 200, y: 100 },
      { x: 400, y: 200 },
    ];

    const normalized = normalizePoints(points, width, height);
    expect(normalized).toEqual([
      { xFrac: 0, yFrac: 0 },
      { xFrac: 0.5, yFrac: 0.5 },
      { xFrac: 1, yFrac: 1 },
    ]);

    const denormalized = denormalizePoints(normalized, width, height);
    expect(denormalized).toEqual(points);
  });

  it('produces the same pixel position at a different pageSize', () => {
    const points = [{ x: 150, y: 75 }];
    const normalized = normalizePoints(points, 300, 150); // center point, 0.5/0.5
    const atDoubleSize = denormalizePoints(normalized, 600, 300);
    expect(atDoubleSize).toEqual([{ x: 300, y: 150 }]);
  });

  it('falls back to legacy plain x/y when a point has no xFrac', () => {
    const legacyPoints = [{ x: 42, y: 17 }];
    expect(denormalizePoints(legacyPoints, 400, 200)).toEqual([{ x: 42, y: 17 }]);
  });

  it('returns an empty array for missing input', () => {
    expect(denormalizePoints(null, 100, 100)).toEqual([]);
    expect(normalizePoints(null, 100, 100)).toEqual([]);
    expect(normalizePoints([{ x: 1, y: 1 }], 0, 0)).toEqual([]);
  });
});
