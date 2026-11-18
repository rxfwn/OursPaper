import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { STICKER_CATEGORIES, WASHI_TAPES } from '../theme/stickers';

const TABS = [
  ...STICKER_CATEGORIES.map((c) => ({ id: c.id, label: c.label, kind: 'emoji', items: c.emojis })),
  { id: 'washi', label: 'Washi tape', kind: 'tape', items: WASHI_TAPES },
];

export default function StickerPickerModal({ visible, initialTab, onClose, onSelect }) {
  const [tabId, setTabId] = useState(TABS[0].id);

  useEffect(() => {
    if (visible && initialTab && TABS.some((t) => t.id === initialTab)) {
      setTabId(initialTab);
    }
  }, [visible, initialTab]);

  const tab = TABS.find((t) => t.id === tabId) || TABS[0];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.heading}>Décoration</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {TABS.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTabId(t.id)}
                style={[styles.tab, tabId === t.id && styles.tabActive]}
              >
                <Text style={[styles.tabText, tabId === t.id && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.grid}>
            {tab.kind === 'emoji'
              ? tab.items.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={styles.emojiButton}
                    onPress={() => onSelect({ kind: 'emoji', emoji })}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </Pressable>
                ))
              : tab.items.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[styles.tapeButton, { backgroundColor: t.color }]}
                    onPress={() => onSelect({ kind: 'tape', color: t.color, pattern: t.pattern })}
                  />
                ))}
          </View>

          <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
            <Text style={styles.closeText}>Fermer</Text>
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
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: '#28292b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heading: {
    color: '#f2f2f2',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: {
    backgroundColor: 'rgba(224,169,47,0.18)',
    borderColor: '#e0a92f',
  },
  tabText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#e0a92f',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  emojiButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  tapeButton: {
    width: 64,
    height: 30,
    borderRadius: 4,
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 18,
  },
  closeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
