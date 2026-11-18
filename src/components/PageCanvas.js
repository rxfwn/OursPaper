import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import PageBackgroundLayer from './PageBackgroundLayer';
import DraggablePhoto from './DraggablePhoto';
import DraggableText from './DraggableText';
import DraggableSticker from './DraggableSticker';
import DrawingLayer from './DrawingLayer';
import CropHandles from './CropHandles';
import ColorPicker from './ColorPicker';
import { strokeNearPoint } from '../utils/geometry';
import { normalizePoints, denormalizePoints } from '../utils/normalize';
import { TEXT_FONTS, TEXT_SIZES, HIGHLIGHT_COLOR } from '../theme/textFonts';
import { stickerMaterial, nextStickerMaterial, STICKER_MATERIALS } from '../theme/stickers';

const MATERIAL_ICON = { paper: '📄', gloss: '💧', holo: '🌈', glitter: '✨' };

const ERASE_RADIUS = 16;

function formatPageDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const ROTATE_STEP_DEG = 15;
const SCALE_STEP = 1.15;
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const PHOTO_SHAPES = ['square', 'rounded', 'circle'];
const SHAPE_ICON = { square: '▭', rounded: '▢', circle: '◯' };
const PHOTO_FRAMES = ['none', 'outline', 'polaroid'];
const FRAME_ICON = { none: '◫', outline: '▢', polaroid: '🖼' };

export default function PageCanvas({
  page,
  pageSize,
  drawing,
  drawColor,
  drawTool,
  erasing,
  strokeWidth = 4,
  strokeOpacity = 1,
  eraseRadius = ERASE_RADIUS,
  onColorUsed,
  recentColors,
  onUpdatePage,
  onPageTap,
  interactive = true,
}) {
  const disabled = !interactive || drawing;
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [croppingPhotoId, setCroppingPhotoId] = useState(null);
  const [textColorPickerOpen, setTextColorPickerOpen] = useState(false);
  const [textColorAnchor, setTextColorAnchor] = useState(null);
  const textColorButtonRef = useRef(null);

  const bringToFront = useCallback(
    (type, id) => {
      onPageTap?.();
      setSelectedPhotoId(type === 'photo' ? id : null);
      setSelectedTextId(type === 'text' ? id : null);
      setSelectedStickerId(type === 'sticker' ? id : null);
      onUpdatePage((p) => {
        const maxZ = Math.max(
          0,
          ...p.photos.map((x) => x.z || 0),
          ...p.texts.map((x) => x.z || 0),
          ...(p.stickers || []).map((x) => x.z || 0)
        );
        if (type === 'photo') {
          return { ...p, photos: p.photos.map((ph) => (ph.id === id ? { ...ph, z: maxZ + 1 } : ph)) };
        }
        if (type === 'sticker') {
          return { ...p, stickers: (p.stickers || []).map((s) => (s.id === id ? { ...s, z: maxZ + 1 } : s)) };
        }
        return { ...p, texts: p.texts.map((t) => (t.id === id ? { ...t, z: maxZ + 1 } : t)) };
      });
    },
    [onUpdatePage]
  );

  const handlePhotoPositionChange = useCallback(
    (id, xFrac, yFrac) => {
      onUpdatePage((p) => ({ ...p, photos: p.photos.map((ph) => (ph.id === id ? { ...ph, xFrac, yFrac } : ph)) }));
    },
    [onUpdatePage]
  );
  const handlePhotoRotationChange = useCallback(
    (id, rotation) => {
      onUpdatePage((p) => ({ ...p, photos: p.photos.map((ph) => (ph.id === id ? { ...ph, rotation } : ph)) }));
    },
    [onUpdatePage]
  );
  const handlePhotoScaleChange = useCallback(
    (id, scale) => {
      onUpdatePage((p) => ({ ...p, photos: p.photos.map((ph) => (ph.id === id ? { ...ph, scale } : ph)) }));
    },
    [onUpdatePage]
  );
  const handlePhotoDelete = useCallback(
    (id) => {
      onUpdatePage((p) => ({ ...p, photos: p.photos.filter((ph) => ph.id !== id) }));
      setSelectedPhotoId((current) => (current === id ? null : current));
    },
    [onUpdatePage]
  );

  const handlePhotoPatch = useCallback(
    (id, patch) => {
      onUpdatePage((p) => ({ ...p, photos: p.photos.map((ph) => (ph.id === id ? { ...ph, ...patch } : ph)) }));
    },
    [onUpdatePage]
  );

  const cycleShape = useCallback(
    (id, currentShape) => {
      const idx = PHOTO_SHAPES.indexOf(currentShape || 'square');
      const next = PHOTO_SHAPES[(idx + 1) % PHOTO_SHAPES.length];
      handlePhotoPatch(id, { shape: next });
    },
    [handlePhotoPatch]
  );

  const cycleFrame = useCallback(
    (id, currentFrame) => {
      const idx = PHOTO_FRAMES.indexOf(currentFrame || 'none');
      const next = PHOTO_FRAMES[(idx + 1) % PHOTO_FRAMES.length];
      handlePhotoPatch(id, { frame: next, outline: undefined });
    },
    [handlePhotoPatch]
  );

  // Front/back are absolute (max+1 / min-1) rather than swapping with just
  // one neighbour — with only a handful of items per page this reads the
  // same as a real "bring forward/send backward" but is much simpler than
  // tracking a full ordered layer list.
  const handleZOrder = useCallback(
    (type, id, dir) => {
      onUpdatePage((p) => {
        const allZ = [
          ...p.photos.map((x) => x.z || 0),
          ...p.texts.map((x) => x.z || 0),
          ...(p.stickers || []).map((x) => x.z || 0),
          0,
        ];
        const targetZ = dir === 'front' ? Math.max(...allZ) + 1 : Math.min(...allZ) - 1;
        if (type === 'photo') {
          return { ...p, photos: p.photos.map((ph) => (ph.id === id ? { ...ph, z: targetZ } : ph)) };
        }
        if (type === 'sticker') {
          return { ...p, stickers: (p.stickers || []).map((s) => (s.id === id ? { ...s, z: targetZ } : s)) };
        }
        return { ...p, texts: p.texts.map((t) => (t.id === id ? { ...t, z: targetZ } : t)) };
      });
    },
    [onUpdatePage]
  );

  // Crop = resizing the photo's own box (it renders with resizeMode:cover,
  // so a smaller box simply shows less of the image) — no separate
  // pan/zoom transform to store, unlike the old modal-based cropper.
  const handlePhotoBoxChange = useCallback(
    (id, width, height, xFrac, yFrac) => {
      onUpdatePage((p) => ({
        ...p,
        photos: p.photos.map((ph) =>
          ph.id === id
            ? { ...ph, widthFrac: width / pageSize.width, heightFrac: height / pageSize.height, xFrac, yFrac }
            : ph
        ),
      }));
    },
    [onUpdatePage, pageSize]
  );

  const selectedPhoto = page?.photos.find((p) => p.id === selectedPhotoId) || null;
  const selectedText = page?.texts.find((t) => t.id === selectedTextId) || null;
  const selectedSticker = (page?.stickers || []).find((s) => s.id === selectedStickerId) || null;
  const croppingPhoto = page?.photos.find((p) => p.id === croppingPhotoId) || null;

  const nudgeSelectedRotation = useCallback(
    (deltaDeg) => {
      if (!selectedPhoto) return;
      const next = selectedPhoto.rotation + (deltaDeg * Math.PI) / 180;
      handlePhotoRotationChange(selectedPhoto.id, next);
    },
    [selectedPhoto, handlePhotoRotationChange]
  );

  const nudgeSelectedScale = useCallback(
    (factor) => {
      if (!selectedPhoto) return;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (selectedPhoto.scale ?? 1) * factor));
      handlePhotoScaleChange(selectedPhoto.id, next);
    },
    [selectedPhoto, handlePhotoScaleChange]
  );

  const handleTextPositionChange = useCallback(
    (id, xFrac, yFrac) => {
      onUpdatePage((p) => ({ ...p, texts: p.texts.map((t) => (t.id === id ? { ...t, xFrac, yFrac } : t)) }));
    },
    [onUpdatePage]
  );
  const handleTextRotationChange = useCallback(
    (id, rotation) => {
      onUpdatePage((p) => ({ ...p, texts: p.texts.map((t) => (t.id === id ? { ...t, rotation } : t)) }));
    },
    [onUpdatePage]
  );
  const handleTextChange = useCallback(
    (id, text) => {
      onUpdatePage((p) => ({ ...p, texts: p.texts.map((t) => (t.id === id ? { ...t, text } : t)) }));
    },
    [onUpdatePage]
  );
  const handleTextPatch = useCallback(
    (id, patch) => {
      onUpdatePage((p) => ({ ...p, texts: p.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    },
    [onUpdatePage]
  );
  const handleTextDelete = useCallback(
    (id) => {
      onUpdatePage((p) => ({ ...p, texts: p.texts.filter((t) => t.id !== id) }));
    },
    [onUpdatePage]
  );

  const handleStickerPositionChange = useCallback(
    (id, xFrac, yFrac) => {
      onUpdatePage((p) => ({ ...p, stickers: (p.stickers || []).map((s) => (s.id === id ? { ...s, xFrac, yFrac } : s)) }));
    },
    [onUpdatePage]
  );
  const handleStickerRotationChange = useCallback(
    (id, rotation) => {
      onUpdatePage((p) => ({ ...p, stickers: (p.stickers || []).map((s) => (s.id === id ? { ...s, rotation } : s)) }));
    },
    [onUpdatePage]
  );
  const handleStickerScaleChange = useCallback(
    (id, scale) => {
      onUpdatePage((p) => ({ ...p, stickers: (p.stickers || []).map((s) => (s.id === id ? { ...s, scale } : s)) }));
    },
    [onUpdatePage]
  );
  const handleStickerMaterialCycle = useCallback(
    (id) => {
      onUpdatePage((p) => ({
        ...p,
        stickers: (p.stickers || []).map((s) => (s.id === id ? { ...s, material: nextStickerMaterial(stickerMaterial(s)) } : s)),
      }));
    },
    [onUpdatePage]
  );

  const handleStickerDelete = useCallback(
    (id) => {
      onUpdatePage((p) => ({ ...p, stickers: (p.stickers || []).filter((s) => s.id !== id) }));
      setSelectedStickerId((current) => (current === id ? null : current));
    },
    [onUpdatePage]
  );

  const openTextColorPicker = useCallback(() => {
    textColorButtonRef.current?.measureInWindow((x, y, width, height) => {
      setTextColorAnchor({ x, y, width, height });
      setTextColorPickerOpen(true);
    });
  }, []);

  const handleCommitStroke = useCallback(
    (points) => {
      const framedPoints = normalizePoints(points, pageSize.width, pageSize.height);
      onUpdatePage((p) => ({
        ...p,
        strokes: [
          ...p.strokes,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            points: framedPoints,
            color: drawColor,
            strokeWidth,
            opacity: strokeOpacity,
            tool: drawTool,
          },
        ],
      }));
      onColorUsed?.(drawColor);
    },
    [onUpdatePage, drawColor, drawTool, strokeWidth, strokeOpacity, pageSize, onColorUsed]
  );

  const handleEraseAt = useCallback(
    (x, y) => {
      onUpdatePage((p) => {
        const remaining = p.strokes.filter(
          (s) => !strokeNearPoint(denormalizePoints(s.points, pageSize.width, pageSize.height), x, y, eraseRadius)
        );
        if (remaining.length === p.strokes.length) return p;
        return { ...p, strokes: remaining };
      });
    },
    [onUpdatePage, eraseRadius, pageSize]
  );

  if (!page || !pageSize.width || !pageSize.height) {
    return <View style={[styles.page, pageSize]} />;
  }

  const stack = [
    ...page.photos.map((p) => ({ type: 'photo', id: p.id, z: p.z || 0 })),
    ...page.texts.map((t) => ({ type: 'text', id: t.id, z: t.z || 0 })),
    ...(page.stickers || []).map((s) => ({ type: 'sticker', id: s.id, z: s.z || 0 })),
  ].sort((a, b) => a.z - b.z);

  // This must NOT wrap the photos/texts: nested GestureDetectors run
  // simultaneously by default in gesture-handler, so a Tap here recognized
  // at the same time as a child's Tap would immediately clear the selection
  // the child just set. Attaching it only to the background layer (a sibling
  // rendered below the photos/texts, not an ancestor of them) means it only
  // ever receives touches that land where nothing else is drawn.
  const handleBackgroundTap = () => {
    onPageTap?.();
    setSelectedPhotoId(null);
    setSelectedTextId(null);
    setSelectedStickerId(null);
    setCroppingPhotoId(null);
  };
  const deselectGesture = Gesture.Tap().onStart(() => {
    runOnJS(handleBackgroundTap)();
  });

  return (
    <View style={[styles.page, { width: pageSize.width, height: pageSize.height }]}>
      <GestureDetector gesture={deselectGesture}>
        <View style={StyleSheet.absoluteFill}>
          <PageBackgroundLayer background={page.background} />
        </View>
      </GestureDetector>
      {!!formatPageDate(page.createdAt) && (
        <Text style={styles.pageDate} pointerEvents="none">
          {formatPageDate(page.createdAt)}
        </Text>
      )}
      {stack.map(({ type, id }) => {
        if (type === 'photo') {
          const photo = page.photos.find((p) => p.id === id);
          if (!photo) return null;
          return (
            <DraggablePhoto
              key={id}
              photo={photo}
              pageSize={pageSize}
              // While this photo's corner-crop handles are active, its own
              // pan/rotate/pinch gestures must be off — otherwise a touch on
              // a corner handle can ALSO register as a drag/pinch on the
              // photo underneath (both GestureDetectors overlap the same
              // area), and the two fight each other.
              drawingActive={disabled || croppingPhotoId === id}
              onInteractionStart={(pid) => bringToFront('photo', pid)}
              onPositionChange={handlePhotoPositionChange}
              onRotationChange={handlePhotoRotationChange}
              onScaleChange={handlePhotoScaleChange}
              onDelete={handlePhotoDelete}
            />
          );
        }
        if (type === 'sticker') {
          const sticker = (page.stickers || []).find((s) => s.id === id);
          if (!sticker) return null;
          return (
            <DraggableSticker
              key={id}
              sticker={sticker}
              pageSize={pageSize}
              drawingActive={disabled}
              onInteractionStart={(sid) => bringToFront('sticker', sid)}
              onPositionChange={handleStickerPositionChange}
              onRotationChange={handleStickerRotationChange}
              onScaleChange={handleStickerScaleChange}
              onDelete={handleStickerDelete}
            />
          );
        }
        const text = page.texts.find((t) => t.id === id);
        if (!text) return null;
        return (
          <DraggableText
            key={id}
            item={text}
            pageSize={pageSize}
            drawingActive={disabled}
            onInteractionStart={(tid) => bringToFront('text', tid)}
            onPositionChange={handleTextPositionChange}
            onRotationChange={handleTextRotationChange}
            onTextChange={handleTextChange}
            onDelete={handleTextDelete}
          />
        );
      })}
      <DrawingLayer
        width={pageSize.width}
        height={pageSize.height}
        active={interactive && drawing}
        erasing={erasing}
        strokes={page.strokes}
        color={drawColor}
        tool={drawTool}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        onCommitStroke={handleCommitStroke}
        onEraseAt={handleEraseAt}
      />
      {!disabled && selectedPhoto && !croppingPhoto && (
        <View style={styles.photoControlsGroup} pointerEvents="box-none">
          <View style={styles.photoControls} pointerEvents="box-none">
            <Pressable style={styles.controlButton} onPress={() => nudgeSelectedRotation(-ROTATE_STEP_DEG)} hitSlop={8}>
              <Text style={styles.controlIcon}>↺</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => nudgeSelectedScale(1 / SCALE_STEP)} hitSlop={8}>
              <Text style={styles.controlIcon}>−</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => nudgeSelectedScale(SCALE_STEP)} hitSlop={8}>
              <Text style={styles.controlIcon}>+</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => nudgeSelectedRotation(ROTATE_STEP_DEG)} hitSlop={8}>
              <Text style={styles.controlIcon}>↻</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => setCroppingPhotoId(selectedPhoto.id)} hitSlop={8}>
              <Text style={styles.controlIcon}>⊡</Text>
            </Pressable>
          </View>
          <View style={styles.photoControls} pointerEvents="box-none">
            <Pressable
              style={styles.controlButton}
              onPress={() => cycleShape(selectedPhoto.id, selectedPhoto.shape)}
              hitSlop={8}
            >
              <Text style={styles.controlIcon}>{SHAPE_ICON[selectedPhoto.shape || 'square']}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.controlButton,
                (selectedPhoto.frame || (selectedPhoto.outline ? 'outline' : 'none')) !== 'none' && styles.controlButtonActive,
              ]}
              onPress={() => cycleFrame(selectedPhoto.id, selectedPhoto.frame || (selectedPhoto.outline ? 'outline' : 'none'))}
              hitSlop={8}
            >
              <Text style={styles.controlIcon}>
                {FRAME_ICON[selectedPhoto.frame || (selectedPhoto.outline ? 'outline' : 'none')]}
              </Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => handleZOrder('photo', selectedPhoto.id, 'front')} hitSlop={8}>
              <Text style={styles.controlIcon}>⤒</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => handleZOrder('photo', selectedPhoto.id, 'back')} hitSlop={8}>
              <Text style={styles.controlIcon}>⤓</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => handlePhotoDelete(selectedPhoto.id)} hitSlop={8}>
              <Text style={styles.controlIcon}>🗑</Text>
            </Pressable>
          </View>
        </View>
      )}
      {!disabled && croppingPhoto && (
        <>
          <CropHandles
            photo={croppingPhoto}
            pageSize={pageSize}
            onCropChange={(width, height, xFrac, yFrac) =>
              handlePhotoBoxChange(croppingPhoto.id, width, height, xFrac, yFrac)
            }
          />
          <View style={styles.photoControls} pointerEvents="box-none">
            <Pressable style={styles.controlButton} onPress={() => setCroppingPhotoId(null)} hitSlop={8}>
              <Text style={styles.controlIcon}>✓</Text>
            </Pressable>
          </View>
        </>
      )}
      {!disabled && selectedText && (
        <View style={styles.textControlsGroup} pointerEvents="box-none">
          <View style={styles.textControlsRow} pointerEvents="box-none">
            {TEXT_FONTS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.controlButton, selectedText.fontFamily === f.fontFamily && styles.controlButtonActive]}
                onPress={() => handleTextPatch(selectedText.id, { fontFamily: f.fontFamily })}
                hitSlop={4}
              >
                <Text style={[styles.controlIcon, { fontFamily: f.fontFamily }]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.textControlsRow} pointerEvents="box-none">
            {TEXT_SIZES.map((size) => (
              <Pressable
                key={size}
                style={[styles.controlButton, (selectedText.fontSize || TEXT_SIZES[1]) === size && styles.controlButtonActive]}
                onPress={() => handleTextPatch(selectedText.id, { fontSize: size })}
                hitSlop={4}
              >
                <Text style={[styles.controlIcon, { fontSize: 11 + size * 0.25 }]}>A</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.textControlsRow} pointerEvents="box-none">
            <Pressable
              style={[styles.controlButton, selectedText.bold && styles.controlButtonActive]}
              onPress={() => handleTextPatch(selectedText.id, { bold: !selectedText.bold })}
              hitSlop={4}
            >
              <Text style={[styles.controlIcon, { fontWeight: '700' }]}>B</Text>
            </Pressable>
            <Pressable
              style={[styles.controlButton, selectedText.italic && styles.controlButtonActive]}
              onPress={() => handleTextPatch(selectedText.id, { italic: !selectedText.italic })}
              hitSlop={4}
            >
              <Text style={[styles.controlIcon, { fontStyle: 'italic' }]}>I</Text>
            </Pressable>
            <Pressable
              style={[styles.controlButton, selectedText.underline && styles.controlButtonActive]}
              onPress={() => handleTextPatch(selectedText.id, { underline: !selectedText.underline })}
              hitSlop={4}
            >
              <Text style={[styles.controlIcon, { textDecorationLine: 'underline' }]}>U</Text>
            </Pressable>
            <Pressable
              style={[styles.controlButton, selectedText.strikethrough && styles.controlButtonActive]}
              onPress={() => handleTextPatch(selectedText.id, { strikethrough: !selectedText.strikethrough })}
              hitSlop={4}
            >
              <Text style={[styles.controlIcon, { textDecorationLine: 'line-through' }]}>S</Text>
            </Pressable>
            <Pressable
              style={[styles.controlButton, !!selectedText.highlightColor && styles.controlButtonActive]}
              onPress={() =>
                handleTextPatch(selectedText.id, { highlightColor: selectedText.highlightColor ? null : HIGHLIGHT_COLOR })
              }
              hitSlop={4}
            >
              <Text style={styles.controlIcon}>🖍</Text>
            </Pressable>
          </View>
          <View style={styles.textControlsRow} pointerEvents="box-none">
            <Pressable
              ref={textColorButtonRef}
              style={[styles.colorSwatchButton, { backgroundColor: selectedText.color }]}
              onPress={openTextColorPicker}
              hitSlop={4}
            />
            <Pressable style={styles.controlButton} onPress={() => handleZOrder('text', selectedText.id, 'front')} hitSlop={4}>
              <Text style={styles.controlIcon}>⤒</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => handleZOrder('text', selectedText.id, 'back')} hitSlop={4}>
              <Text style={styles.controlIcon}>⤓</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => handleTextDelete(selectedText.id)} hitSlop={4}>
              <Text style={styles.controlIcon}>🗑</Text>
            </Pressable>
          </View>
        </View>
      )}
      {!disabled && selectedSticker && (
        <View style={[styles.photoControlsGroup, styles.photoControls]} pointerEvents="box-none">
          {selectedSticker.kind !== 'tape' && selectedSticker.kind !== 'image' && (
            <Pressable
              style={styles.controlButton}
              onPress={() => handleStickerMaterialCycle(selectedSticker.id)}
              hitSlop={8}
              accessibilityLabel={`Matière : ${STICKER_MATERIALS.find((m) => m.id === stickerMaterial(selectedSticker))?.label}`}
            >
              <Text style={styles.controlIcon}>{MATERIAL_ICON[stickerMaterial(selectedSticker)]}</Text>
            </Pressable>
          )}
          <Pressable style={styles.controlButton} onPress={() => handleZOrder('sticker', selectedSticker.id, 'front')} hitSlop={8}>
            <Text style={styles.controlIcon}>⤒</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={() => handleZOrder('sticker', selectedSticker.id, 'back')} hitSlop={8}>
            <Text style={styles.controlIcon}>⤓</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={() => handleStickerDelete(selectedSticker.id)} hitSlop={8}>
            <Text style={styles.controlIcon}>🗑</Text>
          </Pressable>
        </View>
      )}
      <ColorPicker
        visible={textColorPickerOpen}
        anchor={textColorAnchor}
        value={selectedText?.color || '#2b2320'}
        onChange={(color) => handleTextPatch(selectedText.id, { color })}
        onClose={() => {
          if (selectedText) onColorUsed?.(selectedText.color);
          setTextColorPickerOpen(false);
        }}
        recentColors={recentColors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  pageDate: {
    position: 'absolute',
    left: 18,
    bottom: 14,
    color: 'rgba(60,50,40,0.4)',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  photoControlsGroup: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 6,
  },
  photoControls: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(28,24,20,0.85)',
    borderRadius: 20,
    padding: 6,
  },
  controlButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(224,169,47,0.5)',
  },
  controlIcon: {
    color: '#f5f2ea',
    fontSize: 15,
  },
  textControlsGroup: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 6,
  },
  textControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(28,24,20,0.85)',
    borderRadius: 20,
    padding: 6,
  },
  colorSwatchButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
