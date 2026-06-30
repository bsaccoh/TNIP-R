import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RecordingProvider } from '@/context/RecordingContext';

function RouteGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    if (!user && !inLogin) router.replace('/login');
    else if (user && inLogin) router.replace('/(tabs)');
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <AuthProvider>
      <RecordingProvider>
        <RouteGuard />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
      </RecordingProvider>
    </AuthProvider>
  );
}
