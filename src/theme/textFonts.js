import { Platform } from 'react-native';

// Generic cross-platform family stacks only — no embedded font files, so
// these are safe on native and web alike without adding assets.
export const TEXT_FONTS = [
  { id: 'system', label: 'Aa', fontFamily: undefined },
  { id: 'serif', label: 'Aa', fontFamily: Platform.select({ web: 'Georgia, serif', default: 'serif' }) },
  { id: 'mono', label: 'Aa', fontFamily: Platform.select({ web: "'Courier New', monospace", default: 'monospace' }) },
  {
    id: 'rounded',
    label: 'Aa',
    fontFamily: Platform.select({
      web: "'Trebuchet MS', sans-serif",
      ios: 'Avenir Next',
      android: 'sans-serif-condensed',
      default: 'sans-serif',
    }),
  },
];

export const TEXT_SIZES = [14, 20, 28, 40];
export const DEFAULT_TEXT_SIZE = 20;
export const HIGHLIGHT_COLOR = '#fff176';
