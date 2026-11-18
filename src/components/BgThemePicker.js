import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { BG_THEMES } from '../theme/backgroundThemes';

export default function BgThemePicker({ themeIndex, onChange, style }) {
  const [open, setOpen] = useState(false);
  const current = BG_THEMES[themeIndex] || BG_THEMES[0];

  return (
    <View style={[styles.container, style]}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.swatchButton} hitSlop={10}>
        <Image
          source={require('../../assets/artist-palette_1f3a8.png')}
          style={styles.swatchIcon}
          resizeMode="contain"
        />
      </Pressable>
      {open && (
        <View style={styles.panel}>
          <View style={styles.grid}>
            {BG_THEMES.map((t, i) => (
              <Pressable
                key={t.name}
                onPress={() => {
                  onChange(i);
                  setOpen(false);
                }}
                style={[
                  styles.swatch,
                  { backgroundColor: t.swatch },
                  i === themeIndex && styles.swatchActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.themeName}>{current.name}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 400,
  },
  swatchButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchIcon: {
    width: 26,
    height: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  panel: {
    position: 'absolute',
    top: 44,
    left: 0,
    backgroundColor: 'rgba(20,20,24,0.92)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 168,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: '#fff',
  },
  themeName: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.3,
  },
});
