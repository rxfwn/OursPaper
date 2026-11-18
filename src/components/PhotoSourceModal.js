import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export default function PhotoSourceModal({ visible, onClose, onPickGallery, onPickCamera }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.heading}>Ajouter une photo</Text>
          <Pressable
            style={styles.option}
            onPress={() => {
              onClose();
              onPickGallery();
            }}
          >
            <Text style={styles.optionIcon}>🖼️</Text>
            <Text style={styles.optionLabel}>Galerie</Text>
          </Pressable>
          <Pressable
            style={styles.option}
            onPress={() => {
              onClose();
              onPickCamera();
            }}
          >
            <Text style={styles.optionIcon}>📷</Text>
            <Text style={styles.optionLabel}>Caméra</Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={10} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
    maxWidth: 320,
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
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionLabel: {
    color: '#f2f2f2',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 8,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
