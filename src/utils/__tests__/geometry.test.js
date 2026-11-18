import { strokeNearPoint } from '../geometry';

describe('strokeNearPoint', () => {
  const horizontalLine = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it('detects a point directly on the line', () => {
    expect(strokeNearPoint(horizontalLine, 50, 0, 5)).toBe(true);
  });

  it('detects a point within the radius of the line', () => {
    expect(strokeNearPoint(horizontalLine, 50, 4, 5)).toBe(true);
  });

  it('rejects a point outside the radius', () => {
    expect(strokeNearPoint(horizontalLine, 50, 20, 5)).toBe(false);
  });

  it('does not wrap around past the segment endpoints', () => {
    // Close to where the line WOULD continue, but past its actual end.
    expect(strokeNearPoint(horizontalLine, 120, 0, 5)).toBe(false);
  });

  it('handles a single-point stroke as a circle check', () => {
    const dot = [{ x: 10, y: 10 }];
    expect(strokeNearPoint(dot, 12, 12, 5)).toBe(true);
    expect(strokeNearPoint(dot, 30, 30, 5)).toBe(false);
  });

  it('returns false for empty or missing strokes', () => {
    expect(strokeNearPoint([], 0, 0, 5)).toBe(false);
    expect(strokeNearPoint(null, 0, 0, 5)).toBe(false);
  });
});
