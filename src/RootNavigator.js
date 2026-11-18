import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LibraryScreen from './screens/LibraryScreen';
import NotebookScreen from './screens/NotebookScreen';
import PairingScreen from './screens/PairingScreen';
import AppAlert from './components/AppAlert';
import SaveIndicator from './components/SaveIndicator';
import { useAppAlert } from './utils/useAppAlert';
import { ensureSession, getMyCoupleId } from './data/coupleAuth';
import {
  fetchNotebooks,
  insertNotebookRemote,
  updateNotebookRemote,
  deleteNotebookRemote,
  subscribeToNotebooks,
  fetchCoupleSettings,
  updateCoupleSettings,
  subscribeToCoupleSettings,
} from './data/notebooksRemote';
import {
  fetchPhotoBank,
  insertPhotoBankItem,
  deletePhotoBankItem,
  subscribeToPhotoBank,
} from './data/photoBankRemote';

const UPDATE_DEBOUNCE_MS = 500;

function sortByOrder(arr) {
  return [...arr].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export default function RootNavigator() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('loading'); // loading | pairing | ready | error
  const [bootError, setBootError] = useState('');
  const [coupleId, setCoupleId] = useState(null);
  const [notebooks, setNotebooks] = useState(null);
  const [photoBank, setPhotoBank] = useState([]);
  const [bgThemeIndex, setBgThemeIndex] = useState(0);
  const [activeId, setActiveId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const pendingTimers = useRef({});
  const savedTimerRef = useRef(null);
  const { alertProps, showAlert } = useAppAlert();

  const markSaved = useCallback(() => {
    setSaveStatus('saved');
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1800);
  }, []);

  const loadCoupleData = useCallback(async (cid) => {
    setCoupleId(cid);
    const [nbs, settings, bank] = await Promise.all([
      fetchNotebooks(cid),
      fetchCoupleSettings(cid),
      fetchPhotoBank(cid),
    ]);
    setNotebooks(sortByOrder(nbs));
    setBgThemeIndex(settings.bgThemeIndex);
    setPhotoBank(bank);
    setPhase('ready');
  }, []);

  const boot = useCallback(async () => {
    setPhase('loading');
    try {
      await ensureSession();
      const cid = await getMyCoupleId();
      if (!cid) {
        setPhase('pairing');
        return;
      }
      await loadCoupleData(cid);
    } catch (e) {
      setBootError(e?.message || String(e));
      setPhase('error');
    }
  }, [loadCoupleData]);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    if (!coupleId || phase !== 'ready') return undefined;
    const unsubNotebooks = subscribeToNotebooks(coupleId, {
      onInsert: (nb) => setNotebooks((prev) => (prev.some((x) => x.id === nb.id) ? prev : sortByOrder([...prev, nb]))),
      onUpdate: (nb) => setNotebooks((prev) => sortByOrder(prev.map((x) => (x.id === nb.id ? nb : x)))),
      onDelete: (id) => setNotebooks((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubSettings = subscribeToCoupleSettings(coupleId, ({ bgThemeIndex: idx }) => setBgThemeIndex(idx));
    const unsubPhotoBank = subscribeToPhotoBank(coupleId, {
      onInsert: (item) => setPhotoBank((prev) => (prev.some((x) => x.id === item.id) ? prev : [item, ...prev])),
      onDelete: (id) => setPhotoBank((prev) => prev.filter((x) => x.id !== id)),
    });
    return () => {
      unsubNotebooks();
      unsubSettings();
      unsubPhotoBank();
    };
  }, [coupleId, phase]);

  const addNotebook = useCallback(
    async (notebook) => {
      try {
        const inserted = await insertNotebookRemote(coupleId, notebook);
        setNotebooks((prev) => sortByOrder([...(prev || []), inserted]));
        setActiveId(inserted.id);
      } catch (e) {
        showAlert('Erreur', "Impossible de créer le carnet. Vérifie ta connexion.");
      }
    },
    [coupleId, showAlert]
  );

  const updateNotebook = useCallback(
    (id, updaterFn) => {
      setNotebooks((prev) => {
        const next = sortByOrder(prev.map((nb) => (nb.id === id ? updaterFn(nb) : nb)));
        const updated = next.find((nb) => nb.id === id);
        if (updated) {
          if (pendingTimers.current[id]) clearTimeout(pendingTimers.current[id]);
          setSaveStatus('saving');
          pendingTimers.current[id] = setTimeout(() => {
            updateNotebookRemote(id, updated).then(markSaved).catch(() => setSaveStatus('error'));
          }, UPDATE_DEBOUNCE_MS);
        }
        return next;
      });
    },
    [markSaved]
  );

  const deleteNotebook = useCallback(
    (id) => {
      setNotebooks((prev) => prev.filter((nb) => nb.id !== id));
      if (pendingTimers.current[id]) clearTimeout(pendingTimers.current[id]);
      setSaveStatus('saving');
      deleteNotebookRemote(id).then(markSaved).catch(() => setSaveStatus('error'));
    },
    [markSaved]
  );

  const addPhotoBankItem = useCallback(
    async (item) => {
      // Optimistic: the couple_id filter means our own INSERT's realtime
      // echo would just be a harmless no-op dedupe, not a double-add.
      const tempId = `pending-${Date.now()}`;
      setPhotoBank((prev) => [{ ...item, id: tempId, createdAt: Date.now() }, ...prev]);
      try {
        const inserted = await insertPhotoBankItem(coupleId, item);
        setPhotoBank((prev) => prev.map((x) => (x.id === tempId ? inserted : x)));
        return inserted;
      } catch (e) {
        setPhotoBank((prev) => prev.filter((x) => x.id !== tempId));
        showAlert('Erreur', "Impossible d'ajouter cette photo à la banque.");
        return null;
      }
    },
    [coupleId, showAlert]
  );

  const removePhotoBankItem = useCallback(
    (id) => {
      setPhotoBank((prev) => prev.filter((x) => x.id !== id));
      deletePhotoBankItem(id).catch(() => {});
    },
    []
  );

  const changeBgTheme = useCallback(
    (index) => {
      setBgThemeIndex(index);
      if (coupleId) {
        setSaveStatus('saving');
        updateCoupleSettings(coupleId, { bgThemeIndex: index }).then(markSaved).catch(() => setSaveStatus('error'));
      }
    },
    [coupleId, markSaved]
  );

  if (phase === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#f2e9d8" />
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Connexion impossible.</Text>
        {!!bootError && <Text style={styles.errorDetail}>{bootError}</Text>}
        <Pressable style={styles.retryButton} onPress={boot}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'pairing') {
    return <PairingScreen onPaired={loadCoupleData} />;
  }

  const activeNotebook = notebooks?.find((nb) => nb.id === activeId);

  return (
    <>
      {activeNotebook ? (
        <NotebookScreen
          notebook={activeNotebook}
          onUpdateNotebook={(updater) => updateNotebook(activeNotebook.id, updater)}
          onClose={() => setActiveId(null)}
          bgThemeIndex={bgThemeIndex}
          photoBank={photoBank}
          onAddToPhotoBank={addPhotoBankItem}
          onRemoveFromPhotoBank={removePhotoBankItem}
        />
      ) : (
        <LibraryScreen
          notebooks={notebooks || []}
          onOpenNotebook={setActiveId}
          onCreateNotebook={addNotebook}
          onDeleteNotebook={deleteNotebook}
          onUpdateNotebook={updateNotebook}
          bgThemeIndex={bgThemeIndex}
          onChangeBgTheme={changeBgTheme}
          coupleId={coupleId}
          photoBank={photoBank}
          onAddToPhotoBank={addPhotoBankItem}
          onRemoveFromPhotoBank={removePhotoBankItem}
        />
      )}
      {/* Only shown while actively inside a notebook — on the library
          screen there's nothing being edited, so a stale "Non sauvegardé"
          pill (e.g. left over from an earlier failed save) would be
          misleading rather than informative. */}
      {activeNotebook && <SaveIndicator status={saveStatus} topInset={insets.top + 8} />}
      <AppAlert {...alertProps} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#141210',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
  },
  errorDetail: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: -8,
  },
  retryButton: {
    backgroundColor: '#e0a92f',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
  },
  retryText: {
    color: '#201c18',
    fontSize: 15,
    fontWeight: '600',
  },
});
