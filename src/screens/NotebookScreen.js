import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookPager, { SPREAD_GUTTER } from '../components/BookPager';
import BookScene3D from '../components/BookScene3D';
import Toolbar from '../components/Toolbar';
import BackgroundPicker from '../components/BackgroundPicker';
import PhotoBankModal from '../components/PhotoBankModal';
import PhotoSourceModal from '../components/PhotoSourceModal';
import StickerPickerModal from '../components/StickerPickerModal';
import AmbientBackground from '../components/AmbientBackground';
import AppAlert from '../components/AppAlert';
import { useAppAlert } from '../utils/useAppAlert';
import { createBlankPage } from '../data/factories';
import { generateId } from '../utils/id';
import { pickPersistentImage, capturePersistentPhoto } from '../utils/imagePicker';
import { addDays, formatDateDisplay } from '../utils/dateInput';
import { DRAW_TOOLS } from '../theme/drawTools';

const DEFAULT_DRAW_COLOR = '#2b2b2b';
const DEFAULT_TEXT_COLOR = '#ffc700';
const RECENT_COLORS_LIMIT = 11;
const BOOK_PADDING_TOP = 28;
const BOOK_PADDING_BOTTOM = 40;
// One page per day, one physical page per canvas — no more double-page
// spread. Content is stored as fractions of pageSize, so it reflows safely
// if this ratio ever changes again.
const PAGE_ASPECT = 0.72;
const HISTORY_LIMIT = 10;

export default function NotebookScreen({
  notebook,
  onUpdateNotebook,
  onClose,
  bgThemeIndex,
  photoBank,
  onAddToPhotoBank,
  onRemoveFromPhotoBank,
}) {
  const insets = useSafeAreaInsets();
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [layoutDims, setLayoutDims] = useState({ width: 0, height: 0 });
  // Always open on page 1 — remembering the last page you were on made
  // sense in isolation, but in practice it meant reopening a notebook
  // dropped you somewhere in the middle instead of at the start.
  const [activeIndex, setActiveIndex] = useState(0);
  const [drawing, setDrawing] = useState(false);
  // The toolbar (and the book's 3D tilt) both react to this: hidden/tilted
  // while just browsing, revealed/flattened the moment the user taps the
  // page to actually work on it — tapping away doesn't hide it again, only
  // leaving the notebook does (re-entering resets it).
  const [pageFocused, setPageFocused] = useState(false);
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

  // Only strokes that actually get drawn count as "used" — tracking every
  // live value while dragging the picker would fill the recents with colors
  // that were only ever passed through, never applied to anything.
  const handleColorUsed = useCallback((color) => {
    setRecentColors((prev) => [color, ...prev.filter((c) => c !== color)].slice(0, RECENT_COLORS_LIMIT));
  }, []);

  const pages = notebook.pages;
  const currentPage = pages[activeIndex];
  const activeTool = DRAW_TOOLS.find((t) => t.id === drawTool) || DRAW_TOOLS[0];
  const erasing = drawTool === 'eraser';
  const strokeWidth = activeTool.sizes[sizeIndex];
  const strokeOpacity = activeTool.opacity;

  const onBookLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setLayoutDims({ width, height });
  }, []);

  useEffect(() => {
    const { width: availW, height: totalH } = layoutDims;
    if (!availW || !totalH) return;
    const availH = Math.max(0, totalH - BOOK_PADDING_TOP - BOOK_PADDING_BOTTOM);
    // pageSize is the size of ONE page — the book shows two of them side by
    // side (a spread), so the available width is split in half (minus the
    // spine gutter) before fitting the single-page aspect ratio.
    const availPageW = Math.max(0, (availW - SPREAD_GUTTER) / 2);
    let w = availPageW;
    let h = availH;
    if (availH > 0 && availPageW / availH > PAGE_ASPECT) {
      h = availH;
      w = h * PAGE_ASPECT;
    } else if (availPageW > 0) {
      w = availPageW;
      h = w / PAGE_ASPECT;
    }
    setPageSize({ width: w, height: h });
  }, [layoutDims]);

  const changeIndex = useCallback(
    (index) => {
      setActiveIndex(index);
      onUpdateNotebook((nb) => ({ ...nb, lastPageIndex: index }));
    },
    [onUpdateNotebook]
  );

  const updatePageAt = useCallback(
    (index, updater, { skipHistory = false } = {}) => {
      onUpdateNotebook((nb) => {
        const nextPages = nb.pages.slice();
        if (!nextPages[index]) return nb;
        if (!skipHistory) {
          undoStackRef.current = [...undoStackRef.current, { index, page: nextPages[index] }].slice(-HISTORY_LIMIT);
          redoStackRef.current = [];
          setCanUndo(true);
          setCanRedo(false);
        }
        nextPages[index] = updater(nextPages[index]);
        return { ...nb, pages: nextPages };
      });
    },
    [onUpdateNotebook]
  );

  const handleUndo = useCallback(() => {
    const entry = undoStackRef.current[undoStackRef.current.length - 1];
    if (!entry) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    onUpdateNotebook((nb) => {
      const nextPages = nb.pages.slice();
      const current = nextPages[entry.index];
      if (!current) return nb;
      redoStackRef.current = [...redoStackRef.current, { index: entry.index, page: current }].slice(-HISTORY_LIMIT);
      nextPages[entry.index] = entry.page;
      return { ...nb, pages: nextPages };
    });
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, [onUpdateNotebook]);

  const handleRedo = useCallback(() => {
    const entry = redoStackRef.current[redoStackRef.current.length - 1];
    if (!entry) return;
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    onUpdateNotebook((nb) => {
      const nextPages = nb.pages.slice();
      const current = nextPages[entry.index];
      if (!current) return nb;
      undoStackRef.current = [...undoStackRef.current, { index: entry.index, page: current }].slice(-HISTORY_LIMIT);
      nextPages[entry.index] = entry.page;
      return { ...nb, pages: nextPages };
    });
    setCanRedo(redoStackRef.current.length > 0);
    setCanUndo(true);
  }, [onUpdateNotebook]);

  const handleAddPage = useCallback(() => {
    onUpdateNotebook((nb) => {
      const last = nb.pages[nb.pages.length - 1];
      const nextDate = addDays(last?.createdAt || nb.date || Date.now(), 1);
      return { ...nb, pages: [...nb.pages, createBlankPage(nextDate)] };
    });
  }, [onUpdateNotebook]);

  const handleAddPageSameDay = useCallback(() => {
    const day = currentPage?.createdAt || notebook.date || Date.now();
    const insertAt = activeIndex + 1;
    onUpdateNotebook((nb) => {
      const nextPages = nb.pages.slice();
      nextPages.splice(insertAt, 0, createBlankPage(day));
      return { ...nb, pages: nextPages, lastPageIndex: insertAt };
    });
    setActiveIndex(insertAt);
  }, [currentPage, notebook.date, activeIndex, onUpdateNotebook]);

  const handleDeleteCurrentPage = useCallback(() => {
    if (pages.length <= 1) {
      showAlert('Impossible', 'Un carnet doit garder au moins une page.');
      return;
    }
    showAlert('Supprimer cette page ?', 'Son contenu sera définitivement perdu.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          const deletedIndex = activeIndex;
          onUpdateNotebook((nb) => {
            const nextPages = nb.pages.filter((_, i) => i !== deletedIndex);
            return { ...nb, pages: nextPages, lastPageIndex: Math.max(0, deletedIndex - 1) };
          });
          setActiveIndex((i) => Math.max(0, i - 1));
        },
      },
    ]);
  }, [pages.length, activeIndex, onUpdateNotebook, showAlert]);

  const handlePageMenu = useCallback(() => {
    showAlert(currentPage?.createdAt ? formatDateDisplay(currentPage.createdAt) : 'Cette page', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Ajouter une page pour ce jour', onPress: handleAddPageSameDay },
      { text: 'Supprimer cette page', style: 'destructive', onPress: handleDeleteCurrentPage },
    ]);
  }, [currentPage, showAlert, handleAddPageSameDay, handleDeleteCurrentPage]);

  // Shared by both the gallery-add flow and inserting from the photo bank —
  // fits the photo's box to its real aspect ratio (like "contain") so the
  // whole image shows uncropped when it's placed; the crop tool is what
  // shrinks the box afterwards, not resizeMode:cover fighting a mismatched
  // box shape from the start.
  const placePhotoOnPage = useCallback(
    (uri, naturalWidth, naturalHeight) => {
      const pageW = pageSize.width || 320;
      const pageH = pageSize.height || 480;
      const aspect = naturalWidth && naturalHeight ? naturalHeight / naturalWidth : 1;
      const maxWidth = Math.min(pageW * 0.55, 260);
      const maxHeight = pageH * 0.55;
      let targetWidth = maxWidth;
      let targetHeight = targetWidth * aspect;
      if (targetHeight > maxHeight) {
        targetHeight = maxHeight;
        targetWidth = targetHeight / aspect;
      }

      const jitterX = (Math.random() - 0.5) * pageW * 0.3;
      const jitterY = (Math.random() - 0.5) * pageH * 0.3;
      const rotation = ((Math.random() - 0.5) * 2 * 8 * Math.PI) / 180;

      const photo = {
        id: generateId(),
        uri,
        widthFrac: targetWidth / pageW,
        heightFrac: targetHeight / pageH,
        xFrac: (pageW / 2 + jitterX) / pageW,
        yFrac: (pageH / 2 + jitterY) / pageH,
        rotation,
        scale: 1,
        z: Date.now(),
      };

      updatePageAt(activeIndex, (p) => ({ ...p, photos: [...p.photos, photo] }));
    },
    [pageSize, activeIndex, updatePageAt]
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
      placePhotoOnPage(uri, asset.width, asset.height);
    },
    [placePhotoOnPage, showAlert]
  );

  const handleAddPhoto = useCallback(
    () => handleAddPhotoFrom(pickPersistentImage, "Autorise l'accès à tes photos dans les réglages pour en coller sur la page."),
    [handleAddPhotoFrom]
  );

  const handleCapturePhoto = useCallback(
    () => handleAddPhotoFrom(capturePersistentPhoto, "Autorise l'accès à la caméra dans les réglages pour prendre une photo."),
    [handleAddPhotoFrom]
  );

  const handleAddToPhotoBank = useCallback(async () => {
    const picked = await pickPersistentImage();
    if (!picked.granted) {
      showAlert(
        'Accès aux photos refusé',
        "Autorise l'accès à tes photos dans les réglages pour les ajouter à la banque."
      );
      return;
    }
    if (picked.canceled) return;
    const { asset, uri } = picked;
    await onAddToPhotoBank?.({ uri, width: asset.width, height: asset.height });
  }, [onAddToPhotoBank, showAlert]);

  const handleInsertFromBank = useCallback(
    (item) => {
      placePhotoOnPage(item.uri, item.width, item.height);
    },
    [placePhotoOnPage]
  );

  const handleSetBackground = useCallback(
    (bg, target = 'left') => {
      if (target === 'left' || target === 'both') {
        updatePageAt(activeIndex, (p) => ({ ...p, background: bg }));
      }
      if (target === 'right' || target === 'both') {
        updatePageAt(activeIndex + 1, (p) => ({ ...p, background: bg }));
      }
    },
    [activeIndex, updatePageAt]
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
    const pageW = pageSize.width || 320;
    const pageH = pageSize.height || 480;
    const text = {
      id: generateId(),
      text: '',
      color: DEFAULT_TEXT_COLOR,
      xFrac: (pageW / 2 - 60 + (Math.random() - 0.5) * pageW * 0.2) / pageW,
      yFrac: (pageH / 2 - 15 + (Math.random() - 0.5) * pageH * 0.2) / pageH,
      rotation: 0,
      z: Date.now(),
    };
    updatePageAt(activeIndex, (p) => ({ ...p, texts: [...p.texts, text] }));
  }, [pageSize, activeIndex, updatePageAt]);

  const handleAddSticker = useCallback(
    (payload) => {
      const pageW = pageSize.width || 320;
      const pageH = pageSize.height || 480;
      const sticker = {
        id: generateId(),
        kind: payload.kind,
        emoji: payload.emoji,
        source: payload.source,
        color: payload.color,
        pattern: payload.pattern,
        ...(payload.kind === 'emoji' ? { material: payload.material || 'paper' } : {}),
        xFrac: (pageW / 2 + (Math.random() - 0.5) * pageW * 0.3) / pageW,
        yFrac: (pageH / 2 + (Math.random() - 0.5) * pageH * 0.3) / pageH,
        // A slight random angle makes stickers feel hand-placed.
        rotation: (Math.random() - 0.5) * (payload.kind === 'tape' ? 0.35 : 0.3),
        scale: 1,
        z: Date.now(),
        addedAt: Date.now(),
      };
      updatePageAt(activeIndex, (p) => ({ ...p, stickers: [...(p.stickers || []), sticker] }));
    },
    [pageSize, activeIndex, updatePageAt]
  );

  // Content saved before fraction-based coordinates existed (see
  // DraggablePhoto/DraggableText) only self-heals the moment it's dragged —
  // this proactively converts it the first time the page is viewed, so it
  // doesn't require the user to touch every old item by hand. Both pages of
  // the current spread are visible/interactive, so both need the fix-up.
  useEffect(() => {
    if (!pageSize.width || !pageSize.height) return;
    const needsFix = (p) =>
      !p
        ? false
        : p.photos.some((ph) => ph.xFrac === undefined) ||
          p.texts.some((t) => t.xFrac === undefined) ||
          p.strokes.some((s) => s.points.some((pt) => pt.xFrac === undefined));
    const migrate = (p) => ({
      ...p,
      photos: p.photos.map((ph) =>
        ph.xFrac !== undefined
          ? ph
          : {
              ...ph,
              xFrac: ph.x / pageSize.width,
              yFrac: ph.y / pageSize.height,
              widthFrac: ph.width / pageSize.width,
              heightFrac: ph.height / pageSize.height,
            }
      ),
      texts: p.texts.map((t) =>
        t.xFrac !== undefined ? t : { ...t, xFrac: t.x / pageSize.width, yFrac: t.y / pageSize.height }
      ),
      strokes: p.strokes.map((s) => ({
        ...s,
        points: s.points.map((pt) =>
          pt.xFrac !== undefined ? pt : { xFrac: pt.x / pageSize.width, yFrac: pt.y / pageSize.height }
        ),
      })),
    });
    if (needsFix(pages[activeIndex])) {
      updatePageAt(activeIndex, migrate, { skipHistory: true });
    }
    if (needsFix(pages[activeIndex + 1])) {
      updatePageAt(activeIndex + 1, migrate, { skipHistory: true });
    }
  }, [pageSize, activeIndex, pages, updatePageAt]);

  return (
    <View style={styles.container}>
      <AmbientBackground themeIndex={bgThemeIndex} />
      {/* Sits behind everything else — the book, toolbar, and header all
          render after it and so sit visually on top, meaning this only ever
          catches taps that land in genuinely empty space around them. That's
          what "clicking away" to leave edit mode means: nothing else claimed
          the tap first. */}
      {pageFocused && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            setPageFocused(false);
            setDrawing(false);
          }}
        />
      )}

      {!pageFocused && (
        <Pressable onPress={onClose} hitSlop={14} style={[styles.backButton, { top: insets.top + 18 }]}>
          <Text style={styles.backChevron}>←</Text>
        </Pressable>
      )}

      <View style={[styles.header, { paddingTop: insets.top + 20 }]} pointerEvents="box-none">
        <Text style={styles.title} numberOfLines={1}>
          {notebook.name}
        </Text>
        <Pressable onLongPress={handlePageMenu} hitSlop={14}>
          <Text style={styles.pageIndicator}>
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.bookArea} onLayout={onBookLayout} pointerEvents="box-none">
        {Platform.OS === 'web' ? (
          // 3D closed-book view (idle) that zooms/flattens into the SAME
          // real page + Toolbar editing as before (native's BookPager) —
          // not a separate blank scene this time.
          <BookScene3D
            notebookId={notebook.id}
            notebookName={notebook.name}
            pages={pages}
            activeIndex={activeIndex}
            pageSize={pageSize}
            drawing={drawing}
            drawColor={drawColor}
            drawTool={drawTool}
            erasing={erasing}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            eraseRadius={strokeWidth}
            onColorUsed={handleColorUsed}
            recentColors={recentColors}
            onUpdatePage={updatePageAt}
            onChangeIndex={changeIndex}
            focused={pageFocused}
            onEnter={() => setPageFocused(true)}
            onExit={() => {
              setPageFocused(false);
              setDrawing(false);
            }}
          />
        ) : (
          <BookPager
            pages={pages}
            activeIndex={activeIndex}
            pageSize={pageSize}
            drawing={drawing}
            drawColor={drawColor}
            drawTool={drawTool}
            erasing={erasing}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            eraseRadius={strokeWidth}
            onColorUsed={handleColorUsed}
            recentColors={recentColors}
            onChangeIndex={changeIndex}
            onUpdatePage={updatePageAt}
            onAddPage={handleAddPage}
            onPageTap={() => setPageFocused(true)}
            flattened={pageFocused}
          />
        )}
      </View>

      {pageFocused && (
      <Toolbar
        drawingActive={drawing}
        onToggleDraw={() => setDrawing((d) => !d)}
        onAddPhoto={() => setPhotoSourceOpen(true)}
        onOpenPhotoBank={() => setPhotoBankOpen(true)}
        onAddText={handleAddText}
        onOpenStickers={(tab) => {
          if (tab) setStickerInitialTab(tab);
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
      )}

      <BackgroundPicker
        visible={backgroundPickerOpen}
        currentLeft={currentPage?.background}
        currentRight={pages[activeIndex + 1]?.background}
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
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  pageIndicator: {
    color: '#d4a520',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 5,
  },
  bookArea: {
    flex: 1,
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    marginHorizontal: 20,
    paddingTop: BOOK_PADDING_TOP,
    paddingBottom: BOOK_PADDING_BOTTOM,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
