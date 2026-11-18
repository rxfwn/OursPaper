import { generateId } from '../utils/id';

export function createBlankPage(createdAt) {
  return {
    id: generateId(),
    createdAt: createdAt ?? Date.now(),
    photos: [],
    texts: [],
    stickers: [],
    strokes: [],
    background: null,
  };
}

// Same shape as a page (so the cover/spine editor can reuse PageCanvas
// as-is) but with no id/createdAt — PageCanvas only prints its little date
// stamp when createdAt is set, and a cover/spine isn't dated.
export function createDesign() {
  return {
    photos: [],
    texts: [],
    stickers: [],
    strokes: [],
    background: null,
  };
}

function hasDesignContent(design) {
  return !!design && (design.photos.length > 0 || design.texts.length > 0 || (design.stickers || []).length > 0 || design.strokes.length > 0 || !!design.background);
}

export function createNotebook({
  name,
  coverUri,
  coverTransform,
  spineUri,
  spineTransform,
  coverDesign,
  spineDesign,
  pages,
  tripDate,
}) {
  const finalPages = pages && pages.length > 0 ? pages : [createBlankPage()];
  const date = tripDate || Date.now();
  return {
    id: generateId(),
    name: (name || '').trim() || 'Sans titre',
    coverUri: coverUri || null,
    coverTransform: coverUri ? coverTransform || null : null,
    spineUri: spineUri || null,
    spineTransform: spineUri ? spineTransform || null : null,
    coverDesign: coverDesign || createDesign(),
    spineDesign: spineDesign || createDesign(),
    createdAt: Date.now(),
    date,
    sortOrder: date,
    lastPageIndex: 0,
    pages: finalPages,
  };
}

export { hasDesignContent };
