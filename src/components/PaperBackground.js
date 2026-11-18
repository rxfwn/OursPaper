import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const CORNER_RADIUS = 12;

export default function PaperBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <LinearGradient
        colors={['#f0ece3', '#f8f5ee']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.edgeShadow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: CORNER_RADIUS,
    overflow: 'hidden',
  },
  edgeShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '12%',
  },
});
