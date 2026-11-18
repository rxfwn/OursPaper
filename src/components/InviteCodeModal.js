import React from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native';

const DIGIT_FONT = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

export default function InviteCodeModal({ visible, code, loading, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.heading}>Code de votre espace</Text>
          <Text style={styles.hint}>
            Entre ce code sur un autre appareil pour le lier au même espace partagé.
          </Text>
          {loading ? (
            <ActivityIndicator color="#e0a92f" style={styles.loader} />
          ) : (
            <Text style={styles.code}>{code}</Text>
          )}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
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
    maxWidth: 340,
    backgroundColor: '#28292b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heading: {
    color: '#f2f2f2',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  loader: {
    marginVertical: 22,
  },
  code: {
    color: '#e0a92f',
    fontFamily: DIGIT_FONT,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    marginVertical: 22,
  },
  closeButton: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeText: {
    color: '#f2f2f2',
    fontSize: 15,
    fontWeight: '600',
  },
});
