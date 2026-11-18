import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BG_THEMES } from '../theme/backgroundThemes';

export default function AmbientBackground({ themeIndex = 0 }) {
  const theme = BG_THEMES[themeIndex] || BG_THEMES[0];

  return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.mid }]} pointerEvents="none" />;
}
