import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { PAGE_BG_COLORS } from '../theme/pageBackgrounds';
import ColorPicker from './ColorPicker';

const TARGETS = [
  ['left', 'Page gauche'],
  ['right', 'Page droite'],
  ['both', 'Les deux'],
];

export default function BackgroundPicker({
  visible,
  currentLeft,
  currentRight,
  onClose,
  onChange,
  onPickImage,
  photoBank = [],
  showTargets = true,
}) {
  const [target, setTarget] = useState('left');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorAnchor, setColorAnchor] = useState(null);
  const [pendingColor, setPendingColor] = useState(null);
  const colorButtonRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTarget('left');
      setPendingColor(null);
    }
  }, [visible]);

  const current = target === 'right' ? currentRight : currentLeft;

  const handlePickColor = (value) => onChange({ type: 'color', value }, target);
  const handlePickBankImage = (item) => onChange({ type: 'image', uri: item.uri }, target);

  const handleImportPress = async () => {
    const uri = await onPickImage();
    if (uri) onChange({ type: 'image', uri }, target);
  };

  // The wheel fires onChange continuously while dragging — only the color
  // it settles on when closed counts as an actual pick, same rule as the
  // draw and text color pickers, otherwise every drag tick would save.
  const openColorPicker = () => {
    colorButtonRef.current?.measureInWindow((x, y, width, height) => {
      setColorAnchor({ x, y, width, height });
      setColorPickerOpen(true);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.heading}>Fond de page</Text>

          {showTargets && (
            <View style={styles.targetRow}>
              {TARGETS.map(([id, label]) => (
                <Pressable
                  key={id}
                  onPress={() => setTarget(id)}
                  style={[styles.targetOption, target === id && styles.targetOptionActive]}
                >
                  <Text style={[styles.targetText, target === id && styles.targetTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.swatchGrid}>
            {PAGE_BG_COLORS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => handlePickColor(c.value)}
                style={[
                  styles.swatch,
                  { backgroundColor: c.value },
                  current?.type === 'color' && current.value === c.value && styles.swatchActive,
                ]}
              />
            ))}
            <Pressable ref={colorButtonRef} style={styles.wheelSwatch} onPress={openColorPicker}>
              <Text style={styles.wheelSwatchText}>+</Text>
            </Pressable>
          </View>

          {photoBank.length > 0 && (
            <>
              <Text style={styles.subheading}>Banque de photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankRow}>
                {photoBank.map((item) => (
                  <Pressable key={item.id} onPress={() => handlePickBankImage(item)} style={styles.bankTile}>
                    <Image source={{ uri: item.uri }} style={styles.bankImage} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <Pressable style={styles.importButton} onPress={handleImportPress}>
            <Text style={styles.importText}>
              {current?.type === 'image' ? 'Changer la photo de fond' : 'Importer une photo'}
            </Text>
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable onPress={() => onChange(null, target)} hitSlop={10}>
              <Text style={styles.removeText}>Retirer le fond</Text>
            </Pressable>
            <Pressable style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneText}>Fermer</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>

      <ColorPicker
        visible={colorPickerOpen}
        anchor={colorAnchor}
        value={pendingColor || current?.value || '#f4efe3'}
        onChange={setPendingColor}
        onClose={() => {
          if (pendingColor) handlePickColor(pendingColor);
          setPendingColor(null);
          setColorPickerOpen(false);
        }}
        recentColors={[]}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: '#28292b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  heading: {
    color: '#f2f2f2',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  targetOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  targetOptionActive: {
    backgroundColor: 'rgba(224,169,47,0.18)',
    borderColor: '#e0a92f',
  },
  targetText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  targetTextActive: {
    color: '#e0a92f',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  swatchActive: {
    borderColor: '#e0a92f',
  },
  wheelSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSwatchText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '600',
  },
  subheading: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginTop: 18,
    marginBottom: 8,
  },
  bankRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bankTile: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bankImage: {
    width: '100%',
    height: '100%',
  },
  importButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  importText: {
    color: '#f2f2f2',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 22,
  },
  removeText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
  doneButton: {
    backgroundColor: '#e0a92f',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 18,
  },
  doneText: {
    color: '#201c18',
    fontSize: 14,
    fontWeight: '600',
  },
});
