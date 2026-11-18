import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AmbientBackground from '../components/AmbientBackground';
import BgThemePicker from '../components/BgThemePicker';
import CircleButton from '../components/CircleButton';
import CreateNotebookSheet from '../components/CreateNotebookSheet';
import AppAlert from '../components/AppAlert';
import ElasticBand from '../components/ElasticBand';
import InviteCodeModal from '../components/InviteCodeModal';
import PageCanvas from '../components/PageCanvas';
import { useAppAlert } from '../utils/useAppAlert';
import { photoTransformStyle } from '../utils/photoTransform';
import { hasDesignContent } from '../data/factories';
import { getInviteCode } from '../data/coupleAuth';
import {
  MIN_SPINE,
  MAX_SPINE,
  SPINE_HEIGHT,
  REVEAL_WIDTH,
  spineWidthFor,
  spineColorFor,
  COVER_LEFT_CORNER_RADIUS,
  COVER_RIGHT_CORNER_RADIUS,
  SPINE_CORNER_RADIUS,
} from '../theme/notebookDimensions';

const DIGIT_FONT = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

const GAP = 28;
const EXTRA_CLEARANCE = 14;
const BELOW_ROW_HEIGHT = 50;
// The hover lift/scale/shadow needs room to breathe beyond the spine's own
// bounds — a ScrollView clips to its own box (that's how scrolling works at
// all), so without this margin the effect gets cut off at the top/bottom
// edge instead of floating freely.
const SHELF_VERTICAL_HEADROOM = 80;

const NOOP_UPDATE = (fn) => fn;

function NotebookSpine({
  notebook,
  width,
  revealed,
  pushLeft,
  pushRight,
  suppressHover,
  onReveal,
  onOpen,
  onMenu,
}) {
  const [hovered, setHovered] = useState(false);
  const hoverProgress = useSharedValue(0);
  const reveal = useSharedValue(0);
  const extraMarginLeft = useSharedValue(0);
  const extraMarginRight = useSharedValue(0);

  useEffect(() => {
    hoverProgress.value = withTiming(hovered ? 1 : 0, { duration: 150 });
  }, [hovered, hoverProgress]);

  useEffect(() => {
    if (suppressHover && hovered) setHovered(false);
  }, [suppressHover, hovered]);

  useEffect(() => {
    reveal.value = withTiming(revealed ? 1 : 0, { duration: 320 });
  }, [revealed, reveal]);

  useEffect(() => {
    extraMarginLeft.value = withTiming(pushLeft, { duration: 320 });
  }, [pushLeft, extraMarginLeft]);

  useEffect(() => {
    extraMarginRight.value = withTiming(pushRight, { duration: 320 });
  }, [pushRight, extraMarginRight]);

  const handlePress = () => {
    if (revealed) {
      onOpen(notebook.id);
    } else {
      onReveal(notebook.id);
    }
  };

  const containerStyle = useAnimatedStyle(() => {
    const hoverScale = 1 + hoverProgress.value * 0.04;
    const hoverLift = hoverProgress.value * -14;
    return {
      transform: [{ scale: hoverScale }, { translateY: hoverLift }],
      zIndex: revealed ? 50 : hoverProgress.value > 0 ? 10 : 1,
      marginLeft: extraMarginLeft.value,
      marginRight: GAP + extraMarginRight.value,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 + hoverProgress.value * 14 },
      shadowOpacity: 0.35 + hoverProgress.value * 0.3,
      shadowRadius: 14 + hoverProgress.value * 16,
      elevation: 6 + hoverProgress.value * 10,
    };
  });

  const spineFadeStyle = useAnimatedStyle(() => ({ opacity: 1 - reveal.value }));

  const revealTargetWidth = REVEAL_WIDTH;
  const widthDelta = revealTargetWidth - width;
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    width: interpolate(reveal.value, [0, 1], [width, revealTargetWidth], Extrapolation.CLAMP),
    marginLeft: interpolate(reveal.value, [0, 1], [0, -widthDelta / 2], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[{ width, height: SPINE_HEIGHT }, containerStyle]}>
      <Pressable
        onPress={handlePress}
        onHoverIn={() => !suppressHover && setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onLongPress={() => onMenu(notebook)}
        style={styles.spineFill}
      >
        <Animated.View
          style={[
            { position: 'absolute', left: 0, top: 0, width, height: SPINE_HEIGHT },
            styles.spineClip,
            spineFadeStyle,
          ]}
        >
          {hasDesignContent(notebook.spineDesign) ? (
            <PageCanvas
              page={notebook.spineDesign}
              pageSize={{ width, height: SPINE_HEIGHT }}
              onUpdatePage={NOOP_UPDATE}
              interactive={false}
            />
          ) : notebook.spineUri ? (
            <Image
              source={{ uri: notebook.spineUri }}
              style={[{ width, height: SPINE_HEIGHT }, photoTransformStyle(notebook.spineTransform, width, SPINE_HEIGHT)]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.spineFallback, { width, height: SPINE_HEIGHT, backgroundColor: spineColorFor(notebook.id) }]}>
              <Text style={[styles.spineTitle, { width: SPINE_HEIGHT - 50 }]}>{notebook.name}</Text>
            </View>
          )}
        </Animated.View>
        <Animated.View style={[styles.coverReveal, overlayStyle]} pointerEvents="none">
          <View style={styles.coverRevealClip}>
            {hasDesignContent(notebook.coverDesign) ? (
              <PageCanvas
                page={notebook.coverDesign}
                pageSize={{ width: REVEAL_WIDTH, height: SPINE_HEIGHT }}
                onUpdatePage={NOOP_UPDATE}
                interactive={false}
              />
            ) : notebook.coverUri ? (
              <Image
                source={{ uri: notebook.coverUri }}
                style={[styles.spineImage, photoTransformStyle(notebook.coverTransform, REVEAL_WIDTH, SPINE_HEIGHT)]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.spineFallback, { backgroundColor: spineColorFor(notebook.id) }]}>
                <Text style={styles.coverRevealTitle} numberOfLines={2}>
                  {notebook.name}
                </Text>
              </View>
            )}
            <ElasticBand />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function LibraryScreen({
  notebooks,
  onOpenNotebook,
  onCreateNotebook,
  onDeleteNotebook,
  onUpdateNotebook,
  bgThemeIndex,
  onChangeBgTheme,
  coupleId,
  photoBank,
  onAddToPhotoBank,
  onRemoveFromPhotoBank,
}) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [creating, setCreating] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [revealedId, setRevealedId] = useState(null);
  const [yearFilter, setYearFilter] = useState(null);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [dragCursor, setDragCursor] = useState(false);
  const scrollRef = useRef(null);
  const scrollXRef = useRef(0);
  const mouseDragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const { alertProps, showAlert } = useAppAlert();

  const years = useMemo(() => {
    const set = new Set(notebooks.map((nb) => new Date(nb.date || nb.createdAt).getFullYear()));
    return Array.from(set).sort((a, b) => a - b);
  }, [notebooks]);

  const visibleNotebooks = useMemo(
    () => (yearFilter ? notebooks.filter((nb) => new Date(nb.date || nb.createdAt).getFullYear() === yearFilter) : notebooks),
    [notebooks, yearFilter]
  );

  const selectYear = (y) => {
    setYearFilter(y);
    setRevealedId(null);
    setFocusedIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  };

  const pageCountBounds = useMemo(() => {
    const counts = notebooks.map((nb) => nb.pages.length);
    return { min: Math.min(...counts), max: Math.max(...counts) };
  }, [notebooks]);

  const spineWidths = useMemo(
    () => visibleNotebooks.map((nb) => spineWidthFor(nb.pages.length, pageCountBounds.min, pageCountBounds.max)),
    [visibleNotebooks, pageCountBounds]
  );
  const offsets = useMemo(() => {
    const arr = [];
    let acc = 0;
    spineWidths.forEach((w) => {
      arr.push(acc);
      acc += w + GAP;
    });
    return arr;
  }, [spineWidths]);

  const sidePadding = Math.max(24, screenWidth / 2 - 40);

  const centers = useMemo(
    () => offsets.map((off, i) => sidePadding + off + spineWidths[i] / 2 - screenWidth / 2),
    [offsets, spineWidths, sidePadding, screenWidth]
  );

  // The ScrollView otherwise opens at x:0 (its natural default), which only
  // happens to look centered if the shelf's own content is coincidentally
  // centered there — normally it leaves the shelf sitting off to one side
  // until the user scrolls. Centering on centers[0] alone only centers the
  // FIRST notebook, which skews the whole row off-screen-center whenever
  // there's more than one (the group's midpoint isn't the first item's
  // midpoint) — so this centers the row's overall midpoint instead. This
  // fires once, the first time there's something to center, rather than on
  // every notebooks update (an autosave shouldn't yank the scroll position).
  const didInitialCenter = useRef(false);
  useEffect(() => {
    if (didInitialCenter.current || visibleNotebooks.length === 0 || !screenWidth) return;
    didInitialCenter.current = true;
    const lastIdx = spineWidths.length - 1;
    const contentWidth = offsets[lastIdx] + spineWidths[lastIdx];
    const contentCenterX = sidePadding + contentWidth / 2 - screenWidth / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, contentCenterX || 0), animated: false });
  }, [visibleNotebooks.length, offsets, spineWidths, sidePadding, screenWidth]);

  const handleMomentumEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    let nearest = 0;
    let best = Infinity;
    centers.forEach((c, i) => {
      const d = Math.abs(c - x);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setFocusedIndex(Math.max(0, Math.min(visibleNotebooks.length - 1, nearest)));
  };

  const revealedIndex = visibleNotebooks.findIndex((nb) => nb.id === revealedId);
  const revealHalfDelta = useMemo(() => {
    if (revealedIndex < 0) return 0;
    const w = spineWidths[revealedIndex];
    return (REVEAL_WIDTH - w) / 2 + EXTRA_CLEARANCE;
  }, [revealedIndex, spineWidths]);

  const handleReveal = (id) => {
    setRevealedId(id);
    const idx = visibleNotebooks.findIndex((nb) => nb.id === id);
    if (idx >= 0) {
      setFocusedIndex(idx);
      // Pushing the left neighbour's marginRight shifts every item after it
      // (including this one) further right in the flex flow, so the scroll
      // target needs the same compensation to keep the revealed item centered.
      const w = spineWidths[idx];
      const halfDelta = (REVEAL_WIDTH - w) / 2 + EXTRA_CLEARANCE;
      const compensation = idx > 0 ? halfDelta : 0;
      scrollRef.current?.scrollTo({ x: Math.max(0, centers[idx] + compensation), animated: true });
    }
  };

  const moveNotebook = (id, direction) => {
    const index = visibleNotebooks.findIndex((nb) => nb.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= visibleNotebooks.length) return;
    const neighbor = visibleNotebooks[targetIndex];
    const beyond = visibleNotebooks[targetIndex + direction];
    let newSortOrder;
    if (beyond) {
      newSortOrder = ((neighbor.sortOrder ?? 0) + (beyond.sortOrder ?? 0)) / 2;
    } else {
      newSortOrder = (neighbor.sortOrder ?? Date.now()) + direction * 1000;
    }
    onUpdateNotebook(id, (nb) => ({ ...nb, sortOrder: newSortOrder }));
  };

  const scrollToIndex = (idx) => {
    const clamped = Math.max(0, Math.min(visibleNotebooks.length - 1, idx));
    setFocusedIndex(clamped);
    setRevealedId(null);
    scrollRef.current?.scrollTo({ x: Math.max(0, centers[clamped]), animated: true });
  };

  const handleDismissReveal = () => {
    if (!revealedId) return;
    const idx = visibleNotebooks.findIndex((nb) => nb.id === revealedId);
    setRevealedId(null);
    if (idx >= 0) {
      scrollRef.current?.scrollTo({ x: Math.max(0, centers[idx]), animated: true });
    }
  };

  // Click-and-drag scrolling for mouse users: RN's ScrollView only reacts to
  // real touch/trackpad swipes on web, not a mouse held down and moved. This
  // tracks the drag manually and imperatively scrolls, without ever calling
  // preventDefault/stopPropagation — a plain click (no real movement) still
  // reaches the spine's own Pressable untouched.
  const handleShelfMouseDown = (e) => {
    mouseDragRef.current = {
      active: true,
      startX: e.nativeEvent.pageX ?? e.nativeEvent.clientX,
      startScroll: scrollXRef.current,
      moved: false,
    };
    setDragCursor(true);
  };

  const handleShelfMouseMove = (e) => {
    if (!mouseDragRef.current.active) return;
    const x = e.nativeEvent.pageX ?? e.nativeEvent.clientX;
    const dx = x - mouseDragRef.current.startX;
    if (!mouseDragRef.current.moved && Math.abs(dx) > 5) {
      mouseDragRef.current.moved = true;
      if (revealedId) handleDismissReveal();
    }
    if (mouseDragRef.current.moved) {
      scrollRef.current?.scrollTo({ x: mouseDragRef.current.startScroll - dx, animated: false });
    }
  };

  const handleShelfMouseUp = () => {
    mouseDragRef.current.active = false;
    setDragCursor(false);
  };

  const revealedNotebook = visibleNotebooks.find((nb) => nb.id === revealedId) || null;

  const confirmDelete = (notebook) => {
    showAlert(
      'Supprimer ce carnet ?',
      `« ${notebook.name} » et toutes ses pages seront définitivement supprimés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onDeleteNotebook(notebook.id) },
      ]
    );
  };

  const openMenu = (notebook) => {
    const index = visibleNotebooks.findIndex((nb) => nb.id === notebook.id);
    const options = [{ text: 'Annuler', style: 'cancel' }];
    if (index > 0) {
      options.push({ text: '← Déplacer à gauche', onPress: () => moveNotebook(notebook.id, -1) });
    }
    if (index < visibleNotebooks.length - 1) {
      options.push({ text: 'Déplacer à droite →', onPress: () => moveNotebook(notebook.id, 1) });
    }
    options.push({ text: 'Modifier', onPress: () => setEditingNotebook(notebook) });
    options.push({ text: 'Supprimer', style: 'destructive', onPress: () => confirmDelete(notebook) });
    showAlert(notebook.name, undefined, options);
  };

  const handleShowInvite = async () => {
    setInviteVisible(true);
    if (inviteCode) return;
    setInviteLoading(true);
    try {
      const code = await getInviteCode(coupleId);
      setInviteCode(code);
    } catch (e) {
      setInviteVisible(false);
      showAlert('Erreur', "Impossible de récupérer le code pour l'instant.");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <Pressable style={styles.container} onPress={handleDismissReveal}>
      <AmbientBackground themeIndex={bgThemeIndex} />

      <BgThemePicker
        themeIndex={bgThemeIndex}
        onChange={onChangeBgTheme}
        style={{ top: insets.top + 12, left: 16 }}
      />

      <View style={[styles.addButton, { top: insets.top + 12 }]}>
        <CircleButton image={require('../../assets/busts-in-silhouette_1f465.png')} size={38} onPress={handleShowInvite} />
        <CircleButton icon="+" size={38} onPress={() => setCreating(true)} accent />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.wordmark}>{notebooks.length === 0 ? 'Aucun carnet' : 'Nos carnets'}</Text>
        <Text style={styles.subtitle}>
          {notebooks.length === 0
            ? 'Appuie sur + pour commencer'
            : `${visibleNotebooks.length} ${visibleNotebooks.length === 1 ? 'carnet' : 'carnets'}`}
        </Text>
      </View>

      {notebooks.length > 0 && years.length > 1 && (
        <View style={styles.yearBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.yearBarContent}
          >
            <Pressable
              onPress={() => selectYear(null)}
              style={[styles.yearPill, yearFilter === null && styles.yearPillActive]}
            >
              <Text style={[styles.yearPillText, yearFilter === null && styles.yearPillTextActive]}>Tous</Text>
            </Pressable>
            {years.map((y) => (
              <Pressable
                key={y}
                onPress={() => selectYear(y)}
                style={[styles.yearPill, yearFilter === y && styles.yearPillActive]}
              >
                <Text style={[styles.yearPillText, yearFilter === y && styles.yearPillTextActive]}>{y}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.shelfWrapper}>
        {notebooks.length === 0 ? (
          <Pressable onPress={() => setCreating(true)}>
            <Text style={styles.emptyHint}>Ton étagère est vide</Text>
          </Pressable>
        ) : (
          <View style={styles.shelfCenterGroup}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              contentContainerStyle={[styles.shelfContent, { paddingHorizontal: sidePadding }]}
              style={[
                styles.shelf,
                { cursor: dragCursor ? 'grabbing' : 'grab', touchAction: 'pan-x', userSelect: 'none' },
              ]}
              onMomentumScrollEnd={handleMomentumEnd}
              onScroll={(e) => {
                scrollXRef.current = e.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={16}
              onScrollBeginDrag={() => {
                if (revealedId) handleDismissReveal();
              }}
              onMouseDown={handleShelfMouseDown}
              onMouseMove={handleShelfMouseMove}
              onMouseUp={handleShelfMouseUp}
              onMouseLeave={handleShelfMouseUp}
            >
              {visibleNotebooks.map((nb, i) => (
                <NotebookSpine
                  key={nb.id}
                  notebook={nb}
                  width={spineWidths[i]}
                  revealed={revealedId === nb.id}
                  pushLeft={i === revealedIndex + 1 ? revealHalfDelta : 0}
                  pushRight={i === revealedIndex - 1 ? revealHalfDelta : 0}
                  suppressHover={dragCursor}
                  onReveal={handleReveal}
                  onOpen={onOpenNotebook}
                  onMenu={openMenu}
                />
              ))}
            </ScrollView>

            <View style={styles.belowBookRow}>
              <View style={styles.belowBookCaption} pointerEvents="none">
                {revealedNotebook && (
                  <>
                    <Text style={styles.belowBookTitle} numberOfLines={1}>
                      {revealedNotebook.name}
                    </Text>
                    <Text style={styles.belowBookPages}>
                      {revealedNotebook.pages.length} {revealedNotebook.pages.length === 1 ? 'page' : 'pages'}
                    </Text>
                  </>
                )}
              </View>

              {visibleNotebooks.length > 1 && (
                <>
                  <Pressable
                    style={[styles.navArrow, styles.navArrowLeft]}
                    onPress={() => scrollToIndex(focusedIndex - 1)}
                    disabled={focusedIndex <= 0}
                    hitSlop={10}
                  >
                    <Text style={[styles.navArrowText, focusedIndex <= 0 && styles.navArrowTextDisabled]}>←</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.navArrow, styles.navArrowRight]}
                    onPress={() => scrollToIndex(focusedIndex + 1)}
                    disabled={focusedIndex >= visibleNotebooks.length - 1}
                    hitSlop={10}
                  >
                    <Text
                      style={[styles.navArrowText, focusedIndex >= visibleNotebooks.length - 1 && styles.navArrowTextDisabled]}
                    >
                      →
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}
      </View>

      {visibleNotebooks.length > 0 && (
        <Text style={[styles.shelfIndex, { bottom: insets.bottom + 16 }]} pointerEvents="none">
          {focusedIndex + 1}/{visibleNotebooks.length}
        </Text>
      )}

      <CreateNotebookSheet
        visible={creating}
        mode="create"
        onCancel={() => setCreating(false)}
        onCreate={(notebook) => {
          setCreating(false);
          onCreateNotebook(notebook);
        }}
        photoBank={photoBank}
        onAddToPhotoBank={onAddToPhotoBank}
        onRemoveFromPhotoBank={onRemoveFromPhotoBank}
      />

      <CreateNotebookSheet
        visible={!!editingNotebook}
        mode="edit"
        initialNotebook={editingNotebook}
        onCancel={() => setEditingNotebook(null)}
        photoBank={photoBank}
        onAddToPhotoBank={onAddToPhotoBank}
        onRemoveFromPhotoBank={onRemoveFromPhotoBank}
        onSave={(patch) => {
          if (editingNotebook) {
            onUpdateNotebook(editingNotebook.id, (nb) => ({ ...nb, ...patch }));
          }
          setEditingNotebook(null);
        }}
      />

      <InviteCodeModal
        visible={inviteVisible}
        code={inviteCode}
        loading={inviteLoading}
        onClose={() => setInviteVisible(false)}
      />

      <AppAlert {...alertProps} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141210',
    userSelect: 'none',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  wordmark: {
    color: '#f2e9d8',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#d4a520',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 5,
  },
  yearBar: {
    marginBottom: 14,
  },
  yearBarContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  yearPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  yearPillActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  yearPillText: {
    color: 'rgba(240,233,216,0.45)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  yearPillTextActive: {
    color: '#f2e9d8',
  },
  shelfWrapper: {
    flex: 1,
  },
  shelfCenterGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  belowBookRow: {
    height: BELOW_ROW_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18 - SHELF_VERTICAL_HEADROOM / 2,
  },
  navArrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  navArrowLeft: {
    left: 8,
  },
  navArrowRight: {
    right: 8,
  },
  navArrowText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 22,
    fontWeight: '300',
  },
  navArrowTextDisabled: {
    color: 'rgba(255,255,255,0.15)',
  },
  belowBookCaption: {
    alignItems: 'center',
    minWidth: 140,
  },
  belowBookTitle: {
    color: '#f2e9d8',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  belowBookPages: {
    color: '#d4a520',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  shelfIndex: {
    position: 'absolute',
    right: 18,
    fontFamily: DIGIT_FONT,
    color: 'rgba(240,233,216,0.4)',
    fontSize: 13,
  },
  shelf: {
    flexGrow: 0,
    flexShrink: 0,
    height: SPINE_HEIGHT + SHELF_VERTICAL_HEADROOM,
  },
  shelfContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    color: 'rgba(240,233,216,0.4)',
    fontSize: 15,
    textAlign: 'center',
  },
  spineFill: {
    flex: 1,
    borderRadius: SPINE_CORNER_RADIUS,
    overflow: 'visible',
  },
  spineClip: {
    borderRadius: SPINE_CORNER_RADIUS,
    overflow: 'hidden',
  },
  spineImage: {
    width: '100%',
    height: '100%',
  },
  spineFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spineTitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  coverReveal: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: SPINE_HEIGHT,
    borderTopLeftRadius: COVER_LEFT_CORNER_RADIUS,
    borderBottomLeftRadius: COVER_LEFT_CORNER_RADIUS,
    borderTopRightRadius: COVER_RIGHT_CORNER_RADIUS,
    borderBottomRightRadius: COVER_RIGHT_CORNER_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
  },
  coverRevealClip: {
    flex: 1,
    borderTopLeftRadius: COVER_LEFT_CORNER_RADIUS,
    borderBottomLeftRadius: COVER_LEFT_CORNER_RADIUS,
    borderTopRightRadius: COVER_RIGHT_CORNER_RADIUS,
    borderBottomRightRadius: COVER_RIGHT_CORNER_RADIUS,
    overflow: 'hidden',
  },
  coverRevealTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  addButton: {
    position: 'absolute',
    right: 16,
    zIndex: 400,
    flexDirection: 'row',
    gap: 10,
  },
});
