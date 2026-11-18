import React from 'react';
import { View, Image } from 'react-native';
import Svg, { Line, Circle, Path } from 'react-native-svg';

const cameraPhoto = require('../../assets/sticker-camera.png');
const pencilPhoto = require('../../assets/tool-pencil.png');
const markerPhoto = require('../../assets/tool-marker.png');
const eraserPhoto = require('../../assets/tool-eraser.png');
const brushPhoto = require('../../assets/tool-brush.png');
const washiPhoto = require('../../assets/tool-washi.png');
const filmPhoto = require('../../assets/tool-film.png');
const stickersPhoto = require('../../assets/tool-stickers.png');
const highlighterPhoto = require('../../assets/tool-highlighter.png');

// The object floats directly on the dark panel — no card/frame behind it.
// This only looks right if `source` is a transparent-background PNG; if the
// file still has an opaque white canvas around the object, that white
// rectangle will show up here instead of a clean cutout.
//
// Two layouts:
//  - "crop" (default) — for the wide, thin product shots (a pencil lying
//    nearly flat): scale is bound to the box's HEIGHT only, so the object
//    is zoomed in large enough to fill the icon and its right (tip) end is
//    what shows, cropping off the left/cap end.
//  - `fit` — for roughly square objects (a tape roll, a sticker cluster):
//    the whole object is scaled to fit and centered, nothing cropped.
//
// `expanded` grows the box (anchored so the right/tip edge moves further
// right, revealing more of the object rather than just repositioning the
// same crop) — paired with the row's own translateX in Toolbar.js so
// hovering/selecting reads as the object sliding further out, not just
// hopping sideways.
function PhotoIconChip({
  source,
  width = 100,
  height = 44,
  expandedWidth,
  expanded = false,
  bbox,
  natural = { w: 1536, h: 1024 },
  fill = 1.3,
  fit = false,
}) {
  const boxW = expanded ? expandedWidth ?? width * 1.35 : width;
  const transition = { transitionProperty: 'width, transform', transitionDuration: '200ms' };

  if (!bbox) {
    return (
      <View style={{ width: boxW, height, alignItems: 'center', justifyContent: 'center', ...transition }}>
        <Image source={source} resizeMode="contain" style={{ width: boxW, height }} />
      </View>
    );
  }

  const [bx, by, bw, bh] = bbox;
  const cy = by + bh / 2;

  if (fit) {
    const scale = Math.min((boxW * 0.9) / bw, (height * 0.9) / bh);
    const cx = bx + bw / 2;
    return (
      <View style={{ width: boxW, height, overflow: 'hidden', ...transition }}>
        <Image
          source={source}
          resizeMode="contain"
          style={{
            position: 'absolute',
            width: natural.w * scale,
            height: natural.h * scale,
            transform: [{ translateX: boxW / 2 - cx * scale }, { translateY: height / 2 - cy * scale }],
          }}
        />
      </View>
    );
  }

  const scale = (height * fill) / bh;
  const rightEdge = bx + bw;
  // Right (tip) end held near the box's right edge, small margin so it
  // doesn't touch — it's the left/cap end that runs off the box instead.
  const translateX = boxW * 0.96 - rightEdge * scale;
  return (
    <View style={{ width: boxW, height, overflow: 'hidden', ...transition }}>
      <Image
        source={source}
        resizeMode="contain"
        style={{
          position: 'absolute',
          width: natural.w * scale,
          height: natural.h * scale,
          transform: [{ translateX }, { translateY: height / 2 - cy * scale }],
        }}
      />
    </View>
  );
}

// Every tool below is either a real user-supplied photo (transparent PNG,
// no brand text/logo visible) via PhotoIconChip, or original vector art —
// no brand text, no logos, not traced from any product photo.

// bbox measured directly from each PNG's alpha channel (x, y, width, height
// in source pixels) — the object only occupies a small strip of the 1536x1024
// canvas, so without this it renders as a nearly-invisible sliver.
export function PencilToolIcon({ size = 28, expanded }) {
  return (
    <PhotoIconChip
      source={pencilPhoto}
      width={size * 2.3}
      height={size * 1.05}
      expanded={expanded}
      bbox={[542, 454, 453, 77]}
    />
  );
}

export function MarkerToolIcon({ size = 28, expanded }) {
  return (
    <PhotoIconChip
      source={markerPhoto}
      width={size * 2.3}
      height={size * 1.05}
      expanded={expanded}
      bbox={[579, 448, 380, 83]}
    />
  );
}

export function HighlighterToolIcon({ size = 28, expanded }) {
  return (
    <PhotoIconChip
      source={highlighterPhoto}
      width={size * 2.3}
      height={size * 1.5}
      expanded={expanded}
      bbox={[850, 438, 116, 122]}
      fit
    />
  );
}

export function BrushToolIcon({ size = 28, expanded }) {
  return (
    <PhotoIconChip
      source={brushPhoto}
      width={size * 2.3}
      height={size * 0.9}
      expanded={expanded}
      bbox={[542, 454, 436, 68]}
    />
  );
}

export function EraserToolIcon({ size = 28, expanded }) {
  return (
    <PhotoIconChip
      source={eraserPhoto}
      width={size * 1.9}
      height={size * 1.05}
      expanded={expanded}
      bbox={[667, 428, 187, 103]}
    />
  );
}

export function WashiRollIcon({ size = 28, expanded }) {
  return (
    <PhotoIconChip
      source={washiPhoto}
      width={size * 3.3}
      height={size * 3.0}
      expanded={expanded}
      bbox={[653, 404, 215, 151]}
      fit
    />
  );
}

export function FilmRollIcon({ size = 28, expanded }) {
  return (
    <PhotoIconChip
      source={filmPhoto}
      width={size * 3.2}
      height={size * 3.2}
      expanded={expanded}
      bbox={[640, 353, 188, 147]}
      fit
    />
  );
}

export function StickerSheetIcon({ size = 28, expanded }) {
  return (
    <PhotoIconChip
      source={stickersPhoto}
      width={size * 3.4}
      height={size * 3.4}
      expanded={expanded}
      bbox={[663, 381, 191, 197]}
      fit
    />
  );
}

// The always-visible action row (photo / draw toggle / text / background)
// uses the same flat vector style, same restrained palette, no gradients
// (the tools get gradients because they represent physical colored
// objects; these represent actions) — except Photo, which is a real photo
// (camera, no visible markings) the user supplied for this row.

export function PhotoActionIcon({ size = 26 }) {
  return <PhotoIconChip source={cameraPhoto} width={size * 1.3} height={size * 1.1} bbox={[609, 349, 609, 353]} />;
}

export function EditPencilIcon({ size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        d="M8 24.5 L8.9 20 L21 8 L24 11 L11.9 23 Z"
        fill="none"
        stroke="#cfcac2"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Line x1="18" y1="11" x2="21" y2="14" stroke="#cfcac2" strokeWidth="2" />
      <Line x1="8" y1="24.5" x2="11" y2="23.6" stroke="#cfcac2" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function BackgroundActionIcon({ size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        d="M16 5 C9 5 4 10 4 16.5 C4 21 7 24 11 24 C12.5 24 13 23 13 21.8 C13 20.8 12.3 20.3 12.3 19.3 C12.3 18 13.3 17 15 17 H19 C23 17 26 14 26 10.5 C26 7 22 5 16 5 Z"
        fill="none"
        stroke="#cfcac2"
        strokeWidth="2"
      />
      <Circle cx="10.5" cy="14" r="1.6" fill="#e07a5f" />
      <Circle cx="16" cy="10.5" r="1.6" fill="#3f7fd1" />
      <Circle cx="21.5" cy="13" r="1.6" fill="#f5e21a" />
    </Svg>
  );
}

export function StickerActionIcon({ size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M6 6 H20 L26 12 V26 H6 Z" fill="none" stroke="#cfcac2" strokeWidth="2" strokeLinejoin="round" />
      <Path d="M20 6 V12 H26" fill="none" stroke="#cfcac2" strokeWidth="2" strokeLinejoin="round" />
      <Path
        d="M16 15 L17.2 17.6 L20 18 L18 19.9 L18.5 22.7 L16 21.4 L13.5 22.7 L14 19.9 L12 18 L14.8 17.6 Z"
        fill="#e0a92f"
      />
    </Svg>
  );
}
