export const DEFAULT_PHOTO_TRANSFORM = { scale: 1, rotation: 0, dxFrac: 0, dyFrac: 0 };

export function photoTransformStyle(transform, width, height) {
  const t = transform || DEFAULT_PHOTO_TRANSFORM;
  return {
    transform: [
      { translateX: t.dxFrac * width },
      { translateY: t.dyFrac * height },
      { rotate: `${t.rotation}rad` },
      { scale: t.scale },
    ],
  };
}
