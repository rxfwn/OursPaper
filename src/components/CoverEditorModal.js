import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageCanvas from './PageCanvas';
import Toolbar from './Toolbar';
import BackgroundPicker from './BackgroundPicker';
import PhotoBankModal from './PhotoBankModal';
import PhotoSourceModal from './PhotoSourceModal';
import StickerPickerModal from './StickerPickerModal';
import AppAlert from './AppAlert';
import { useAppAlert } from '../utils/useAppAlert';
import { createDesign } from '../data/factories';
import { generateId } from '../utils/id';
import { pickPersistentImage, capturePersistentPhoto } from '../utils/imagePicker';
import { DRAW_TOOLS } from '../theme/drawTools';
import { REVEAL_WIDTH, SPINE_HEIGHT } from '../theme/notebookDimensions';

const DEFAULT_DRAW_COLOR = '#2b2b2b';
const DEFAULT_TEXT_COLOR = '#ffc700';
const RECENT_COLORS_LIMIT = 11;
const HISTORY_LIMIT = 10;
const COVER_SIZE = { width: REVEAL_WIDTH, height: SPINE_HEIGHT };

// The workspace for each tab is the notebook's real on-shelf size (the same
// REVEAL_WIDTH/SPINE_HEIGHT the shelf uses for the open cover, and the same
// page-count-derived spine width) — designing at that exact size means
// there's no separate preview scale to translate later, what's built here
// is pixel-for-pixel what shows up on the shelf.
export default function CoverEditorModal({
  visible,
  initialTab = 'cover',
  initialCoverDesign,
  initialSpineDesign,
  spineWidth,
  onSave,
  photoBank,
  onAddToPhotoBank,
  onRemoveFromPhotoBank,
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('cover');
  const [coverDesign, setCoverDesign] = useState(createDesign());
  const [spineDesign, setSpineDesign] = useState(createDesign());
  const [drawing, setDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState(DEFAULT_DRAW_COLOR);
  const [recentColors, setRecentColors] = useState([]);
  const [drawTool, setDrawTool] = useState('pencil');
  const [sizeIndex, setSizeIndex] = useState(1);
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [photoBankOpen, setPhotoBankOpen] = useState(false);
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickerInitialTab, setStickerInitialTab] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const { alertProps, showAlert } = useAppAlert();

  useEffect(() => {
    if (!visible) return;
    setTab(initialTab || 'cover');
    setCoverDesign(initialCoverDesign || createDesign());
    setSpineDesign(initialSpineDesign || createDesign());
    setDrawing(false);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    // Only re-run when the modal actually opens — initialTab/initialCoverDesign
    // etc. are snapshot inputs at open time, not live props to track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleColorUsed = useCallback((color) => {
    setRecentColors((prev) => [color, ...prev.filter((c) => c !== color)].slice(0, RECENT_COLORS_LIMIT));
  }, []);

  const activeSize = tab === 'cover' ? COVER_SIZE : { width: spineWidth, height: SPINE_HEIGHT };
  const activeDesign = tab === 'cover' ? coverDesign : spineDesign;
  const activeTool = DRAW_TOOLS.find((t) => t.id === drawTool) || DRAW_TOOLS[0];
  const erasing = drawTool === 'eraser';
  const strokeWidth = activeTool.sizes[sizeIndex];
  const strokeOpacity = activeTool.opacity;

  const updateDesign = useCallback(
    (updater, { skipHistory = false } = {}) => {
      const setter = tab === 'cover' ? setCoverDesign : setSpineDesign;
      const currentTab = tab;
      setter((d) => {
        if (!skipHistory) {
          undoStackRef.current = [...undoStackRef.current, { tab: currentTab, design: d }].slice(-HISTORY_LIMIT);
          redoStackRef.current = [];
          setCanUndo(true);
          setCanRedo(false);
        }
        return updater(d);
      });
    },
    [tab]
  );

  const handleUndo = useCallback(() => {
    const entry = undoStackRef.current[undoStackRef.current.length - 1];
    if (!entry) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    const setter = entry.tab === 'cover' ? setCoverDesign : setSpineDesign;
    setter((current) => {
      redoStackRef.current = [...redoStackRef.current, { tab: entry.tab, design: current }].slice(-HISTORY_LIMIT);
      return entry.design;
    });
    setTab(entry.tab);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const handleRedo = useCallback(() => {
    const entry = redoStackRef.current[redoStackRef.current.length - 1];
    if (!entry) return;
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    const setter = entry.tab === 'cover' ? setCoverDesign : setSpineDesign;
    setter((current) => {
      undoStackRef.current = [...undoStackRef.current, { tab: entry.tab, design: current }].slice(-HISTORY_LIMIT);
      return entry.design;
    });
    setTab(entry.tab);
    setCanRedo(redoStackRef.current.length > 0);
    setCanUndo(true);
  }, []);

  const placePhoto = useCallback(
    (uri, naturalWidth, naturalHeight) => {
      const w = activeSize.width;
      const h = activeSize.height;
      const aspect = naturalWidth && naturalHeight ? naturalHeight / naturalWidth : 1;
      const maxWidth = w * 0.8;
      const maxHeight = h * 0.55;
      let targetWidth = maxWidth;
      let targetHeight = targetWidth * aspect;
      if (targetHeight > maxHeight) {
        targetHeight = maxHeight;
        targetWidth = targetHeight / aspect;
      }
      const photo = {
        id: generateId(),
        uri,
        widthFrac: targetWidth / w,
        heightFrac: targetHeight / h,
        xFrac: 0.5,
        yFrac: 0.5,
        rotation: 0,
        scale: 1,
        z: Date.now(),
      };
      updateDesign((d) => ({ ...d, photos: [...d.photos, photo] }));
    },
    [activeSize, updateDesign]
  );

  const handleAddPhotoFrom = useCallback(
    async (picker, deniedMessage) => {
      const picked = await picker();
      if (!picked.granted) {
        showAlert('Accès refusé', deniedMessage);
        return;
      }
      if (picked.canceled) return;
      const { asset, uri } = picked;
      placePhoto(uri, asset.width, asset.height);
    },
    [placePhoto, showAlert]
  );

  const handleAddPhoto = useCallback(
    () => handleAddPhotoFrom(pickPersistentImage, "Autorise l'accès à tes photos dans les réglages pour en coller ici."),
    [handleAddPhotoFrom]
  );

  const handleCapturePhoto = useCallback(
    () => handleAddPhotoFrom(capturePersistentPhoto, "Autorise l'accès à la caméra dans les réglages pour prendre une photo."),
    [handleAddPhotoFrom]
  );

  const handleAddToPhotoBank = useCallback(async () => {
    const picked = await pickPersistentImage();
    if (!picked.granted) {
      showAlert('Accès aux photos refusé', "Autorise l'accès à tes photos dans les réglages pour les ajouter à la banque.");
      return;
    }
    if (picked.canceled) return;
    const { asset, uri } = picked;
    await onAddToPhotoBank?.({ uri, width: asset.width, height: asset.height });
  }, [onAddToPhotoBank, showAlert]);

  const handleInsertFromBank = useCallback((item) => placePhoto(item.uri, item.width, item.height), [placePhoto]);

  const handleSetBackground = useCallback(
    (bg) => updateDesign((d) => ({ ...d, background: bg })),
    [updateDesign]
  );

  const handlePickBackgroundImage = useCallback(async () => {
    const picked = await pickPersistentImage();
    if (!picked.granted) {
      showAlert('Accès aux photos refusé', "Autorise l'accès à tes photos pour choisir un fond.");
      return null;
    }
    if (picked.canceled) return null;
    return picked.uri;
  }, [showAlert]);

  const handleAddText = useCallback(() => {
    const text = {
      id: generateId(),
      text: '',
      color: DEFAULT_TEXT_COLOR,
      xFrac: 0.5,
      yFrac: 0.5,
      rotation: 0,
      z: Date.now(),
    };
    updateDesign((d) => ({ ...d, texts: [...d.texts, text] }));
  }, [updateDesign]);

  const handleAddSticker = useCallback(
    (payload) => {
      const sticker = {
        id: generateId(),
        kind: payload.kind,
        emoji: payload.emoji,
        source: payload.source,
        color: payload.color,
        pattern: payload.pattern,
        xFrac: 0.5,
        yFrac: 0.5,
        rotation: payload.kind === 'tape' ? (Math.random() - 0.5) * 0.35 : 0,
        scale: 1,
        z: Date.now(),
      };
      updateDesign((d) => ({ ...d, stickers: [...(d.stickers || []), sticker] }));
    },
    [updateDesign]
  );

  // Both the corner arrow and "Terminé" close the editor by handing the
  // current designs back — there's no separate silent-discard affordance,
  // so the arrow closing without saving read as "my edits vanished" rather
  // than an intentional cancel.
  const handleSave = () => {
    onSave({ coverDesign, spineDesign });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleSave}>
      <View style={styles.container}>
        <Pressable onPress={handleSave} hitSlop={14} style={[styles.backButton, { top: insets.top + 18 }]}>
          <Text style={styles.backChevron}>←</Text>
        </Pressable>

        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Concevoir le carnet</Text>
          <View style={styles.tabRow}>
            <Pressable onPress={() => setTab('cover')} style={[styles.tabBtn, tab === 'cover' && styles.tabBtnActive]}>
              <Text style={[styles.tabText, tab === 'cover' && styles.tabTextActive]}>Couverture</Text>
            </Pressable>
            <Pressable onPress={() => setTab('spine')} style={[styles.tabBtn, tab === 'spine' && styles.tabBtnActive]}>
              <Text style={[styles.tabText, tab === 'spine' && styles.tabTextActive]}>Tranche</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.canvasArea}>
          <View style={[styles.canvasFrame, { width: activeSize.width, height: activeSize.height }]}>
            <PageCanvas
              page={activeDesign}
              pageSize={activeSize}
              drawing={drawing}
              drawColor={drawColor}
              drawTool={drawTool}
              erasing={erasing}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              eraseRadius={strokeWidth}
              onColorUsed={handleColorUsed}
              recentColors={recentColors}
              onUpdatePage={updateDesign}
              interactive
            />
          </View>
        </View>

        <Toolbar
          drawingActive={drawing}
          onToggleDraw={() => setDrawing((d) => !d)}
          onAddPhoto={() => setPhotoSourceOpen(true)}
          onOpenPhotoBank={() => setPhotoBankOpen(true)}
          onAddText={handleAddText}
          onOpenStickers={(t) => {
            if (t) setStickerInitialTab(t);
            setStickerPickerOpen(true);
          }}
          onOpenBackground={() => setBackgroundPickerOpen(true)}
          drawColor={drawColor}
          onPickColor={setDrawColor}
          recentColors={recentColors}
          drawTool={drawTool}
          onSelectTool={setDrawTool}
          sizeIndex={sizeIndex}
          onSelectSize={setSizeIndex}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        <Pressable style={[styles.saveButton, { bottom: insets.bottom + 18 }]} onPress={handleSave}>
          <Text style={styles.saveText}>Terminé</Text>
        </Pressable>

        <BackgroundPicker
          visible={backgroundPickerOpen}
          currentLeft={activeDesign.background}
          currentRight={activeDesign.background}
          showTargets={false}
          onClose={() => setBackgroundPickerOpen(false)}
          onChange={handleSetBackground}
          onPickImage={handlePickBackgroundImage}
          photoBank={photoBank}
        />

        <PhotoBankModal
          visible={photoBankOpen}
          items={photoBank || []}
          onClose={() => setPhotoBankOpen(false)}
          onAddNew={handleAddToPhotoBank}
          onSelect={(item) => {
            handleInsertFromBank(item);
            setPhotoBankOpen(false);
          }}
          onRemove={onRemoveFromPhotoBank}
        />

        <PhotoSourceModal
          visible={photoSourceOpen}
          onClose={() => setPhotoSourceOpen(false)}
          onPickGallery={handleAddPhoto}
          onPickCamera={handleCapturePhoto}
        />

        <StickerPickerModal
          visible={stickerPickerOpen}
          initialTab={stickerInitialTab}
          onClose={() => setStickerPickerOpen(false)}
          onSelect={handleAddSticker}
        />

        <AppAlert {...alertProps} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141210',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 300,
    width: 32,
  },
  backChevron: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 24,
    fontWeight: '300',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 48,
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(224,169,47,0.18)',
    borderColor: '#e0a92f',
  },
  tabText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#e0a92f',
  },
  canvasArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  saveButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#e0a92f',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    zIndex: 300,
  },
  saveText: {
    color: '#201c18',
    fontSize: 15,
    fontWeight: '600',
  },
});
