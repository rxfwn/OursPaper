// Emoji as stickers — plain Unicode glyphs rendered by the platform/browser
// font, same as every other icon-as-emoji already used in this app, so
// there's no asset/licensing question here (unlike photos or a bundled
// emoji font, nothing is being redistributed).
export const STICKER_CATEGORIES = [
  {
    id: 'love',
    label: 'Amour',
    emojis: ['❤️', '💕', '💖', '💗', '😍', '🥰', '💋', '💑', '😘', '💘'],
  },
  {
    id: 'travel',
    label: 'Voyage',
    emojis: ['✈️', '🗺️', '🏖️', '🌍', '🚗', '🧳', '⛰️', '🚂', '🗼', '🏝️'],
  },
  {
    id: 'nature',
    label: 'Nature',
    emojis: ['🌸', '🌿', '🌞', '🌙', '⭐', '🌊', '🍃', '🌈', '🌻', '☁️'],
  },
  {
    id: 'food',
    label: 'Gourmandise',
    emojis: ['🍕', '🍰', '☕', '🍷', '🍓', '🍦', '🥐', '🍫', '🍇', '🍩'],
  },
  {
    id: 'fun',
    label: 'Fun',
    emojis: ['🎉', '✨', '🎈', '🎵', '😂', '🔥', '👏', '🎊', '🥳', '💫'],
  },
  {
    id: 'confetti',
    label: 'Paillettes',
    emojis: ['✨', '🎊', '⭐', '🌟', '💫', '🎉', '🔸', '🔹', '💠', '🟡'],
  },
];

// Washi tape — a decorative strip, not an emoji, so it's a separate list of
// flat colors/patterns rather than glyphs. Picking one places a wide,
// semi-transparent colored strip (see DraggableSticker) instead of a symbol.
export const WASHI_TAPES = [
  { id: 'coral', color: '#e08a7a', pattern: 'solid' },
  { id: 'mustard', color: '#e0b93a', pattern: 'stripe' },
  { id: 'sage', color: '#8fae8b', pattern: 'solid' },
  { id: 'sky', color: '#7fb2d9', pattern: 'dot' },
  { id: 'blush', color: '#e3a8bb', pattern: 'stripe' },
  { id: 'kraft', color: '#c8a878', pattern: 'solid' },
];
