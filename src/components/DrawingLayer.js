import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Canvas, Path } from '@shopify/react-native-skia';
import { pointsToSkPath } from '../utils/tornPath';
import { denormalizePoints } from '../utils/normalize';

// A highlighter's flat chisel tip gives it square-cut ends and corners —
// round caps/joins (right for pencil/marker) make it look like a felt-tip
// instead, which is what read as "not a highlighter".
function capsForTool(tool) {
  return tool === 'highlighter' ? { strokeCap: 'square', strokeJoin: 'miter' } : { strokeCap: 'round', strokeJoin: 'round' };
}

function StrokePath({ points, color, strokeWidth, opacity = 1, tool }) {
  const skPath = useMemo(() => pointsToSkPath(points), [points]);
  const { strokeCap, strokeJoin } = capsForTool(tool);
  return (
    <Path
      path={skPath}
      style="stroke"
      color={color}
      strokeWidth={strokeWidth}
      strokeCap={strokeCap}
      strokeJoin={strokeJoin}
      opacity={opacity}
    />
  );
}

export default function DrawingLayer({
  width,
  height,
  active,
  erasing,
  strokes,
  color,
  tool,
  strokeWidth = 4,
  strokeOpacity = 1,
  onCommitStroke,
  onEraseAt,
}) {
  const [currentPoints, setCurrentPoints] = useState(null);

  // Holding Shift while drawing snaps the stroke to a straight line from
  // wherever it started to the current point — works for any tool, not
  // just the highlighter. Keyboard-only, so web only (no Shift key on a
  // touchscreen); read via a ref rather than state since it only needs to
  // be checked at draw time, not trigger re-renders on its own.
  const shiftHeldRef = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Shift') shiftHeldRef.current = true;
    };
    const onKeyUp = (e) => {
      if (e.key === 'Shift') shiftHeldRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const startStroke = (x, y) => setCurrentPoints([{ x, y }]);
  const addPoint = (x, y) =>
    setCurrentPoints((prev) => {
      if (!prev || prev.length === 0) return [{ x, y }];
      if (shiftHeldRef.current) return [prev[0], { x, y }];
      return [...prev, { x, y }];
    });
  const endStroke = () => {
    setCurrentPoints((prev) => {
      if (prev && prev.length > 1) {
        onCommitStroke(prev);
      }
      return null;
    });
  };

  const drawGesture = Gesture.Pan()
    .enabled(active && !erasing)
    .minDistance(0)
    .onStart((e) => {
      runOnJS(startStroke)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(addPoint)(e.x, e.y);
    })
    .onEnd(() => {
      runOnJS(endStroke)();
    });

  const eraseGesture = Gesture.Pan()
    .enabled(active && !!erasing)
    .minDistance(0)
    .onStart((e) => {
      runOnJS(onEraseAt)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(onEraseAt)(e.x, e.y);
    });

  const composedGesture = Gesture.Race(drawGesture, eraseGesture);

  if (!width || !height) return null;

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        style={[styles.overlay, { width, height }]}
        pointerEvents={active ? 'auto' : 'none'}
      >
        <Canvas style={{ width, height }}>
          {strokes.map((s) => (
            <StrokePath
              key={s.id}
              points={denormalizePoints(s.points, width, height)}
              color={s.color}
              strokeWidth={s.strokeWidth}
              opacity={s.opacity ?? 1}
              tool={s.tool}
            />
          ))}
          {currentPoints ? (
            <StrokePath
              points={currentPoints}
              color={color}
              strokeWidth={strokeWidth}
              opacity={strokeOpacity}
              tool={tool}
            />
          ) : null}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});