import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RecordingProvider } from '@/context/RecordingContext';
import AppSplashScreen from '@/components/SplashScreen';

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    if (!user && !inLogin) router.replace('/login');
    else if (user && inLogin) router.replace('/(tabs)');
  }, [user, loading, segments]);

  if (loading) return <AppSplashScreen />;
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
