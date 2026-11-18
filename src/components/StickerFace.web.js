import React, { useEffect, useId, useRef } from 'react';

// Web rendering of an emoji sticker as a real die-cut sticker: a per-sticker
// SVG filter grows a white (or glitter / holo) border around the glyph's
// silhouette, then lights the whole thing with a point light that follows the
// pointer — so moving the mouse across the page makes stickers catch the
// light, the way vinyl/foil stickers do. Everything is generated (filters,
// noise, gradients), no image asset.

// ---------------------------------------------------------------------------
// Shared light source: one window listener + one rAF loop for every sticker.
// ---------------------------------------------------------------------------
const subscribers = new Set();
let pointer = null; // { x, y } in client coords, null until the pointer moves
let lastPointerAt = 0;
let rafId = 0;
let lastFrame = 0;
const IDLE_AFTER_MS = 2500;
const IDLE_FPS = 24;

function tick(now) {
  rafId = 0;
  if (subscribers.size === 0) return;
  const idle = !pointer || now - lastPointerAt > IDLE_AFTER_MS;
  // When nobody moves the pointer (or on touch screens), the light slowly
  // drifts on its own so holo/glossy stickers still shimmer a little.
  if (idle && now - lastFrame < 1000 / IDLE_FPS) {
    schedule();
    return;
  }
  lastFrame = now;
  subscribers.forEach((fn) => fn(idle ? null : pointer, now));
  if (idle) schedule();
}

function schedule() {
  if (!rafId && typeof requestAnimationFrame !== 'undefined') rafId = requestAnimationFrame(tick);
}

function onPointerMove(e) {
  pointer = { x: e.clientX, y: e.clientY };
  lastPointerAt = performance.now();
  schedule();
}

function subscribe(fn) {
  if (subscribers.size === 0 && typeof window !== 'undefined') {
    window.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
  }
  subscribers.add(fn);
  schedule();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
    }
  };
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const RAINBOW_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" preserveAspectRatio="none">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0.35">' +
      ['#ff9ad5', '#ffe08a', '#a6ffcb', '#8fd3ff', '#c7a4ff', '#ff9ad5', '#ffe08a', '#a6ffcb', '#8fd3ff']
        .map((c, i, a) => `<stop offset="${i / (a.length - 1)}" stop-color="${c}"/>`)
        .join('') +
      '</linearGradient></defs><rect width="300" height="100" fill="url(#g)"/></svg>'
  );

// Lighting response per material: how bumpy the edge is, how shiny and how
// tight the highlight is, and how much of it is added on top.
const LIGHT = {
  paper: { surfaceScale: 2, constant: 0.6, exponent: 6, amount: 0.12 },
  gloss: { surfaceScale: 3, constant: 1.2, exponent: 32, amount: 1 },
  holo: { surfaceScale: 3, constant: 1.1, exponent: 22, amount: 0.7 },
  glitter: { surfaceScale: 2.5, constant: 0.9, exponent: 14, amount: 0.35 },
};

function StickerFilter({ id, material, box, border, lightRef, rainbowRef }) {
  const L = LIGHT[material] || LIGHT.paper;
  const isGlitter = material === 'glitter';
  const isHolo = material === 'holo';
  return (
    <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
      <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
        {/* Die-cut silhouette: dilate the glyph's alpha, then smooth the edge. */}
        <feMorphology in="SourceAlpha" operator="dilate" radius={border} result="dil" />
        <feGaussianBlur in="dil" stdDeviation="1" result="dilb" />
        <feComponentTransfer in="dilb" result="cut">
          <feFuncA type="linear" slope="4" intercept="-1.4" />
        </feComponentTransfer>

        {isGlitter ? (
          <>
            <feFlood floodColor="#c4c7d2" />
            <feComposite in2="cut" operator="in" result="silver" />
            <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="1" seed="7" result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  9 0 0 0 -4.4"
              result="specksW"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 0.62  0 0 0 0 0.92  0 9 0 0 -4.6"
              result="specksP"
            />
            <feMerge result="specks">
              <feMergeNode in="specksP" />
              <feMergeNode in="specksW" />
            </feMerge>
            <feComposite in="specks" in2="cut" operator="in" result="specksIn" />
            <feMerge result="base">
              <feMergeNode in="silver" />
              <feMergeNode in="specksIn" />
            </feMerge>
          </>
        ) : (
          <>
            <feFlood floodColor="#fffdf6" />
            <feComposite in2="cut" operator="in" result={isHolo ? 'white' : 'base'} />
          </>
        )}

        {isHolo && (
          <>
            {/* Holographic foil: a wide pastel rainbow that slides with the
                light. It tints the border and washes over the artwork. */}
            <feImage
              ref={rainbowRef}
              href={RAINBOW_URI}
              x={-box}
              y={-box * 0.2}
              width={box * 3}
              height={box * 1.4}
              preserveAspectRatio="none"
              result="rb"
            />
            <feComposite in="rb" in2="cut" operator="in" result="rbIn" />
            <feComposite in="white" in2="rbIn" operator="arithmetic" k2="0.25" k3="0.75" result="base" />
          </>
        )}

        <feMerge result="stk">
          <feMergeNode in="base" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>

        {isHolo && (
          <>
            <feBlend in="rbIn" in2="stk" mode="screen" result="rbMix" />
            <feComposite in="stk" in2="rbMix" operator="arithmetic" k2="0.55" k3="0.45" result="holoMix" />
            <feComposite in="holoMix" in2="cut" operator="in" result="stkHolo" />
          </>
        )}

        {/* Lighting: a blurred silhouette works as a bump map, so the border's
            edge gets a rim and flat areas get a highlight under the light. */}
        <feGaussianBlur in="cut" stdDeviation="2" result="bump" />
        <feSpecularLighting
          in="bump"
          surfaceScale={L.surfaceScale}
          specularConstant={L.constant}
          specularExponent={L.exponent}
          lightingColor="#ffffff"
          result="spec"
        >
          <fePointLight ref={lightRef} x={box * 0.25} y={box * 0.1} z={box * 1.4} />
        </feSpecularLighting>
        <feComposite in="spec" in2="cut" operator="in" result="specIn" />
        {isGlitter && (
          <feComposite in="specksIn" in2="specIn" operator="arithmetic" k1="1.8" result="glint" />
        )}
        <feComposite
          in={isHolo ? 'stkHolo' : 'stk'}
          in2="specIn"
          operator="arithmetic"
          k2="1"
          k3={L.amount}
          result="lit"
        />
        {isGlitter && (
          <feMerge>
            <feMergeNode in="lit" />
            <feMergeNode in="glint" />
          </feMerge>
        )}
      </filter>
    </svg>
  );
}

const SHADOW_REST = 'drop-shadow(0 1.5px 1.2px rgba(40,25,10,0.28)) drop-shadow(0 3px 5px rgba(40,25,10,0.14))';
const SHADOW_LIFTED = 'drop-shadow(0 8px 6px rgba(40,25,10,0.22)) drop-shadow(0 16px 18px rgba(40,25,10,0.18))';

export default function StickerFace({ emoji, material = 'paper', box = 48, fontSize, lifted = false, static: isStatic = false }) {
  const rawId = useId();
  const filterId = `ours-stk-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const elRef = useRef(null);
  const lightRef = useRef(null);
  const rainbowRef = useRef(null);
  const border = Math.max(2, Math.round(box * 0.065));
  const seed = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    if (isStatic) return undefined;
    return subscribe((p, now) => {
      const el = elRef.current;
      const light = lightRef.current;
      if (!el || !light) return;
      let lx;
      let ly;
      if (p) {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        // Map the pointer into the sticker's own (unscaled) coordinate space.
        lx = ((p.x - r.left) / r.width) * box;
        ly = ((p.y - r.top) / r.height) * box;
      } else {
        const t = now / 2600 + seed.current;
        lx = box * (0.5 + Math.cos(t) * 0.55);
        ly = box * (0.35 + Math.sin(t * 1.3) * 0.35);
      }
      light.setAttribute('x', lx.toFixed(1));
      light.setAttribute('y', ly.toFixed(1));
      const rb = rainbowRef.current;
      if (rb) {
        const shift = Math.max(-2 * box, Math.min(0, -box - (lx + ly - box) * 0.9));
        rb.setAttribute('x', shift.toFixed(1));
      }
    });
  }, [box, isStatic]);

  return (
    <div
      ref={elRef}
      style={{
        position: 'relative',
        width: box,
        height: box,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: `url(#${filterId}) ${lifted ? SHADOW_LIFTED : SHADOW_REST}`,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      <StickerFilter id={filterId} material={material} box={box} border={border} lightRef={lightRef} rainbowRef={rainbowRef} />
      <span
        style={{
          fontSize: fontSize ?? box * 0.8,
          lineHeight: 1,
          fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
        }}
      >
        {emoji}
      </span>
    </div>
  );
}
