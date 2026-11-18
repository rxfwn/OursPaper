import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

// Native approximation of the web die-cut sticker (see StickerFace.web.js):
// native Text can't run SVG filters, so the border is a soft text shadow in
// the material's color and the drop shadow comes from the wrapper.
const BORDER_COLOR = {
  paper: '#fffdf6',
  gloss: '#ffffff',
  holo: '#d9c8ff',
  glitter: '#c4c7d2',
};

export default function StickerFace({ emoji, material = 'paper', box = 48, fontSize, lifted = false }) {
  return (
    <View
      style={[
        styles.wrap,
        { width: box, height: box },
        lifted ? styles.lifted : styles.rest,
      ]}
      pointerEvents="none"
    >
      <Text
        style={{
          fontSize: fontSize ?? box * 0.8,
          textShadowColor: BORDER_COLOR[material] || BORDER_COLOR.paper,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: Math.max(3, box * 0.09),
        }}
      >
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#28190a',
  },
  rest: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  lifted: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
});
