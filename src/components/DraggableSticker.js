import React, { useEffect } from 'react';
import { Text, View, Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const BASE_SIZE = 48;
const TAPE_WIDTH = 90;
const TAPE_HEIGHT = 26;
const IMAGE_SIZE = 90;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export default function DraggableSticker({
  sticker,
  pageSize,
  drawingActive,
  onInteractionStart,
  onPositionChange,
  onRotationChange,
  onScaleChange,
  onDelete,
}) {
  const isTape = sticker.kind === 'tape';
  const isImage = sticker.kind === 'image';
  // Emoji glyphs and tape strips don't expose a measurable box the way
  // photos do — this is a conservative stand-in just to keep drag clamping
  // roughly sane, not a pixel-perfect bound. See DraggableText for the same
  // tradeoff.
  const halfW = isTape ? TAPE_WIDTH / 2 : isImage ? IMAGE_SIZE / 2 : (BASE_SIZE * 1.4) / 2;
  const halfH = isTape ? TAPE_HEIGHT / 2 : isImage ? IMAGE_SIZE / 2 : (BASE_SIZE * 1.4) / 2;

  const initX = sticker.xFrac !== undefined ? sticker.xFrac * pageSize.width : sticker.x;
  const initY = sticker.yFrac !== undefined ? sticker.yFrac * pageSize.height : sticker.y;

  const translateX = useSharedValue(initX);
  const translateY = useSharedValue(initY);
  const rotation = useSharedValue(sticker.rotation || 0);
  const scale = useSharedValue(sticker.scale ?? 1);
  const savedX = useSharedValue(initX);
  const savedY = useSharedValue(initY);
  const savedRotation = useSharedValue(sticker.rotation || 0);
  const savedScale = useSharedValue(sticker.scale ?? 1);
  const opacity = useSharedValue(1);
  const deleteScale = useSharedValue(1);

  useEffect(() => {
    translateX.value = initX;
    translateY.value = initY;
    savedX.value = initX;
    savedY.value = initY;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initX, initY]);

  const handleStart = () => onInteractionStart(sticker.id);
  const handlePositionCommit = (x, y) => onPositionChange(sticker.id, x / pageSize.width, y / pageSize.height);
  const handleRotationCommit = (r) => onRotationChange(sticker.id, r);
  const handleScaleCommit = (s) => onScaleChange(sticker.id, s);
  const handleDelete = () => onDelete(sticker.id);

  const clampX = (x) => {
    'worklet';
    const half = halfW * scale.value;
    if (half >= pageSize.width / 2) return pageSize.width / 2;
    return Math.min(pageSize.width - half, Math.max(half, x));
  };
  const clampY = (y) => {
    'worklet';
    const half = halfH * scale.value;
    if (half >= pageSize.height / 2) return pageSize.height / 2;
    return Math.min(pageSize.height - half, Math.max(half, y));
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

  const composed = Gesture.Race(longPress, tapGesture, Gesture.Simultaneous(panGesture, rotateGesture, pinchGesture));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}rad` },
      { scale: scale.value * deleteScale.value },
    ],
    opacity: opacity.value,
  }));

  const wrapperSize = isTape
    ? { width: TAPE_WIDTH, height: TAPE_HEIGHT, marginLeft: -TAPE_WIDTH / 2, marginTop: -TAPE_HEIGHT / 2 }
    : isImage
    ? { width: IMAGE_SIZE, height: IMAGE_SIZE, marginLeft: -IMAGE_SIZE / 2, marginTop: -IMAGE_SIZE / 2 }
    : { width: BASE_SIZE, height: BASE_SIZE, marginLeft: -BASE_SIZE / 2, marginTop: -BASE_SIZE / 2 };

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.wrapper, wrapperSize, animatedStyle]}>
        {isTape ? (
          <View style={[styles.tape, { backgroundColor: sticker.color }]}>
            {sticker.pattern === 'stripe' && (
              <View style={styles.tapeStripes}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.tapeStripe} />
                ))}
              </View>
            )}
            {sticker.pattern === 'dot' && (
              <View style={styles.tapeDots}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.tapeDot} />
                ))}
              </View>
            )}
          </View>
        ) : isImage ? (
          <Image source={sticker.source} style={styles.stickerImage} resizeMode="contain" />
        ) : (
          <Text style={styles.emoji}>{sticker.emoji}</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: BASE_SIZE * 0.8,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
  },
  tape: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    opacity: 0.82,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  tapeStripes: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tapeStripe: {
    width: 4,
    height: '140%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ rotate: '25deg' }],
  },
  tapeDots: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  tapeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
