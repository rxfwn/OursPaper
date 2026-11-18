import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const [RootNavigator, setRootNavigator] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (Platform.OS === 'web') {
        // Must fully resolve before RootNavigator (and anything under it that
        // touches @shopify/react-native-skia) is even imported: Skia.web.js reads
        // global.CanvasKit at module-evaluation time, not at render time.
        const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web');
        await LoadSkiaWeb();
      }
      const mod = await import('./src/RootNavigator');
      if (!cancelled) setRootNavigator(() => mod.default);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {RootNavigator ? (
          <RootNavigator />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color="#f2e9d8" />
          </View>
        )}
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#141210',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
