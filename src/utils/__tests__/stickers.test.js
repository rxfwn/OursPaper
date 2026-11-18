import { stickerMaterial, nextStickerMaterial, STICKER_MATERIALS, DEFAULT_STICKER_MATERIAL } from '../../theme/stickers';

describe('sticker materials', () => {
  it('falls back to the default material for old or unknown stickers', () => {
    expect(stickerMaterial({ kind: 'emoji', emoji: '🌸' })).toBe(DEFAULT_STICKER_MATERIAL);
    expect(stickerMaterial({ material: 'chrome' })).toBe(DEFAULT_STICKER_MATERIAL);
    expect(stickerMaterial(null)).toBe(DEFAULT_STICKER_MATERIAL);
  });

  it('keeps a known material', () => {
    expect(stickerMaterial({ material: 'holo' })).toBe('holo');
  });

  it('cycles through every material and wraps around', () => {
    const seen = [];
    let id = STICKER_MATERIALS[0].id;
    for (let i = 0; i < STICKER_MATERIALS.length; i++) {
      seen.push(id);
      id = nextStickerMaterial(id);
    }
    expect(seen).toEqual(STICKER_MATERIALS.map((m) => m.id));
    expect(id).toBe(STICKER_MATERIALS[0].id);
  });
});
