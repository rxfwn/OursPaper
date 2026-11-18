import { hashSeed } from '../utils/tornPath';

// Single source of truth for the shelf book's real on-screen proportions —
// the cover/spine editor renders its workspace at these exact sizes so what
// you design is what actually shows up on the shelf, no separate preview
// scale to translate between.
export const MIN_SPINE = 68;
export const MAX_SPINE = 139;
export const SPINE_HEIGHT = 383;
export const REVEAL_WIDTH = 257;
export const MAX_DAYS = 60;

// The front cover's left edge is the "open" edge of the book (the spine's
// on the right, under the elastic band) — a smaller radius there reads more
// like a real cover corner instead of a generically rounded card. Shared
// with the cover/spine editor's own preview tiles so they read as the same
// object as what's on the shelf, not a mismatched rounder/squarer stand-in.
export const COVER_LEFT_CORNER_RADIUS = 6;
export const COVER_RIGHT_CORNER_RADIUS = 20;
export const SPINE_CORNER_RADIUS = 2;

// The fallback color shown when a notebook has no real cover design yet —
// deterministic per notebook id, shared by the shelf (LibraryScreen) and
// the 3D closed-book preview (BookScene3D) so a notebook reads as the same
// object in both places instead of two different random-looking colors.
export const SPINE_PALETTE = ['#4a3f8f', '#8f4f4a', '#3f7a6e', '#8f6f3f', '#5a4f8f', '#3f5a8f', '#6a2030', '#2a4230'];

export function spineColorFor(id) {
  const idx = Math.abs(hashSeed(id)) % SPINE_PALETTE.length;
  return SPINE_PALETTE[idx];
}

export function spineWidthFor(pageCount, minPages, maxPages) {
  if (maxPages === minPages) return Math.round((MIN_SPINE + MAX_SPINE) / 2);
  const ratio = (pageCount - minPages) / (maxPages - minPages);
  const width = MIN_SPINE + ratio * (MAX_SPINE - MIN_SPINE);
  return Math.round(Math.max(MIN_SPINE, Math.min(MAX_SPINE, width)));
}
