import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, PanResponder } from 'react-native';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { toCanvas } from 'html-to-image';
import PageCanvas from './PageCanvas';
import { spineColorFor } from '../theme/notebookDimensions';

// Direct port of a reference implementation the user built and approved
// separately (plain three.js) — same geometry, same open/close and page
// -curl mechanics, adapted to react-three-fiber and wired to this app's
// real page data/editor instead of the reference's baked-in text/2D
// editor. Ported as one imperative THREE scene graph (built once, mutated
// via refs) rather than idiomatic declarative R3F, because that's what
// lets the port stay faithful to the approved original instead of
// reinventing its geometry from a description.
const PAGE_ASPECT = 0.72;
const VALLEY = 0.28; // opening angle of the "V" when the book is open
const PAGE_THICK = 0.09;
const SEG = 10; // horizontal segments per page — needed for the curl bend
const CORNER = 9; // corner radius, in px on a 256px alpha-mask canvas
const OPEN_DUR = 650;
const FLIP_DUR = 520;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function makeRoundMask() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const x = c.getContext('2d');
  const r = CORNER;
  x.fillStyle = '#fff';
  x.beginPath();
  x.moveTo(r, 0);
  x.arcTo(s, 0, s, s, r);
  x.arcTo(s, s, 0, s, r);
  x.arcTo(0, s, 0, 0, r);
  x.arcTo(0, 0, s, 0, r);
  x.closePath();
  x.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}

function makeCoverTexture(title, color) {
  const W = 512;
  const H = Math.round(W / PAGE_ASPECT);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,0.92)';
  x.font = '700 34px system-ui, -apple-system, "Segoe UI", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const label = (title || 'Sans titre').length > 20 ? `${title.slice(0, 19)}…` : title || 'Sans titre';
  x.fillText(label, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Builds the whole book as a plain THREE.Group (cover, spine, pages,
// shadow) and returns it together with an imperative API — mirrors the
// reference's global functions (makeCoverPanel, makeLeaf, bendLeaf,
// beginFlip/setFlipProgress/endFlip, animateOpenClose) as closures over
// that one group instead of module-level globals.
function buildBook({ width, height, color, title, pages, getActiveIndex, onSettleIndex }) {
  const PW = width;
  const PH = height;
  const COVER_W = PW + 0.16;
  const COVER_H = PH / 2 + 0.16;
  const cornerMask = makeRoundMask();

  const book = new THREE.Group();
  book.rotation.x = -0.22;

  function makeCoverPanel(dir, mat) {
    const w = COVER_W;
    const h = COVER_H;
    const r = 0.08;
    const s = new THREE.Shape();
    const X = (v) => v * dir;
    s.moveTo(X(r), -h);
    s.lineTo(X(w - r), -h);
    s.quadraticCurveTo(X(w), -h, X(w), -h + r);
    s.lineTo(X(w), h - r);
    s.quadraticCurveTo(X(w), h, X(w - r), h);
    s.lineTo(X(r), h);
    s.quadraticCurveTo(X(0), h, X(0), h - r);
    s.lineTo(X(0), -h + r);
    s.quadraticCurveTo(X(0), -h, X(r), -h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false, curveSegments: 6 });
    const mesh = new THREE.Mesh(g, mat);
    const pivot = new THREE.Group();
    pivot.add(mesh);
    return { pivot, mesh };
  }

  const coverMatColor = new THREE.MeshBasicMaterial({ color });
  const backLeft = makeCoverPanel(-1, coverMatColor);
  backLeft.pivot.rotation.y = -VALLEY;
  backLeft.mesh.position.z = -0.14;
  const backRight = makeCoverPanel(1, coverMatColor);
  backRight.pivot.rotation.y = VALLEY;
  backRight.mesh.position.z = -0.14;
  book.add(backLeft.pivot, backRight.pivot);
  backLeft.pivot.visible = false;
  backRight.pivot.visible = false;

  const frontCoverTex = makeCoverTexture(title, color);
  const frontCoverMat = new THREE.MeshBasicMaterial({ map: frontCoverTex });
  const frontCover = makeCoverPanel(1, frontCoverMat);
  frontCover.mesh.position.z = 0.02;
  book.add(frontCover.pivot);
  const frontBackMat = new THREE.MeshBasicMaterial({ color });
  const frontBack = makeCoverPanel(1, frontBackMat);
  frontBack.mesh.position.z = -0.03;
  frontCover.pivot.add(frontBack.mesh);

  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, COVER_H * 2, 0.26),
    new THREE.MeshBasicMaterial({ color: shade(color, -55) })
  );
  spine.position.set(0, 0, -0.09);
  book.add(spine);

  const shadowTex = (() => {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const x = c.getContext('2d');
    const grad = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(PW * 2.3, PW * 1.1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.45, depthWrite: false })
  );
  shadow.rotation.x = -0.3;
  shadow.position.set(0.05, -PH / 2 - 0.1, 0.35);
  book.add(shadow);

  // A page — real subdivided geometry (not a flat quad) so it can bend
  // into a curl mid-flip, front (recto) + back (verso) so it never shows
  // as a paper-thin cutout from the side. `texture`, when given, is a
  // snapshot of the real page content (strokes/photos/text) — falls back
  // to a flat tone until that snapshot lands.
  function makeLeaf(dir, tone, texture) {
    const grp = new THREE.Group();
    const gF = new THREE.PlaneGeometry(PW, PH, SEG, 1);
    const pf = gF.attributes.position;
    for (let i = 0; i < pf.count; i++) pf.setX(i, (pf.getX(i) + PW / 2) * dir);
    pf.needsUpdate = true;
    gF.userData.base = gF.attributes.position.array.slice();
    // Mirroring vertex X (dir<0, for left-hand pages) flips triangle
    // winding, so FrontSide/BackSide need swapping to compensate — without
    // this, a left page's textured recto gets backface-culled and the
    // flat, texture-less verso shows through in its place instead.
    const matF = new THREE.MeshBasicMaterial({
      color: texture ? '#ffffff' : tone,
      map: texture || null,
      alphaMap: cornerMask,
      transparent: true,
      alphaTest: 0.5,
      side: dir > 0 ? THREE.FrontSide : THREE.BackSide,
    });
    const recto = new THREE.Mesh(gF, matF);
    recto.position.z = PAGE_THICK / 2;

    const gB = new THREE.PlaneGeometry(PW, PH, SEG, 1);
    const pb = gB.attributes.position;
    for (let i = 0; i < pb.count; i++) pb.setX(i, (pb.getX(i) + PW / 2) * dir);
    pb.needsUpdate = true;
    gB.userData.base = gB.attributes.position.array.slice();
    const matB = new THREE.MeshBasicMaterial({
      color: shade(tone, -18),
      alphaMap: cornerMask,
      transparent: true,
      alphaTest: 0.5,
      side: dir > 0 ? THREE.BackSide : THREE.FrontSide,
    });
    const verso = new THREE.Mesh(gB, matB);
    verso.position.z = -PAGE_THICK / 2;

    grp.add(recto, verso);
    const pivot = new THREE.Group();
    pivot.add(grp);
    pivot.rotation.y = dir > 0 ? VALLEY : -VALLEY;
    return { pivot, recto, verso, dir };
  }

  function bendLeaf(leaf, amount) {
    [leaf.recto, leaf.verso].forEach((mesh) => {
      const g = mesh.geometry;
      const base = g.userData.base;
      const pos = g.attributes.position.array;
      for (let v = 0; v < pos.length; v += 3) {
        const bx = base[v];
        const by = base[v + 1];
        const u = Math.abs(bx) / PW;
        pos[v] = bx;
        pos[v + 1] = by;
        pos[v + 2] = Math.sin(u * Math.PI) * amount;
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  // Real page content (strokes/photos/text), captured as a DOM snapshot by
  // the React layer and handed in via setPageTexture — keyed by page id so
  // it survives showSpread()/beginFlip() rebuilding the leaf meshes.
  const textures = new Map();

  // Current spread — left = activeIndex-1 (if it exists), right =
  // activeIndex. A real book's very first page has no left neighbour (it's
  // inside the front cover), so leftIndex can legitimately be absent.
  let cur = { left: null, right: null };
  function clearSpread() {
    ['left', 'right'].forEach((k) => {
      if (cur[k]) {
        book.remove(cur[k].pivot);
        cur[k] = null;
      }
    });
  }
  function showSpread() {
    clearSpread();
    const ri = getActiveIndex();
    const li = ri - 1;
    if (li >= 0 && li < pages.length) {
      const pageId = pages[li].id;
      cur.left = makeLeaf(-1, '#f1ebda', textures.get(pageId));
      cur.left.pageId = pageId;
      book.add(cur.left.pivot);
    }
    if (ri >= 0 && ri < pages.length) {
      const pageId = pages[ri].id;
      cur.right = makeLeaf(1, '#f8f4ea', textures.get(pageId));
      cur.right.pageId = pageId;
      book.add(cur.right.pivot);
    }
  }

  function setPageTexture(pageId, texture) {
    const old = textures.get(pageId);
    if (old && old !== texture) old.dispose();
    textures.set(pageId, texture);
    [cur.left, cur.right].forEach((leaf) => {
      if (leaf && leaf.pageId === pageId) {
        leaf.recto.material.map = texture;
        leaf.recto.material.color.set('#ffffff');
        leaf.recto.material.needsUpdate = true;
      }
    });
  }

  // Open/close — the front cover pivots from flat-closed (0) to fully
  // rabattue à gauche (-π), while the book re-centers (it's off-center
  // when closed, since only the right-hand cover panel exists then).
  const BOOK_X_CLOSED = -PW / 2;
  const BOOK_X_OPEN = 0;
  // Starts already open — the closed-cover step only exists as something
  // you can close back into (tap background) and reopen (tap cover), not
  // as a mandatory first beat when the notebook screen appears.
  let isOpen = true;
  let opening = false;
  frontCover.pivot.rotation.y = -Math.PI;
  frontCover.pivot.visible = false;
  backLeft.pivot.visible = true;
  backRight.pivot.visible = true;
  spine.visible = false;
  book.position.x = BOOK_X_OPEN;
  showSpread();

  function animateOpenClose(toOpen, done) {
    if (opening) return;
    opening = true;
    const fromY = frontCover.pivot.rotation.y;
    const toY = toOpen ? -Math.PI : 0;
    const fromX = book.position.x;
    const toX = toOpen ? BOOK_X_OPEN : BOOK_X_CLOSED;
    if (toOpen) {
      isOpen = true;
      showSpread();
    }
    backRight.pivot.visible = toOpen;
    frontCover.pivot.visible = true;
    const t0 = performance.now();
    (function step() {
      const t = Math.min(1, (performance.now() - t0) / OPEN_DUR);
      const e = easeInOutQuad(t);
      frontCover.pivot.rotation.y = fromY + (toY - fromY) * e;
      book.position.x = fromX + (toX - fromX) * e;
      spine.visible = !toOpen ? true : t < 0.3;
      backLeft.pivot.visible = toOpen && t > 0.85;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        opening = false;
        if (toOpen) {
          frontCover.pivot.visible = false;
          backLeft.pivot.visible = true;
        } else {
          isOpen = false;
          clearSpread();
          backRight.pivot.visible = false;
          backLeft.pivot.visible = false;
          frontCover.pivot.visible = true;
        }
        done && done();
      }
    })();
  }

  // Page flip — the leaf that's turning is a THIRD, temporary mesh (not
  // the static left/right ones), pivoted at the spine and bent mid-turn;
  // the static spread underneath is what's left showing once it settles.
  let flip = null;
  function canFlip(dir) {
    const ri = getActiveIndex();
    if (dir > 0) return ri < pages.length - 1;
    return ri - 1 >= 0;
  }
  function beginFlip(dir) {
    if (!canFlip(dir)) return false;
    const ri = getActiveIndex();
    // Deliberately NOT removed: the static cur.left/cur.right stay put and
    // are what shows through as "the next page underneath" while the
    // temporary leaf lifts and turns over them — removing it left nothing
    // but bare background behind the turning page.
    const tone = dir > 0 ? '#f8f4ea' : '#f1ebda';
    const turningPageIdx = dir > 0 ? ri : ri - 1;
    const leaf = makeLeaf(dir, tone, textures.get(pages[turningPageIdx]?.id));
    // Nudged slightly toward the camera so it never z-fights the static
    // page directly beneath it (they start out exactly coincident).
    leaf.pivot.position.z = 0.03;
    book.add(leaf.pivot);
    const startY = dir > 0 ? VALLEY : -VALLEY;
    const endY = dir > 0 ? VALLEY - Math.PI : Math.PI - VALLEY;
    flip = { leaf, dir, startY, endY, prog: 0, ri };
    return true;
  }
  function setFlipProgress(p) {
    if (!flip) return;
    p = Math.max(0, Math.min(1, p));
    flip.prog = p;
    flip.leaf.pivot.rotation.y = flip.startY + p * (flip.endY - flip.startY);
    bendLeaf(flip.leaf, Math.sin(p * Math.PI) * 0.3);
  }
  function endFlip(commit) {
    if (!flip) return;
    const target = commit ? 1 : 0;
    const from = flip.prog;
    const t0 = performance.now();
    const dir = flip.dir;
    const DUR = 240;
    (function step() {
      const t = Math.min(1, (performance.now() - t0) / DUR);
      const e = easeOutCubic(t);
      setFlipProgress(from + (target - from) * e);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        book.remove(flip.leaf.pivot);
        flip = null;
        if (commit) onSettleIndex(dir);
        showSpread();
      }
    })();
  }

  return {
    group: book,
    frontCoverMesh: frontCover.mesh,
    getPageMeshes: () => [cur.left?.recto, cur.right?.recto].filter(Boolean),
    isOpen: () => isOpen,
    isOpening: () => opening,
    isFlipping: () => !!flip,
    openBook: (done) => !isOpen && !opening && animateOpenClose(true, done),
    closeBook: (done) => isOpen && !opening && !flip && animateOpenClose(false, done),
    beginFlip,
    setFlipProgress,
    endFlip,
    showSpread,
    setPageTexture,
    dispose: () => {
      cornerMask.dispose();
      frontCoverTex.dispose();
      shadowTex.dispose();
      textures.forEach((t) => t.dispose());
    },
  };
}

// Bridges the imperative THREE scene (built once inside the Canvas) out to
// the RN PanResponder layer above it, which can't reach into R3F's
// internals directly — mounts the book, keeps its color/title in sync, and
// hands the built API up via `apiRef`.
function BookGroup({ apiRef, width, height, color, title, pages, activeIndexRef, onSettleIndex }) {
  const { scene, camera, gl } = useThree();
  const bookRef = useRef(null);

  useEffect(() => {
    const book = buildBook({
      width,
      height,
      color,
      title,
      pages,
      getActiveIndex: () => activeIndexRef.current,
      onSettleIndex,
    });
    scene.add(book.group);
    bookRef.current = book;
    apiRef.current = { ...book, camera, canvas: gl.domElement };
    return () => {
      scene.remove(book.group);
      book.dispose();
      apiRef.current = null;
    };
    // Rebuilding on every pages-array identity change would drop mid-flip
    // state; this only needs to happen once per mount (color/title changes
    // are rare enough — same tradeoff the rest of this component makes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function CameraRig({ apiRef, flattenProgress, width, height }) {
  // Starts at 1 (fully "open" framing) since the book itself now starts
  // already open — avoids a spurious zoom-out from the closed framing on
  // first mount.
  const openness = useRef(1);
  useFrame(({ camera, size }) => {
    const api = apiRef.current;
    const targetOpen = api?.isOpen() || api?.isOpening() ? 1 : 0;
    openness.current += (targetOpen - openness.current) * 0.12;
    const f = flattenProgress.current;
    const aspect = size.width / Math.max(1, size.height);
    const fovRad = (32 * Math.PI) / 180;
    const closedDist = fitDistance(width * 0.62, height / 2, fovRad, aspect) * 1.35;
    const openDist = fitDistance(width * 1.15, height / 2, fovRad, aspect) * 1.18;
    const flatDist = fitDistance(width * 0.55, height / 2, fovRad, aspect) * 1.05;
    const baseDist = closedDist + (openDist - closedDist) * openness.current;
    const z = baseDist + (flatDist - baseDist) * f;
    const y = -0.15 * f;
    camera.position.set(0, y, z);
    camera.fov = 32;
    camera.lookAt(0, -0.08 * f, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}

// How far back the camera needs to sit, at a given vertical fov and
// viewport aspect ratio, for a box of half-width/half-height to fit
// entirely in frame — without this, a fixed distance tuned on a wide
// desktop window clips badly on a narrow phone viewport (fov is vertical,
// so the horizontal field of view shrinks with a narrower aspect).
function fitDistance(halfW, halfH, fovRad, aspect) {
  const distV = halfH / Math.tan(fovRad / 2);
  const hFov = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
  const distH = halfW / Math.tan(hFov / 2);
  return Math.max(distV, distH);
}

// A simple 3D book: closed cover you tap to open, a real two-page spread
// once open, and pages you drag to turn — actual geometry bending around
// the spine as it turns, not the whole book rocking as one rigid slab.
// Tapping a page (rather than dragging it) zooms in and flattens it into
// the real editable page (PageCanvas + the normal Toolbar, rendered by the
// parent while `focused` is true). Tapping empty space closes the book
// back to its cover; "Retour" reverses the flatten zoom.
export default function BookScene3D({
  notebookId,
  notebookName,
  pages,
  activeIndex,
  pageSize,
  drawing,
  drawColor,
  drawTool,
  erasing,
  strokeWidth,
  strokeOpacity,
  eraseRadius,
  onColorUsed,
  recentColors,
  onUpdatePage,
  onChangeIndex,
  focused,
  onEnter,
  onExit,
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showOverlay, setShowOverlay] = useState(false);
  const [, forceRender] = useState(0);
  const apiRef = useRef(null);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const flattenProgressRef = useRef(0);
  const flattenRafRef = useRef(null);
  const overlayTimerRef = useRef(null);
  const dragStateRef = useRef({ active: false, startX: 0, moved: false });

  const color = useMemo(() => spineColorFor(notebookId), [notebookId]);
  const worldHeight = 2.1;
  const worldWidth = worldHeight * PAGE_ASPECT;

  const animateFlatten = (target, duration = 380) => {
    const from = flattenProgressRef.current;
    const start = performance.now();
    if (flattenRafRef.current) cancelAnimationFrame(flattenRafRef.current);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      flattenProgressRef.current = from + (target - from) * easeOutCubic(t);
      if (t < 1) flattenRafRef.current = requestAnimationFrame(tick);
      else flattenProgressRef.current = target;
    };
    flattenRafRef.current = requestAnimationFrame(tick);
  };

  // Snapshots of the real page content (strokes/photos/text), captured off
  // -screen via html-to-image and handed to the 3D leaves as textures — the
  // book itself only ever draws flat tone/color, it has no idea what a page
  // actually contains.
  const [captureTarget, setCaptureTarget] = useState(null);
  const captureQueueRef = useRef([]);
  const captureBusyRef = useRef(false);
  const capturedIdsRef = useRef(new Set());
  const captureHostRef = useRef(null);

  const runNextCapture = () => {
    if (captureBusyRef.current) return;
    const next = captureQueueRef.current.shift();
    if (!next) return;
    captureBusyRef.current = true;
    setCaptureTarget(next);
  };

  const enqueueCapture = (page, { force = false } = {}) => {
    if (!page || !pageSize.width) return;
    if (!force && capturedIdsRef.current.has(page.id)) return;
    if (captureTarget?.id === page.id || captureQueueRef.current.some((p) => p.id === page.id)) return;
    captureQueueRef.current.push(page);
    runNextCapture();
  };

  useEffect(() => {
    if (!captureTarget) return undefined;
    let cancelled = false;
    (async () => {
      // Two rAFs: one for the hidden host to mount/layout, one for the
      // browser to actually paint it before we snapshot.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;
      try {
        const canvas = await toCanvas(captureHostRef.current, {
          pixelRatio: 1,
          width: pageSize.width,
          height: pageSize.height,
          backgroundColor: '#f8f4ea',
        });
        if (!cancelled) {
          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          apiRef.current?.setPageTexture(captureTarget.id, texture);
          capturedIdsRef.current.add(captureTarget.id);
        }
      } catch (e) {
        // Falls back to the flat tone already showing — not worth surfacing.
      } finally {
        if (!cancelled) {
          captureBusyRef.current = false;
          setCaptureTarget(null);
          runNextCapture();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureTarget]);

  // Whichever pages are currently on the spread get a real snapshot (once)
  // so turning to a never-visited page still shows its actual content.
  useEffect(() => {
    if (!pageSize.width) return;
    enqueueCapture(pages[activeIndex - 1]);
    enqueueCapture(pages[activeIndex]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, pageSize.width]);

  useEffect(() => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (focused) {
      animateFlatten(1);
      overlayTimerRef.current = setTimeout(() => setShowOverlay(true), 220);
    } else {
      setShowOverlay(false);
      overlayTimerRef.current = setTimeout(() => {
        animateFlatten(0);
        // Force — content may have just changed while editing, so the
        // cached snapshot (if any) is now stale.
        enqueueCapture(pages[activeIndex], { force: true });
      }, 160);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  useEffect(
    () => () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (flattenRafRef.current) cancelAnimationFrame(flattenRafRef.current);
    },
    []
  );

  // Advancing the index only once a flip actually settles (not the moment
  // it's dragged past the threshold) keeps `activeIndex` — and therefore
  // the flat-edit overlay it feeds — in sync with what's really on top.
  const handleSettleIndex = (dir) => {
    // Mutate the ref synchronously — showSpread() reads it immediately
    // after this call returns, but onChangeIndex only updates the real
    // `activeIndex` prop on the NEXT render (React state is async), so
    // without this the spread rebuilds against the page that just left.
    activeIndexRef.current += dir;
    onChangeIndex(activeIndexRef.current);
    forceRender((n) => n + 1);
  };

  const raycast = (clientX, clientY, objects) => {
    const api = apiRef.current;
    if (!api || !objects.length) return [];
    const rect = api.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, api.camera);
    return ray.intersectObjects(objects, true);
  };

  // The book always starts open and stays that way — the closed-cover
  // state exists only as build machinery, never as something the user is
  // meant to see, so tapping the background is a no-op rather than closing
  // back into it.
  const handleTap = (clientX, clientY) => {
    const api = apiRef.current;
    if (!api || api.isOpening() || api.isFlipping() || !api.isOpen()) return;
    const hit = raycast(clientX, clientY, api.getPageMeshes());
    if (hit.length) onEnter();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          dragStateRef.current = { active: true, startX: pageX, startY: pageY, moved: false, dir: 0 };
        },
        onPanResponderMove: (evt, g) => {
          const api = apiRef.current;
          if (!api || !api.isOpen() || api.isOpening()) return;
          if (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4) dragStateRef.current.moved = true;
          const w = pageSize.width || 300;
          if (dragStateRef.current.dir === 0 && Math.abs(g.dx) > 6) {
            const dir = g.dx < 0 ? 1 : -1;
            if (api.beginFlip(dir)) dragStateRef.current.dir = dir;
            else dragStateRef.current.dir = null;
          }
          const dir = dragStateRef.current.dir;
          if (dir) {
            const span = w * 0.85;
            const prog = dir > 0 ? -g.dx / span : g.dx / span;
            api.setFlipProgress(prog);
          }
        },
        onPanResponderRelease: (evt, g) => {
          const api = apiRef.current;
          const { active, moved, startX, startY, dir } = dragStateRef.current;
          if (!active) return;
          if (!api) return;
          if (!moved) {
            const { pageX, pageY } = evt.nativeEvent;
            handleTap(pageX ?? startX, pageY ?? startY);
            return;
          }
          if (dir) {
            const w = pageSize.width || 300;
            const span = w * 0.85;
            const prog = dir > 0 ? -g.dx / span : g.dx / span;
            api.endFlip(prog > 0.45);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageSize.width]
  );

  const currentPage = pages[activeIndex];

  return (
    <View style={styles.fill} onLayout={(e) => setContainerSize(e.nativeEvent.layout)}>
      {containerSize.width > 0 && (
        <>
          <View style={StyleSheet.absoluteFill} pointerEvents={showOverlay ? 'none' : 'auto'} {...panResponder.panHandlers}>
            <Canvas camera={{ fov: 32, position: [0, 0, 8] }}>
              <BookGroup
                apiRef={apiRef}
                width={worldWidth}
                height={worldHeight}
                color={color}
                title={notebookName}
                pages={pages}
                activeIndexRef={activeIndexRef}
                onSettleIndex={handleSettleIndex}
              />
              <CameraRig apiRef={apiRef} flattenProgress={flattenProgressRef} width={worldWidth} height={worldHeight} />
            </Canvas>
          </View>
          <View
            style={[styles.overlay, { opacity: showOverlay ? 1 : 0 }]}
            pointerEvents={showOverlay ? 'auto' : 'none'}
          >
            {showOverlay && currentPage && pageSize.width > 0 && (
              <View style={[styles.flatPageFrame, { width: pageSize.width, height: pageSize.height }]}>
                <PageCanvas
                  page={currentPage}
                  pageSize={pageSize}
                  drawing={drawing}
                  drawColor={drawColor}
                  drawTool={drawTool}
                  erasing={erasing}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  eraseRadius={eraseRadius}
                  onColorUsed={onColorUsed}
                  recentColors={recentColors}
                  onUpdatePage={(fn) => onUpdatePage(activeIndex, fn)}
                  interactive
                />
              </View>
            )}
            <Pressable style={styles.backButton} onPress={onExit} hitSlop={10}>
              <Text style={styles.backText}>← Retour</Text>
            </Pressable>
          </View>
          {captureTarget && pageSize.width > 0 && (
            <View style={styles.captureHostWrap} pointerEvents="none">
              <View ref={captureHostRef} style={{ width: pageSize.width, height: pageSize.height, backgroundColor: '#f8f4ea' }}>
                <PageCanvas page={captureTarget} pageSize={pageSize} interactive={false} />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // alignSelf:'stretch' matters here: the parent (NotebookScreen's bookArea)
  // centers its children (alignItems:'center'), which in a column flex
  // container means a plain flex:1 child shrinks to its own content width
  // instead of filling the parent — and since this component's content is
  // itself gated on measuring a non-zero width first, that's a deadlock
  // (never measures a width because it never gets one). Stretching forces
  // it to take the parent's full width regardless of that alignItems.
  fill: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Opaque — the 3D book must not show through around the flat page
    // while editing, only the page itself.
    backgroundColor: '#141210',
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: 'opacity',
    transitionDuration: '380ms',
  },
  flatPageFrame: {
    backgroundColor: '#f7f3ea',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 12,
  },
  backButton: {
    position: 'absolute',
    top: 18,
    left: 18,
    backgroundColor: 'rgba(20,18,16,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    zIndex: 10,
  },
  backText: {
    color: '#f2e9d8',
    fontSize: 14,
    fontWeight: '600',
  },
  // Off-screen (not display:none — html-to-image needs it laid out and
  // painted) so it never flashes on screen while being snapshotted.
  captureHostWrap: {
    position: 'absolute',
    left: -99999,
    top: 0,
  },
});
