import React, { useState, useRef, useEffect } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { DEFAULT_TEXT_SIZE } from '../theme/textFonts';

// Text auto-sizes to its content so its real rendered box isn't known here —
// these are a conservative stand-in (half of styles.wrapper's maxWidth, and a
// rough single/double-line height) just to keep it from being dragged well
// past the page edge, not a pixel-perfect bound.
const APPROX_HALF_WIDTH = 120;
const APPROX_HALF_HEIGHT = 40;

function formatStyle(item) {
  const decorations = [item.underline && 'underline', item.strikethrough && 'line-through'].filter(Boolean);
  return {
    fontSize: item.fontSize || DEFAULT_TEXT_SIZE,
    fontFamily: item.fontFamily || undefined,
    fontWeight: item.bold ? '700' : '500',
    fontStyle: item.italic ? 'italic' : 'normal',
    textDecorationLine: decorations.length ? decorations.join(' ') : 'none',
    backgroundColor: item.highlightColor || 'transparent',
  };
}

export default function DraggableText({
  item,
  pageSize,
  drawingActive,
  onInteractionStart,
  onPositionChange,
  onRotationChange,
  onTextChange,
  onDelete,
}) {
  const [editing, setEditing] = useState(item.text === '');
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef(null);

  // Same fraction-of-pageSize storage as photos — see DraggablePhoto for why.
  const initX = item.xFrac !== undefined ? item.xFrac * pageSize.width : item.x;
  const initY = item.yFrac !== undefined ? item.yFrac * pageSize.height : item.y;

  const translateX = useSharedValue(initX);
  const translateY = useSharedValue(initY);
  const rotation = useSharedValue(item.rotation);
  const savedX = useSharedValue(initX);
  const savedY = useSharedValue(initY);
  const savedRotation = useSharedValue(item.rotation);
  const opacity = useSharedValue(1);
  const scaleOut = useSharedValue(1);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    translateX.value = initX;
    translateY.value = initY;
    savedX.value = initX;
    savedY.value = initY;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initX, initY]);

  const handleStart = () => onInteractionStart(item.id);
  const handlePositionCommit = (x, y) =>
    onPositionChange(item.id, x / pageSize.width, y / pageSize.height);
  const handleRotationCommit = (r) => onRotationChange(item.id, r);
  const handleEnterEdit = () => setEditing(true);
  const handleDelete = () => onDelete(item.id);

  const clampX = (x) => {
    'worklet';
    if (APPROX_HALF_WIDTH >= pageSize.width / 2) return pageSize.width / 2;
    return Math.min(pageSize.width - APPROX_HALF_WIDTH, Math.max(APPROX_HALF_WIDTH, x));
  };
  const clampY = (y) => {
    'worklet';
    if (APPROX_HALF_HEIGHT >= pageSize.height / 2) return pageSize.height / 2;
    return Math.min(pageSize.height - APPROX_HALF_HEIGHT, Math.max(APPROX_HALF_HEIGHT, y));
  };

  // Unlike earlier attempts, dragging/rotating are NOT disabled while editing
  // — a previous split (separate drag-handle only usable while typing) kept
  // breaking in ways that were hard to pin down. Gesture.Pan's default
  // minDistance (~10px) already lets a plain tap-to-place-cursor through
  // without triggering a drag, so this doesn't fight the TextInput's own
  // touch handling in practice.
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

  const tapGesture = Gesture.Tap()
    .enabled(!drawingActive && !editing)
    .maxDuration(250)
    .onStart(() => {
      runOnJS(handleStart)();
      runOnJS(handleEnterEdit)();
    });

  const longPress = Gesture.LongPress()
    .enabled(!drawingActive && !editing)
    .minDuration(500)
    .onStart(() => {
      opacity.value = withTiming(0, { duration: 180 });
      scaleOut.value = withTiming(0.85, { duration: 180 }, () => {
        runOnJS(handleDelete)();
      });
    });

  const composed = Gesture.Race(
    longPress,
    tapGesture,
    Gesture.Simultaneous(panGesture, rotateGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}rad` },
      { scale: scaleOut.value },
    ],
    opacity: opacity.value,
  }));

  const commitText = (value) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      onDelete(item.id);
    } else {
      onTextChange(item.id, trimmed);
    }
  };

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.wrapper, animatedStyle]}>
        {editing ? (
          <TextInput
            ref={inputRef}
            style={[styles.text, styles.input, formatStyle(item), { color: item.color }]}
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Écris quelque chose…"
            placeholderTextColor="rgba(60,50,40,0.4)"
            onBlur={() => {
              commitText(draft);
              setEditing(false);
            }}
            onSubmitEditing={() => {
              commitText(draft);
              setEditing(false);
            }}
          />
        ) : (
          <Animated.Text style={[styles.text, formatStyle(item), { color: item.color }]}>{item.text}</Animated.Text>
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
    maxWidth: 240,
  },
  text: {
    paddingHorizontal: 2,
  },
  input: {
    minWidth: 120,
    padding: 0,
  },
});
