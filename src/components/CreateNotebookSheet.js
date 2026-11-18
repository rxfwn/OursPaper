import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet, Platform } from 'react-native';
import { createNotebook, createBlankPage, createDesign } from '../data/factories';
import { useAppAlert } from '../utils/useAppAlert';
import { maskDateInput, parseDateInput, formatDateForInput, daysBetweenInclusive, addDays } from '../utils/dateInput';
import AppAlert from './AppAlert';
import CoverEditorModal from './CoverEditorModal';
import PageCanvas from './PageCanvas';
import {
  REVEAL_WIDTH,
  SPINE_HEIGHT,
  MAX_DAYS,
  spineWidthFor,
  COVER_LEFT_CORNER_RADIUS,
  COVER_RIGHT_CORNER_RADIUS,
  SPINE_CORNER_RADIUS,
} from '../theme/notebookDimensions';

const DIGIT_FONT = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});
const COVER_TILE_W = 110;
const COVER_TILE_H = 140;
const SPINE_TILE_W = 40;
const SPINE_TILE_H = 140;
const NOOP_UPDATE = (fn) => fn;

export default function CreateNotebookSheet({
  visible,
  mode = 'create',
  initialNotebook,
  onCancel,
  onCreate,
  onSave,
  photoBank,
  onAddToPhotoBank,
  onRemoveFromPhotoBank,
}) {
  const isEdit = mode === 'edit';
  const [name, setName] = useState('');
  const [coverDesign, setCoverDesign] = useState(createDesign());
  const [spineDesign, setSpineDesign] = useState(createDesign());
  const [startDateText, setStartDateText] = useState(formatDateForInput(Date.now()));
  const [endDateText, setEndDateText] = useState(formatDateForInput(Date.now()));
  const [editorTab, setEditorTab] = useState(null);
  const { alertProps, showAlert } = useAppAlert();

  useEffect(() => {
    if (visible) {
      setName(initialNotebook?.name || '');
      setCoverDesign(initialNotebook?.coverDesign || createDesign());
      setSpineDesign(initialNotebook?.spineDesign || createDesign());
      const initialDateText = formatDateForInput(initialNotebook?.date || Date.now());
      setStartDateText(initialDateText);
      setEndDateText(initialDateText);
    }
  }, [visible, initialNotebook]);

  const handleCancel = () => onCancel();

  const startDate = parseDateInput(startDateText);
  const endDate = parseDateInput(endDateText);
  const dayCount = startDate && endDate ? daysBetweenInclusive(startDate.getTime(), endDate.getTime()) : null;

  // The spine's real width depends on how many pages the notebook will have
  // — same formula the shelf uses (see notebookDimensions), just against a
  // fixed 1..MAX_DAYS range instead of the other notebooks currently on the
  // shelf, since at design time there may be no other notebooks to compare
  // against yet.
  const pageCountForSpine = isEdit
    ? initialNotebook?.pages?.length || 1
    : Math.max(1, Math.min(dayCount || 1, MAX_DAYS));
  const spineWidth = spineWidthFor(pageCountForSpine, 1, MAX_DAYS);

  const handleSubmit = () => {
    if (isEdit) {
      if (!startDate) {
        showAlert('Date invalide', 'Format attendu : JJ/MM/AAAA.');
        return;
      }
      onSave({
        name: name.trim() || 'Sans titre',
        coverDesign,
        spineDesign,
        date: startDate.getTime(),
        sortOrder: startDate.getTime(),
      });
      return;
    }
    if (!dayCount || dayCount < 1) {
      showAlert(
        'Dates invalides',
        'Renseigne une date de début et une date de fin (JJ/MM/AAAA), la fin après le début.'
      );
      return;
    }
    const count = Math.min(dayCount, MAX_DAYS);
    const tripDate = startDate.getTime();
    const pages = Array.from({ length: count }, (_, i) => createBlankPage(addDays(tripDate, i)));
    onCreate(createNotebook({ name, coverDesign, spineDesign, pages, tripDate }));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.heading}>{isEdit ? 'Modifier le carnet' : 'Nouveau carnet'}</Text>

          <Text style={styles.label}>Nom du carnet</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nos vacances, notre appart…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            textAlign="center"
            autoFocus
          />

          <View style={styles.coversRow}>
            <View style={styles.coverColumn}>
              <Text style={styles.label}>Couverture</Text>
              <Pressable style={styles.coverTile} onPress={() => setEditorTab('cover')}>
                <View style={styles.previewClip}>
                  <View
                    style={{
                      width: REVEAL_WIDTH,
                      height: SPINE_HEIGHT,
                      transform: [{ scale: Math.min(COVER_TILE_W / REVEAL_WIDTH, COVER_TILE_H / SPINE_HEIGHT) }],
                    }}
                  >
                    <PageCanvas
                      page={coverDesign}
                      pageSize={{ width: REVEAL_WIDTH, height: SPINE_HEIGHT }}
                      onUpdatePage={NOOP_UPDATE}
                      interactive={false}
                    />
                  </View>
                </View>
              </Pressable>
            </View>
            <View style={styles.coverColumn}>
              <Text style={styles.label}>Tranche</Text>
              <Pressable style={styles.spineTile} onPress={() => setEditorTab('spine')}>
                <View style={styles.previewClip}>
                  <View
                    style={{
                      width: spineWidth,
                      height: SPINE_HEIGHT,
                      transform: [{ scale: Math.min(SPINE_TILE_W / spineWidth, SPINE_TILE_H / SPINE_HEIGHT) }],
                    }}
                  >
                    <PageCanvas
                      page={spineDesign}
                      pageSize={{ width: spineWidth, height: SPINE_HEIGHT }}
                      onUpdatePage={NOOP_UPDATE}
                      interactive={false}
                    />
                  </View>
                </View>
              </Pressable>
              <Text style={styles.sizeHint}>Largeur réelle selon le nb de pages</Text>
            </View>
          </View>
          <Pressable style={styles.designButton} onPress={() => setEditorTab('cover')}>
            <Text style={styles.designButtonText}>Concevoir la couverture et la tranche</Text>
          </Pressable>

          <Text style={styles.label}>Dates du carnet</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateFieldLabel}>Du</Text>
              <TextInput
                style={styles.dateInput}
                value={startDateText}
                onChangeText={(t) => setStartDateText(maskDateInput(t))}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateFieldLabel}>Au</Text>
              <TextInput
                style={styles.dateInput}
                value={endDateText}
                onChangeText={(t) => setEndDateText(maskDateInput(t))}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>
          {!isEdit ? (
            <Text style={styles.dayCountHint}>
              {dayCount && dayCount > 0
                ? `→ ${Math.min(dayCount, MAX_DAYS)} ${dayCount === 1 ? 'page' : 'pages'}${dayCount > MAX_DAYS ? ` (max ${MAX_DAYS})` : ''}`
                : 'Une page sera créée pour chaque jour'}
            </Text>
          ) : (
            <Text style={styles.dayCountHint}>Détermine le tri et l'année du carnet sur l'étagère.</Text>
          )}

          <View style={styles.actionsRow}>
            <Pressable onPress={handleCancel} hitSlop={10}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable style={styles.createButton} onPress={handleSubmit}>
              <Text style={styles.createText}>{isEdit ? 'Enregistrer' : 'Créer'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <CoverEditorModal
        visible={!!editorTab}
        initialTab={editorTab || 'cover'}
        initialCoverDesign={coverDesign}
        initialSpineDesign={spineDesign}
        spineWidth={spineWidth}
        onSave={({ coverDesign: cd, spineDesign: sd }) => {
          setCoverDesign(cd);
          setSpineDesign(sd);
          setEditorTab(null);
        }}
        photoBank={photoBank}
        onAddToPhotoBank={onAddToPhotoBank}
        onRemoveFromPhotoBank={onRemoveFromPhotoBank}
      />

      <AppAlert {...alertProps} />
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
    backgroundColor: '#28292b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  heading: {
    color: '#f2f2f2',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  input: {
    color: '#f2f2f2',
    fontSize: 17,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 6,
    width: '100%',
    textAlign: 'center',
  },
  coversRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  coverColumn: {
    alignItems: 'center',
  },
  coverTile: {
    width: COVER_TILE_W,
    height: COVER_TILE_H,
    borderTopLeftRadius: COVER_LEFT_CORNER_RADIUS,
    borderBottomLeftRadius: COVER_LEFT_CORNER_RADIUS,
    borderTopRightRadius: COVER_RIGHT_CORNER_RADIUS,
    borderBottomRightRadius: COVER_RIGHT_CORNER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spineTile: {
    width: SPINE_TILE_W,
    height: SPINE_TILE_H,
    borderRadius: SPINE_CORNER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewClip: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sizeHint: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: DIGIT_FONT,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  designButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  designButtonText: {
    color: '#f2f2f2',
    fontSize: 13,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 20,
  },
  dateField: {
    alignItems: 'center',
  },
  dateFieldLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateInput: {
    color: '#f2f2f2',
    fontFamily: DIGIT_FONT,
    fontSize: 16,
    width: 118,
    paddingVertical: 4,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  dayCountHint: {
    color: 'rgba(224,169,47,0.85)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 24,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
  },
  createButton: {
    backgroundColor: '#e0a92f',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
  },
  createText: {
    color: '#201c18',
    fontSize: 15,
    fontWeight: '600',
  },
});
