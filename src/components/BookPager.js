import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import PageCanvas from './PageCanvas';

const SWIPE_THRESHOLD_RATIO = 0.22;
const MAX_TILT_DEG = 10;
const IDLE_BOOK_TILT_DEG = 6;
const FOCUS_ZOOM_SCALE = 1.05;
// The two pages sit flush against each other (no gap) — the binding is a
// shadow painted ON TOP of the seam, not a strip of empty space between two
// separate cards, so the spread reads as one bound book rather than two
// cards sitting side by side.
export const SPREAD_GUTTER = 0;
const SPINE_SHADOW_WIDTH = 36;

// activeIndex is always the LEFT page of the spread currently shown —
// each spread is a pair of DIFFERENT days (left = activeIndex, right =
// activeIndex + 1), not one day stretched across both halves. Swiping
// advances by a whole spread (2 pages) at a time.
export default function BookPager({
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
  onChangeIndex,
  onUpdatePage,
  onAddPage,
  onPageTap,
  flattened = false,
}) {
  const translateX = useSharedValue(0);
  const pageWidth = pageSize.width || 1;
  const spreadWidth = pageWidth * 2 + SPREAD_GUTTER;

  // Paper-style: tilted in 3D while just browsing, flattens flush and grows
  // slightly to give the "stepping closer into edit mode" feeling the
  // moment the page is actually being worked on.
  const tiltDeg = useSharedValue(IDLE_BOOK_TILT_DEG);
  const zoomScale = useSharedValue(1);
  React.useEffect(() => {
    const timing = { duration: 420, easing: Easing.out(Easing.cubic) };
    tiltDeg.value = withTiming(flattened ? 0 : IDLE_BOOK_TILT_DEG, timing);
    zoomScale.value = withTiming(flattened ? FOCUS_ZOOM_SCALE : 1, timing);
  }, [flattened, tiltDeg, zoomScale]);
  const tiltWrapperStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1400 }, { rotateX: `${tiltDeg.value}deg` }, { scale: zoomScale.value }],
  }));

  const hasNextSpread = activeIndex + 2 < pages.length;
  const hasPrevSpread = activeIndex - 2 >= 0;

  const commit = (dir) => {
    if (dir < 0) {
      if (hasNextSpread) {
        onChangeIndex(activeIndex + 2);
      } else {
        onAddPage();
        onChangeIndex(activeIndex + 2);
      }
    } else if (dir > 0 && hasPrevSpread) {
      onChangeIndex(activeIndex - 2);
    }
    translateX.value = 0;
  };

  const panGesture = Gesture.Pan()
    .enabled(!drawing)
    .activeOffsetX([-14, 14])
    .failOffsetY([-18, 18])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const threshold = spreadWidth * SWIPE_THRESHOLD_RATIO;
      const flungNext = e.translationX < -24 && e.velocityX < -600;
      const flungPrev = e.translationX > 24 && e.velocityX > 600 && hasPrevSpread;
      const goNext = e.translationX < -threshold || flungNext;
      const goPrev = (e.translationX > threshold && hasPrevSpread) || flungPrev;
      if (goNext) {
        translateX.value = withTiming(-spreadWidth, { duration: 300, easing: Easing.out(Easing.cubic) }, () => {
          runOnJS(commit)(-1);
        });
      } else if (goPrev) {
        translateX.value = withTiming(spreadWidth, { duration: 300, easing: Easing.out(Easing.cubic) }, () => {
          runOnJS(commit)(1);
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 210, mass: 0.7 });
      }
    });

  const makeSpreadStyle = (offset) =>
    useAnimatedStyle(() => ({
      transform: [
        { perspective: 1200 },
        { translateX: translateX.value + offset * spreadWidth },
        {
          rotateY: `${interpolate(
            translateX.value,
            [-spreadWidth, 0, spreadWidth],
            [-MAX_TILT_DEG, 0, MAX_TILT_DEG],
            Extrapolation.CLAMP
          )}deg`,
        },
      ],
      opacity:
        offset === 0
          ? 1
          : offset < 0
          ? interpolate(translateX.value, [0, spreadWidth], [0, 1], Extrapolation.CLAMP)
          : interpolate(translateX.value, [-spreadWidth, 0], [1, 0], Extrapolation.CLAMP),
    }));

  const currentStyle = makeSpreadStyle(0);
  const prevStyle = makeSpreadStyle(-1);
  const nextStyle = makeSpreadStyle(1);

  if (!pageSize.width || !pageSize.height) {
    return <View style={styles.fill} />;
  }

  const renderSpread = (leftIndex, interactive) => {
    const leftPage = pages[leftIndex];
    const rightPage = pages[leftIndex + 1];
    return (
      <View style={[styles.spread, { width: spreadWidth, height: pageSize.height }]}>
        <View style={[styles.pageSlot, pageSize, styles.pageSlotLeft]}>
          {leftPage ? (
            <PageCanvas
              page={leftPage}
              pageSize={pageSize}
              drawing={interactive ? drawing : false}
              drawColor={drawColor}
              drawTool={drawTool}
              erasing={erasing}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              eraseRadius={eraseRadius}
              onColorUsed={interactive ? onColorUsed : undefined}
              recentColors={interactive ? recentColors : undefined}
              onUpdatePage={(fn) => onUpdatePage(leftIndex, fn)}
              onPageTap={interactive ? onPageTap : undefined}
              interactive={interactive}
            />
          ) : (
            <View style={[styles.pageSlot, pageSize, styles.ghostPage]} />
          )}
        </View>
        <View style={[styles.pageSlot, pageSize, styles.pageSlotRight, { left: pageSize.width }]}>
          {rightPage ? (
            <PageCanvas
              page={rightPage}
              pageSize={pageSize}
              drawing={interactive ? drawing : false}
              drawColor={drawColor}
              drawTool={drawTool}
              erasing={erasing}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              eraseRadius={eraseRadius}
              onColorUsed={interactive ? onColorUsed : undefined}
              recentColors={interactive ? recentColors : undefined}
              onUpdatePage={(fn) => onUpdatePage(leftIndex + 1, fn)}
              onPageTap={interactive ? onPageTap : undefined}
              interactive={interactive}
            />
          ) : interactive ? (
            <View style={[styles.pageSlot, pageSize, styles.ghostPage]}>
              <Text style={styles.ghostText}>+ Nouvelle page</Text>
            </View>
          ) : (
            <View style={[styles.pageSlot, pageSize, styles.ghostPage]} />
          )}
        </View>
        {/* Painted on top of the seam, not occupying space — darkest right at
            the fold and fading out both ways, like a real book's gutter
            shadow. No light/white line in the middle. */}
        <View
          pointerEvents="none"
          style={[styles.spine, { left: pageSize.width - SPINE_SHADOW_WIDTH / 2, width: SPINE_SHADOW_WIDTH }]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.spineHalf}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.spineHalf}
          />
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={tiltWrapperStyle}>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.fill, { width: spreadWidth, height: pageSize.height }]}>
          {hasPrevSpread && (
            <Animated.View
              style={[styles.slot, { width: spreadWidth, height: pageSize.height }, prevStyle]}
              pointerEvents="none"
            >
              {renderSpread(activeIndex - 2, false)}
            </Animated.View>
          )}
          <Animated.View style={[styles.slot, { width: spreadWidth, height: pageSize.height }, currentStyle]}>
            {renderSpread(activeIndex, true)}
          </Animated.View>
          {hasNextSpread && (
            <Animated.View
              style={[styles.slot, { width: spreadWidth, height: pageSize.height }, nextStyle]}
              pointerEvents="none"
            >
              {renderSpread(activeIndex + 2, false)}
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    overflow: 'visible',
  },
  slot: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  spread: {
    flexDirection: 'row',
  },
  pageSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  // Only the outer corners round — the inner (spine-side) corners stay
  // square so the two pages meet flush, reading as one bound spread instead
  // of two separate rounded cards sitting next to each other.
  pageSlotLeft: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  pageSlotRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  spineHalf: {
    flex: 1,
    height: '100%',
  },
  ghostPage: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(240,233,216,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,216,0.03)',
  },
  ghostText: {
    color: 'rgba(240,233,216,0.4)',
    fontSize: 15,
    fontStyle: 'italic',
  },
});
