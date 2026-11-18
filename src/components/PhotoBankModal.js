import React from 'react';
import { View, Text, Image, Pressable, Modal, FlatList, StyleSheet } from 'react-native';

const TILE_SIZE = 84;

export default function PhotoBankModal({ visible, items, onClose, onAddNew, onSelect, onRemove }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.heading}>Banque de photos</Text>
          <Text style={styles.hint}>Touche pour poser sur la page · appui long pour retirer</Text>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.row}
            style={styles.grid}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune photo enregistrée pour l'instant.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={styles.tile}
                onPress={() => onSelect(item)}
                onLongPress={() => onRemove(item.id)}
              >
                <Image source={{ uri: item.uri }} style={styles.tileImage} resizeMode="cover" />
              </Pressable>
            )}
          />
          <View style={styles.actionsRow}>
            <Pressable style={styles.addButton} onPress={onAddNew}>
              <Text style={styles.addButtonText}>+ Ajouter à la banque</Text>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>Fermer</Text>
            </Pressable>
          </View>
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
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#28292b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heading: {
    color: '#f2f2f2',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  grid: {
    flexGrow: 0,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  addButton: {
    backgroundColor: '#e0a92f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  addButtonText: {
    color: '#201c18',
    fontSize: 14,
    fontWeight: '600',
  },
  closeText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
  },
});
