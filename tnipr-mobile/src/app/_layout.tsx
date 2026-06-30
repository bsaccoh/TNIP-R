import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RecordingProvider } from '@/context/RecordingContext';
import AppSplashScreen from '@/components/SplashScreen';

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setOnboardingDone(!!val);
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

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

  if (loading || !onboardingChecked) return <AppSplashScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <AuthProvider>
      <RecordingProvider>
        <RouteGuard>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }} />
        </RouteGuard>
      </RecordingProvider>
    </AuthProvider>
  );
}
