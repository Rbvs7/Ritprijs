import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Banner, Screen } from '../components/ui';
import { AppStateProvider, useApp } from '../state/AppState';
import { PlannerProvider } from '../state/Planner';
import { darkPalette, lightPalette, ThemeContext } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <PlannerProvider>
          <Themed />
        </PlannerProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function Themed() {
  const { prefs, ready, error } = useApp();
  const system = useColorScheme();
  const scheme = prefs.theme === 'system' ? (system === 'light' ? 'light' : 'dark') : prefs.theme; // dark-first
  const c = scheme === 'light' ? lightPalette : darkPalette;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  const navTheme = {
    ...(scheme === 'light' ? DefaultTheme : DarkTheme),
    colors: { ...(scheme === 'light' ? DefaultTheme : DarkTheme).colors, background: c.bg, card: c.surface, text: c.text, border: c.border, primary: c.accent },
  };

  return (
    <ThemeContext.Provider value={c}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
        {!ready ? (
          <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : error ? (
          <Screen>
            <Banner kind="danger">{error}</Banner>
          </Screen>
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen name="split" options={{ presentation: 'modal' }} />
            <Stack.Screen name="vehicle-edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="expense" options={{ presentation: 'modal' }} />
          </Stack>
        )}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
