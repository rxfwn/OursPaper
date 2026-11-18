import { hsvToHex, hexToHsv } from '../color';

describe('hsvToHex / hexToHsv', () => {
  it('converts known colors', () => {
    expect(hsvToHex(0, 0, 0)).toBe('#000000');
    expect(hsvToHex(0, 0, 1)).toBe('#ffffff');
    expect(hsvToHex(0, 1, 1)).toBe('#ff0000');
  });

  it('round-trips hex through hsv', () => {
    const hex = '#3fae7a';
    const { h, s, v } = hexToHsv(hex);
    expect(hsvToHex(h, s, v)).toBe(hex);
  });

  it('handles 3-digit hex shorthand', () => {
    const { h, s, v } = hexToHsv('#fff');
    expect(hsvToHex(h, s, v)).toBe('#ffffff');
  });
});
