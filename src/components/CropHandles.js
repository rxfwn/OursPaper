import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const HANDLE_SIZE = 22;
const MIN_BOX = 40;

// Drag deltas arrive in screen space, but the box can be rotated — rotating
// the delta into the box's own (unrotated) local space is what lets a corner
// keep tracking the finger even when the photo is tilted.
function toLocal(dx, dy, rotation) {
  'worklet';
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  return { lx: dx * cos - dy * sin, ly: dx * sin + dy * cos };
}

// The photo itself renders with resizeMode="cover", so shrinking this box is
// the crop: less of the image shows through, and the diagonally-opposite
// corner stays put on screen (a real rogner-tool feel) instead of the photo
// re-centering under the user's finger.
export default function CropHandles({ photo, pageSize, onCropChange, onDone }) {
  const initW = photo.widthFrac !== undefined ? photo.widthFrac * pageSize.width : photo.width;
  const initH = photo.heightFrac !== undefined ? photo.heightFrac * pageSize.height : photo.height;
  const initCx = photo.xFrac !== undefined ? photo.xFrac * pageSize.width : photo.x;
  const initCy = photo.yFrac !== undefined ? photo.yFrac * pageSize.height : photo.y;
  const rotation = photo.rotation || 0;

  const boxW = useSharedValue(initW);
  const boxH = useSharedValue(initH);
  const cx = useSharedValue(initCx);
  const cy = useSharedValue(initCy);
  const savedW = useSharedValue(initW);
  const savedH = useSharedValue(initH);
  const savedCx = useSharedValue(initCx);
  const savedCy = useSharedValue(initCy);

  const commit = (w, h, x, y) => {
    onCropChange(w, h, x / pageSize.width, y / pageSize.height);
  };

  const makeCornerGesture = (signX, signY) =>
    Gesture.Pan()
      .onUpdate((e) => {
        const { lx, ly } = toLocal(e.translationX, e.translationY, rotation);
        const newW = Math.max(MIN_BOX, savedW.value + signX * lx);
        const newH = Math.max(MIN_BOX, savedH.value + signY * ly);
        const dw = newW - savedW.value;
        const dh = newH - savedH.value;
        // Shift the center by half the growth, in the direction of this
        // corner, so the opposite corner is the one that stays anchored.
        const shiftLocalX = (signX * dw) / 2;
        const shiftLocalY = (signY * dh) / 2;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        boxW.value = newW;
        boxH.value = newH;
        cx.value = savedCx.value + shiftLocalX * cos - shiftLocalY * sin;
        cy.value = savedCy.value + shiftLocalX * sin + shiftLocalY * cos;
      })
      .onEnd(() => {
        savedW.value = boxW.value;
        savedH.value = boxH.value;
        savedCx.value = cx.value;
        savedCy.value = cy.value;
        runOnJS(commit)(boxW.value, boxH.value, cx.value, cy.value);
      });

  const tl = makeCornerGesture(-1, -1);
  const tr = makeCornerGesture(1, -1);
  const bl = makeCornerGesture(-1, 1);
  const br = makeCornerGesture(1, 1);

  const boxStyle = useAnimatedStyle(() => ({
    left: cx.value - boxW.value / 2,
    top: cy.value - boxH.value / 2,
    width: boxW.value,
    height: boxH.value,
    transform: [{ rotate: `${rotation}rad` }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.box, boxStyle]} pointerEvents="box-none">
        <View style={styles.gridLineV} />
        <View style={[styles.gridLineV, { left: '66.66%' }]} />
        <View style={styles.gridLineH} />
        <View style={[styles.gridLineH, { top: '66.66%' }]} />
        <GestureDetector gesture={tl}>
          <View style={[styles.handle, styles.handleTL]} />
        </GestureDetector>
        <GestureDetector gesture={tr}>
          <View style={[styles.handle, styles.handleTR]} />
        </GestureDetector>
        <GestureDetector gesture={bl}>
          <View style={[styles.handle, styles.handleBL]} />
        </GestureDetector>
        <GestureDetector gesture={br}>
          <View style={[styles.handle, styles.handleBR]} />
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  gridLineV: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  gridLineH: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2b2320',
  },
  handleTL: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
  handleTR: { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
  handleBL: { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
  handleBR: { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
});
