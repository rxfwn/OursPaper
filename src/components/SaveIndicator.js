import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const LABELS = {
  saving: 'Enregistrement…',
  saved: 'Enregistré',
  error: 'Non sauvegardé',
};

export default function SaveIndicator({ status, topInset = 12 }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(status === 'idle' ? 0 : 1, { duration: 200 });
  }, [status, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[styles.wrapper, { top: topInset }]} pointerEvents="none">
      <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
        <View style={[styles.dot, status === 'saved' && styles.dotSaved, status === 'error' && styles.dotError]} />
        <Text style={styles.text}>{LABELS[status] || ''}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    zIndex: 500,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(28,24,20,0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#e0a92f',
  },
  dotSaved: {
    backgroundColor: '#5fae7a',
  },
  dotError: {
    backgroundColor: '#c94f4f',
  },
  text: {
    color: '#f2e9d8',
    fontSize: 12,
    fontWeight: '600',
  },
});
