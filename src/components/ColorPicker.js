import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { hsvToHex, hexToHsv } from '../utils/color';

const SQUARE_W = 260;
const SQUARE_H = 170;
const HUE_H = 22;
const HUE_STOPS = Array.from({ length: 13 }, (_, i) => hsvToHex(i * 30, 1, 1));
const CARD_WIDTH = 300;
const CARD_HEIGHT_ESTIMATE = 480;
const ANCHOR_GAP = 14;

function SVSquare({ hue, s, v, onPick }) {
  const pureHue = hsvToHex(hue, 1, 1);
  const knobX = s * SQUARE_W;
  const knobY = (1 - v) * SQUARE_H;

  const pick = (x, y) => {
    const cx = Math.min(SQUARE_W, Math.max(0, x));
    const cy = Math.min(SQUARE_H, Math.max(0, y));
    onPick(cx / SQUARE_W, 1 - cy / SQUARE_H);
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => runOnJS(pick)(e.x, e.y))
    .onUpdate((e) => runOnJS(pick)(e.x, e.y));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.square}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: pureHue }]} />
        <LinearGradient
          colors={['#ffffff', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[styles.knob, { left: knobX - 9, top: knobY - 9 }]} />
      </View>
    </GestureDetector>
  );
}

function HueSlider({ hue, onPick }) {
  const knobX = (hue / 360) * SQUARE_W;

  const pick = (x) => {
    const cx = Math.min(SQUARE_W, Math.max(0, x));
    onPick((cx / SQUARE_W) * 360);
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => runOnJS(pick)(e.x))
    .onUpdate((e) => runOnJS(pick)(e.x));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.hueTrack}>
        <LinearGradient
          colors={HUE_STOPS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[styles.hueKnob, { left: knobX - HUE_H / 2 }]} />
      </View>
    </GestureDetector>
  );
}

export default function ColorPicker({ visible, anchor, value, onChange, onClose, recentColors = [] }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hexText, setHexText] = useState(value);
  const { width: winW, height: winH } = useWindowDimensions();

  useEffect(() => {
    if (visible) {
      setHsv(hexToHsv(value));
      setHexText(value);
    }
  }, [visible, value]);

  const commit = (h, s, v) => {
    setHsv({ h, s, v });
    const hex = hsvToHex(h, s, v);
    setHexText(hex);
    onChange(hex);
  };

  const handleHexSubmit = () => {
    const clean = hexText.startsWith('#') ? hexText : `#${hexText}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      commit(hexToHsv(clean).h, hexToHsv(clean).s, hexToHsv(clean).v);
    } else {
      setHexText(hsvToHex(hsv.h, hsv.s, hsv.v));
    }
  };

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  // Anchored to the button's actual on-screen position instead of centered —
  // pops out from wherever the button actually is, like a real popover, not
  // a dialog interrupting the whole page. The toolbar can be docked on
  // either side or along the bottom depending on platform, so which way the
  // popover opens is decided from the anchor's position each time rather
  // than assumed.
  let popoverStyle = null;
  if (anchor) {
    const openLeft = anchor.x + anchor.width / 2 > winW / 2;
    const openAbove = anchor.y + anchor.height / 2 > winH / 2;
    popoverStyle = {
      position: 'absolute',
      left: Math.max(
        12,
        Math.min(
          winW - CARD_WIDTH - 12,
          openLeft ? anchor.x - CARD_WIDTH - ANCHOR_GAP : anchor.x + anchor.width + ANCHOR_GAP
        )
      ),
      top: Math.max(
        12,
        Math.min(
          winH - CARD_HEIGHT_ESTIMATE - 12,
          openAbove ? anchor.y - CARD_HEIGHT_ESTIMATE - ANCHOR_GAP : anchor.y + anchor.height + ANCHOR_GAP
        )
      ),
    };
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, popoverStyle]} onPress={() => {}}>
          <Text style={styles.heading}>Couleur</Text>

          <SVSquare hue={hsv.h} s={hsv.s} v={hsv.v} onPick={(s, v) => commit(hsv.h, s, v)} />
          <HueSlider hue={hsv.h} onPick={(h) => commit(h, hsv.s, hsv.v)} />

          <View style={styles.previewRow}>
            <View style={[styles.previewCircle, { backgroundColor: currentHex }]} />
            <TextInput
              style={styles.hexInput}
              value={hexText}
              onChangeText={setHexText}
              onSubmitEditing={handleHexSubmit}
              onBlur={handleHexSubmit}
              autoCapitalize="none"
              maxLength={7}
            />
          </View>

          {recentColors.length > 0 && (
            <View style={styles.recentGrid}>
              {recentColors.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => commit(hexToHsv(c).h, hexToHsv(c).s, hexToHsv(c).v)}
                  style={[styles.recentSwatch, { backgroundColor: c }]}
                />
              ))}
            </View>
          )}

          <Pressable style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneText}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#28292b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  heading: {
    color: '#f2f2f2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  square: {
    width: SQUARE_W,
    height: SQUARE_H,
    borderRadius: 12,
    overflow: 'hidden',
  },
  knob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  hueTrack: {
    width: SQUARE_W,
    height: HUE_H,
    borderRadius: HUE_H / 2,
    overflow: 'hidden',
    marginTop: 14,
  },
  hueKnob: {
    position: 'absolute',
    top: 0,
    width: HUE_H,
    height: HUE_H,
    borderRadius: HUE_H / 2,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    width: SQUARE_W,
  },
  previewCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  hexInput: {
    flex: 1,
    color: '#f2f2f2',
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    width: SQUARE_W,
  },
  recentSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  doneButton: {
    marginTop: 18,
    backgroundColor: '#e0a92f',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
  },
  doneText: {
    color: '#201c18',
    fontSize: 15,
    fontWeight: '600',
  },
});
