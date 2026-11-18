import React from 'react';
import { Pressable, Text, Image, StyleSheet } from 'react-native';

export default function CircleButton({ icon, image, onPress, onLongPress, active, accent, disabled, size = 52 }) {
  const isAccent = active || accent;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={10}
      style={[styles.button, { width: size, height: size }, disabled && styles.buttonDisabled]}
    >
      {image ? (
        <Image
          source={image}
          style={{ width: size * 0.64, height: size * 0.64, opacity: isAccent ? 1 : 0.9 }}
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.icon, { fontSize: size * 0.5 }, isAccent && styles.iconAccent]}>{icon}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  icon: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '300',
  },
  iconAccent: {
    color: '#e0a92f',
  },
});
