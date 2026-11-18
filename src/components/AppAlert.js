import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export default function AppAlert({ visible, title, message, buttons, onRequestClose }) {
  const list = buttons && buttons.length ? buttons : [{ text: 'OK' }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.buttonsColumn}>
            {list.map((b, i) => (
              <Pressable
                key={i}
                style={[styles.button, i > 0 && styles.buttonDivider]}
                onPress={() => {
                  onRequestClose();
                  b.onPress?.();
                }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    b.style === 'destructive' && styles.destructiveText,
                    b.style === 'cancel' && styles.cancelText,
                  ]}
                >
                  {b.text}
                </Text>
              </Pressable>
            ))}
          </View>
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
    maxWidth: 320,
    backgroundColor: '#28292b',
    borderRadius: 14,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  title: {
    color: '#f2f2f2',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonsColumn: {
    marginTop: 20,
    marginHorizontal: -20,
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  buttonText: {
    color: '#e0a92f',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  destructiveText: {
    color: '#e0605a',
  },
});
