import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { photoTransformStyle } from '../utils/photoTransform';

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;

export default function DraggablePhoto({
  photo,
  pageSize,
  drawingActive,
  onInteractionStart,
  onPositionChange,
  onRotationChange,
  onScaleChange,
  onDelete,
}) {
  // Position/size are stored as fractions of pageSize so the same photo lands
  // in the same relative spot regardless of the pixel size the canvas renders
  // at on a given device (phone vs desktop compute very different pageSize).
  // Photos saved before this existed only have plain x/y/width/height —
  // those are used as-is (best effort, won't rescale across devices).
  const width = photo.widthFrac !== undefined ? photo.widthFrac * pageSize.width : photo.width;
  const height = photo.heightFrac !== undefined ? photo.heightFrac * pageSize.height : photo.height;
  const initX = photo.xFrac !== undefined ? photo.xFrac * pageSize.width : photo.x;
  const initY = photo.yFrac !== undefined ? photo.yFrac * pageSize.height : photo.y;

  const translateX = useSharedValue(initX);
  const translateY = useSharedValue(initY);
  const rotation = useSharedValue(photo.rotation);
  const scale = useSharedValue(photo.scale ?? 1);
  const savedX = useSharedValue(initX);
  const savedY = useSharedValue(initY);
  const savedRotation = useSharedValue(photo.rotation);
  const savedScale = useSharedValue(photo.scale ?? 1);
  const opacity = useSharedValue(1);
  const deleteScale = useSharedValue(1);

  // The nudge buttons in PageCanvas change photo.rotation/photo.scale from
  // outside this component. Shared values only read their initial value at
  // mount, so without this they'd stay visually stale until the component
  // remounted (e.g. on a page change) even though the underlying data updated.
  useEffect(() => {
    rotation.value = photo.rotation;
    savedRotation.value = photo.rotation;
  }, [photo.rotation, rotation, savedRotation]);

  useEffect(() => {
    const next = photo.scale ?? 1;
    scale.value = next;
    savedScale.value = next;
  }, [photo.scale, scale, savedScale]);

  // Re-sync position when the stored fraction changes (another device moved
  // it) or when pageSize itself changes (window resize, or switching to the
  // single-page mobile editing layout) — otherwise the photo would stay at
  // its old pixel position even though the canvas around it just resized.
  useEffect(() => {
    translateX.value = initX;
    translateY.value = initY;
    savedX.value = initX;
    savedY.value = initY;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initX, initY]);

  const handleStart = () => onInteractionStart(photo.id);
  const handlePositionCommit = (x, y) =>
    onPositionChange(photo.id, x / pageSize.width, y / pageSize.height);
  const handleRotationCommit = (r) => onRotationChange(photo.id, r);
  const handleScaleCommit = (s) => onScaleChange(photo.id, s);
  const handleDelete = () => onDelete(photo.id);

  // Clamped so the photo's center can never drag far enough to push its own
  // edges past the page — keeps content from disappearing off the page.
  const clampX = (x) => {
    'worklet';
    const halfW = (width * scale.value) / 2;
    if (halfW >= pageSize.width / 2) return pageSize.width / 2;
    return Math.min(pageSize.width - halfW, Math.max(halfW, x));
  };
  const clampY = (y) => {
    'worklet';
    const halfH = (height * scale.value) / 2;
    if (halfH >= pageSize.height / 2) return pageSize.height / 2;
    return Math.min(pageSize.height - halfH, Math.max(halfH, y));
  };

  const panGesture = Gesture.Pan()
    .enabled(!drawingActive)
    .maxPointers(1)
    .onStart(() => {
      runOnJS(handleStart)();
    })
    .onUpdate((e) => {
      translateX.value = clampX(savedX.value + e.translationX);
      translateY.value = clampY(savedY.value + e.translationY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      runOnJS(handlePositionCommit)(translateX.value, translateY.value);
    });

  const rotateGesture = Gesture.Rotation()
    .enabled(!drawingActive)
    .onStart(() => {
      runOnJS(handleStart)();
    })
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
      runOnJS(handleRotationCommit)(rotation.value);
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(!drawingActive)
    .onStart(() => {
      runOnJS(handleStart)();
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
      translateX.value = clampX(translateX.value);
      translateY.value = clampY(translateY.value);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      runOnJS(handleScaleCommit)(scale.value);
      runOnJS(handlePositionCommit)(translateX.value, translateY.value);
    });

  const longPress = Gesture.LongPress()
    .enabled(!drawingActive)
    .minDuration(500)
    .onStart(() => {
      opacity.value = withTiming(0, { duration: 180 });
      deleteScale.value = withTiming(0.85, { duration: 180 }, () => {
        runOnJS(handleDelete)();
      });
    });

  const tapGesture = Gesture.Tap()
    .enabled(!drawingActive)
    .maxDuration(250)
    .onStart(() => {
      runOnJS(handleStart)();
    });

  const composed = Gesture.Race(
    longPress,
    tapGesture,
    Gesture.Simultaneous(panGesture, rotateGesture, pinchGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}rad` },
      { scale: scale.value * deleteScale.value },
    ],
    opacity: opacity.value,
  }));

  const shape = photo.shape || 'square';
  const shapeRadius = shape === 'circle' ? Math.min(width, height) / 2 : shape === 'rounded' ? Math.min(width, height) * 0.18 : 3;
  const frame = photo.frame || (photo.outline ? 'outline' : 'none');

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.wrapper,
          { width, height, marginLeft: -width / 2, marginTop: -height / 2, borderRadius: shapeRadius },
          frame === 'outline' && styles.outline,
          frame === 'polaroid' && styles.polaroid,
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: photo.uri }}
          style={[styles.image, photoTransformStyle(photo.cropTransform, width, height)]}
          resizeMode="cover"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  outline: {
    borderWidth: 5,
    borderColor: '#fff',
  },
  polaroid: {
    backgroundColor: '#fff',
    borderTopWidth: 8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 28,
    borderColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
