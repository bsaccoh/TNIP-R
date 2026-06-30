import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme';

function Icon(name: keyof typeof Ionicons.glyphMap, focused: boolean, color: any) {
  const iconName = focused ? name : (name + '-outline') as keyof typeof Ionicons.glyphMap;
  return <Ionicons name={iconName} size={23} color={color} />;
}

export default function TabLayout() {
  const dark = useColorScheme() === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: dark ? '#64748B' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: dark ? '#1A1D27' : '#FFFFFF',
          borderTopColor: dark ? '#2D3148' : '#E2E8F0',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => Icon('home', focused, color) }}
      />
      <Tabs.Screen
        name="record"
        options={{ title: 'Record', tabBarIcon: ({ focused, color }) => Icon('radio-button-on', focused, color) }}
      />
      <Tabs.Screen
        name="tests"
        options={{ title: 'My Tests', tabBarIcon: ({ focused, color }) => Icon('list', focused, color) }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ focused, color }) => Icon('settings', focused, color) }}
      />
    </Tabs>
  );
}
