import { Skia } from '@shopify/react-native-skia';

export function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

export function pointsToSkPath(points) {
  const builder = Skia.PathBuilder.Make();
  if (!points || points.length === 0) return builder.detach();
  builder.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    builder.lineTo(points[i].x, points[i].y);
  }
  return builder.detach();
}