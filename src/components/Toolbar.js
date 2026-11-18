import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ColorPicker from './ColorPicker';
import {
  PhotoActionIcon,
  EditPencilIcon,
  BackgroundActionIcon,
  StickerActionIcon,
  WashiRollIcon,
  FilmRollIcon,
  StickerSheetIcon,
} from './ToolIcons';
import { DRAW_TOOLS } from '../theme/drawTools';
import { hexToHsv, hsvToHex } from '../utils/color';

// Rows below the drawing tools — same icon+label row style as the tool
// list above, so the whole panel reads as one consistent menu instead of
// a tool list glued to a strip of unrelated circular emoji buttons. "Dessiner"
// gets its own plain outline icon rather than reusing the pencil photo —
// showing the same photo twice (once as the Crayon tool, once here) read as
// a mistake, not a deliberate echo.
const ACTIONS = [
  { id: 'photo', label: 'Photo', Icon: PhotoActionIcon },
  { id: 'draw', label: 'Dessiner', Icon: EditPencilIcon },
  { id: 'text', label: 'Texte', Icon: null },
  { id: 'sticker', label: 'Décoration', Icon: StickerActionIcon },
  { id: 'background', label: 'Fond', Icon: BackgroundActionIcon },
];

// Quick-launch rows that sit right under the draw tools, in the same list —
// each just jumps the Décoration modal to the matching tab (film has no
// dedicated tab yet, so it opens on whatever tab was last open).
const DECORATION_SHORTCUTS = [
  { id: 'washi', Icon: WashiRollIcon, tab: 'washi' },
  { id: 'film', Icon: FilmRollIcon, tab: undefined },
  { id: 'stickers', Icon: StickerSheetIcon, tab: 'love' },
];

// One layout everywhere: a left-docked sidebar with the drawing tools
// directly in it (no separate "enter drawing mode" step to see them, no
// mobile-only bottom tray) — tapping a tool both selects it and turns
// drawing on in the same gesture.
export default function Toolbar({
  drawingActive,
  onToggleDraw,
  onAddPhoto,
  onOpenPhotoBank,
  onAddText,
  onOpenStickers,
  onOpenBackground,
  drawColor,
  onPickColor,
  recentColors,
  drawTool,
  onSelectTool,
  sizeIndex,
  onSelectSize,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  const colorButtonRef = useRef(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorAnchor, setColorAnchor] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  // Anchoring the popover to the button's actual on-screen position (rather
  // than centering it) is what makes it feel like it's coming FROM the
  // button instead of appearing in the middle of the page.
  const openColorPicker = () => {
    colorButtonRef.current?.measureInWindow((x, y, width, height) => {
      setColorAnchor({ x, y, width, height });
      setColorPickerOpen(true);
    });
  };

  const handlePress = (fn) => () => fn();

  const selectTool = (id) => {
    onSelectTool(id);
    if (!drawingActive) onToggleDraw();
  };

  const activeTool = DRAW_TOOLS.find((t) => t.id === drawTool) || DRAW_TOOLS[0];

  // A flat dot didn't read as "open the color picker" the way a little
  // gradient sphere does (see reference) — the gradient is derived from the
  // current color itself (lighter highlight to the true color) so it still
  // shows what's selected, not just a decorative rainbow.
  const { h, s, v } = hexToHsv(drawColor);
  const colorHighlight = hsvToHex(h, s * 0.45, Math.min(1, v + 0.35));

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* The grey background is deliberately narrower than the scrollable
          area around it — a selected/expanded icon renders wider than the
          background and visibly sticks out past its edge, instead of being
          clipped at the panel's own bounds the way it would if the
          background and the ScrollView were the same width (a ScrollView
          always clips to its own box, regardless of overflow style, so
          "poking out" only works if there's room past the background but
          still inside the ScrollView). */}
      <View style={styles.panelBackground} pointerEvents="none" />
      <View style={styles.panel} pointerEvents="box-none">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.panelContent}
          style={styles.panelScroll}
        >
          <View style={styles.toolList}>
            {DRAW_TOOLS.map((t) => {
              const isSelected = drawTool === t.id;
              const isHovered = hoveredId === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[
                    styles.toolRow,
                    styles.toolRowPoke,
                    isSelected ? styles.toolRowSelected : isHovered && styles.toolRowShift,
                  ]}
                  onPress={handlePress(() => selectTool(t.id))}
                  onHoverIn={() => setHoveredId(t.id)}
                  onHoverOut={() => setHoveredId((h) => (h === t.id ? null : h))}
                >
                  <t.Icon size={52} expanded={isSelected || isHovered} />
                </Pressable>
              );
            })}
            {DECORATION_SHORTCUTS.map((d) => {
              const isHovered = hoveredId === d.id;
              return (
                <Pressable
                  key={d.id}
                  style={[styles.toolRow, styles.toolRowPoke, isHovered && styles.toolRowShift]}
                  onPress={handlePress(() => onOpenStickers(d.tab))}
                  onHoverIn={() => setHoveredId(d.id)}
                  onHoverOut={() => setHoveredId((h) => (h === d.id ? null : h))}
                >
                  {/* No grow-on-hover here (unlike the draw tools row) — on
                      these fit-mode icons, expanding the box re-fits the
                      whole object into it, which reads as a jarring resize
                      rather than a reveal, and visibly glitched the film
                      roll's crop. Position shift is feedback enough. */}
                  <d.Icon size={38} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sizeRow}>
            {activeTool.sizes.map((s, i) => (
              <Pressable key={i} onPress={handlePress(() => onSelectSize(i))} hitSlop={8} style={styles.sizeDotSlot}>
                <View
                  style={[
                    styles.sizeDot,
                    { width: s, height: s, borderRadius: s / 2 },
                    sizeIndex === i && styles.sizeDotActive,
                  ]}
                />
              </Pressable>
            ))}
          </View>
          <Pressable ref={colorButtonRef} onPress={handlePress(openColorPicker)}>
            <LinearGradient
              colors={[colorHighlight, drawColor]}
              start={{ x: 0.25, y: 0.15 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.colorButton}
            />
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.toolList}>
            {ACTIONS.map((a) => {
              const isDraw = a.id === 'draw';
              const active = isDraw && drawingActive;
              const onPress =
                a.id === 'photo'
                  ? onAddPhoto
                  : a.id === 'draw'
                  ? onToggleDraw
                  : a.id === 'text'
                  ? onAddText
                  : a.id === 'sticker'
                  ? onOpenStickers
                  : onOpenBackground;
              return (
                <Pressable
                  key={a.id}
                  style={[styles.toolRow, (active || hoveredId === a.id) && styles.toolRowShift]}
                  onPress={handlePress(onPress)}
                  onLongPress={a.id === 'photo' ? handlePress(onOpenPhotoBank) : undefined}
                  onHoverIn={() => setHoveredId(a.id)}
                  onHoverOut={() => setHoveredId((h) => (h === a.id ? null : h))}
                >
                  {a.Icon ? <a.Icon size={34} /> : <Text style={styles.actionGlyph}>Aa</Text>}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.divider} />
          <View style={styles.toolList}>
            <Pressable
              style={[styles.toolRow, !canUndo && styles.toolRowDisabled]}
              onPress={handlePress(onUndo)}
              disabled={!canUndo}
            >
              <Text style={styles.actionGlyph}>↩︎</Text>
            </Pressable>
            <Pressable
              style={[styles.toolRow, !canRedo && styles.toolRowDisabled]}
              onPress={handlePress(onRedo)}
              disabled={!canRedo}
            >
              <Text style={styles.actionGlyph}>↪︎</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <ColorPicker
        visible={colorPickerOpen}
        anchor={colorAnchor}
        value={drawColor}
        onChange={onPickColor}
        onClose={() => setColorPickerOpen(false)}
        recentColors={recentColors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Flush against the true left edge and full viewport height — a band,
  // not a floating rounded card with margin around it. Wider than the grey
  // background itself so there's room for content to poke past it (see
  // panelBackground).
  wrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 224,
  },
  panelBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 124,
    backgroundColor: 'rgba(16,16,18,0.94)',
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
  },
  panel: {
    flex: 1,
  },
  panelScroll: {
    flex: 1,
  },
  // Fixed to the SAME width as panelBackground (not the wider wrapper) so
  // rows center against the grey box, not the invisible overflow room
  // around it — only a row that's actually wider than this (selected /
  // expanded) reaches past it into that room.
  panelContent: {
    width: 124,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
    gap: 10,
    overflow: 'visible',
  },
  // Icon-only now (no labels) — tighter, denser rows, active state shown
  // purely via the background tint instead of colored text.
  toolList: {
    width: 108,
    gap: 6,
    overflow: 'visible',
  },
  toolRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0,
    outlineWidth: 0,
  },
  // The drawing tools "rest on the table" — nudged past the panel's own
  // left padding so they read as sitting slightly outside it, like a pencil
  // case propped open, instead of icons flush inside a plain menu.
  toolRowPoke: {
    marginLeft: -10,
  },
  // No color, no box, no glow — the only feedback is the object itself
  // sliding right on hover, a small preview of the bigger, locked-in-place
  // shift the selected tool gets (see toolRowSelected) so the two read as
  // clearly different states, not the same nudge.
  toolRowShift: {
    transform: [{ translateX: 14 }],
    transitionProperty: 'transform',
    transitionDuration: '160ms',
  },
  // The selected tool stays pushed out further than any hover state and
  // doesn't reset — it's "docked" out to the side until another tool is
  // picked, sticking out past the others rather than just nudging over.
  toolRowSelected: {
    transform: [{ translateX: 32 }],
    transitionProperty: 'transform',
    transitionDuration: '200ms',
  },
  toolRowDisabled: {
    opacity: 0.35,
  },
  actionGlyph: {
    color: '#cfcac2',
    fontSize: 20,
    fontWeight: '500',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeDotSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeDot: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  sizeDotActive: {
    backgroundColor: '#e0a92f',
  },
  colorButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  divider: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
