import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native';

const DIGIT_FONT = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppAlert from '../components/AppAlert';
import { useAppAlert } from '../utils/useAppAlert';
import { createCouple, joinCouple } from '../data/coupleAuth';

export default function PairingScreen({ onPaired }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('choose'); // 'choose' | 'created' | 'joining'
  const [busy, setBusy] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [pendingCoupleId, setPendingCoupleId] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const { alertProps, showAlert } = useAppAlert();

  const handleCreate = async () => {
    setBusy(true);
    try {
      const { coupleId, inviteCode: code } = await createCouple();
      setInviteCode(code);
      setPendingCoupleId(coupleId);
      setMode('created');
    } catch (e) {
      showAlert('Erreur', e.message || "Impossible de créer l'espace.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const digits = joinCode.replace(/[^0-9]/g, '');
    if (digits.length !== 6) {
      showAlert('Code invalide', 'Le code fait 6 chiffres.');
      return;
    }
    setBusy(true);
    try {
      const coupleId = await joinCouple(digits);
      onPaired(coupleId);
    } catch (e) {
      showAlert('Erreur', e?.message || "Ce code ne correspond à aucun espace.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.wordmark}>Ours</Text>

        {mode === 'choose' && (
          <>
            <Text style={styles.subtitle}>Créez votre espace à deux</Text>
            <Pressable style={styles.primaryButton} onPress={handleCreate} disabled={busy}>
              {busy ? <ActivityIndicator color="#201c18" /> : <Text style={styles.primaryText}>Créer un espace</Text>}
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setMode('joining')}>
              <Text style={styles.secondaryText}>Rejoindre avec un code</Text>
            </Pressable>
          </>
        )}

        {mode === 'created' && (
          <>
            <Text style={styles.subtitle}>Partage ce code avec ton/ta partenaire</Text>
            <Text style={styles.codeDisplay}>{inviteCode}</Text>
            <Text style={styles.hint}>
              Il/elle doit ouvrir l'app, choisir « Rejoindre avec un code » et entrer ce code.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => onPaired(pendingCoupleId)}>
              <Text style={styles.primaryText}>C'est fait, continuer</Text>
            </Pressable>
          </>
        )}

        {mode === 'joining' && (
          <>
            <Text style={styles.subtitle}>Entre le code reçu de ton/ta partenaire</Text>
            <TextInput
              style={styles.codeInput}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="000000"
              placeholderTextColor="rgba(255,255,255,0.25)"
              maxLength={6}
              textAlign="center"
              autoFocus
            />
            <Pressable style={styles.primaryButton} onPress={handleJoin} disabled={busy}>
              {busy ? <ActivityIndicator color="#201c18" /> : <Text style={styles.primaryText}>Rejoindre</Text>}
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setMode('choose')}>
              <Text style={styles.secondaryText}>Retour</Text>
            </Pressable>
          </>
        )}
      </View>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141210',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  wordmark: {
    color: '#f2e9d8',
    fontSize: 32,
    fontStyle: 'italic',
    fontWeight: '300',
    letterSpacing: 1,
    marginBottom: 40,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    maxWidth: 280,
  },
  codeDisplay: {
    color: '#e0a92f',
    fontFamily: DIGIT_FONT,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 8,
    marginBottom: 8,
  },
  codeInput: {
    color: '#f2f2f2',
    fontFamily: DIGIT_FONT,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.25)',
    width: 220,
    paddingVertical: 10,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: '#e0a92f',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 26,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryText: {
    color: '#201c18',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 18,
    paddingVertical: 8,
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
  },
});
