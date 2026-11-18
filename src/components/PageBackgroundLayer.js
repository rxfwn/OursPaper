import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import PaperBackground from './PaperBackground';

const CORNER_RADIUS = 12;

// Each page always shows its OWN full background — "left/right/both" is
// decided once, at the moment the background is set (which page index(es)
// get written to), not here. This used to try to render half of a wide
// image per page based on a spread flag, but with no way to know which
// side it was on, "half" just meant "half of this one page", which is why
// it looked broken (a page split in two instead of a clean fill).
export default function PageBackgroundLayer({ background }) {
  if (!background) return <PaperBackground />;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <PaperBackground />
      <View style={styles.fillClip}>
        {background.type === 'image' ? (
          <Image source={{ uri: background.uri }} style={styles.fill} resizeMode="cover" />
        ) : (
          <View style={[styles.fill, { backgroundColor: background.value }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  fillClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CORNER_RADIUS,
    overflow: 'hidden',
  },
});
