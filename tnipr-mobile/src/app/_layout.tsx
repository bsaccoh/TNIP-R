import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RecordingProvider } from '@/context/RecordingContext';
import AppSplashScreen from '@/components/SplashScreen';

// Handles redirects — never blocks rendering
function RouteGuard({ onReady }: { onReady: () => void }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const readyFired = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setOnboardingDone(!!val);
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    // Signal the overlay to fade out
    if (!readyFired.current) {
      readyFired.current = true;
      onReady();
    }

    const inOnboarding = segments[0] === 'onboarding';
    const inLogin = segments[0] === 'login';

    if (!onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (onboardingDone && !user && !inLogin && !inOnboarding) {
      router.replace('/login');
      return;
    }
    if (user && (inLogin || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, onboardingChecked, onboardingDone]);

  return null;
}

// Fades out once ready
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
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 999 }]} pointerEvents={ready ? 'none' : 'auto'}>
      <AppSplashScreen />
    </Animated.View>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);

  return (
    <AuthProvider>
      <RecordingProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
        <RouteGuard onReady={() => setReady(true)} />
        <SplashOverlay ready={ready} />
      </RecordingProvider>
    </AuthProvider>
  );
}
