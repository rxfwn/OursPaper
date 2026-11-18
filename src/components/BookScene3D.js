import React from 'react';
import { View, StyleSheet } from 'react-native';

// Native (iOS/Android) fallback — the Three.js 3D book view is web-only for
// now (see BookScene3D.web.js, picked automatically by Metro on web builds);
// this keeps native bundling working without pulling in three.js/
// @react-three/fiber, which aren't wired up for native yet.
export default function BookScene3D() {
  return <View style={styles.fill} />;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
