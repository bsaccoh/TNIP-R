import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RecordingProvider } from '@/context/RecordingContext';
import { ThemeProvider, useThemeContext } from '@/context/ThemeContext';
import AppSplashScreen from '@/components/SplashScreen';

function RouteGuard({ onReady }: { onReady: () => void }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const readyFired = useRef(false);

  useEffect(() => {
    if (loading) return;

    // Re-read AsyncStorage every time so we never act on stale state
    AsyncStorage.getItem('onboarding_done').then((val) => {
      const onboardingDone = !!val;

      if (!readyFired.current) {
        readyFired.current = true;
        onReady();
      }

      const inOnboarding = segments[0] === 'onboarding';
      const inLogin = segments[0] === 'login';

      // 1. Must complete onboarding first
      if (!onboardingDone) {
        if (!inOnboarding) router.replace('/onboarding');
        return;
      }

      // 2. Must be authenticated
      if (!user) {
        if (!inLogin) router.replace('/login');
        return;
      }

      // 3. Authenticated — leave auth/onboarding screens
      if (inLogin || inOnboarding) {
        router.replace('/(tabs)');
      }
    });
  }, [user, loading, segments]);

  return null;
}

function SplashOverlay({ ready }: { ready: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!ready) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 500,
      delay: 200,
      useNativeDriver: true,
    }).start(() => setMounted(false));
  }, [ready]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity, zIndex: 999 }]}
      pointerEvents={ready ? 'none' : 'auto'}
    >
      <AppSplashScreen />
    </Animated.View>
  );
}

function AppShell() {
  const { isDark } = useThemeContext();
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  return (
    <AuthProvider>
      <RecordingProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
        <RouteGuard onReady={markReady} />
        <SplashOverlay ready={ready} />
      </RecordingProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
