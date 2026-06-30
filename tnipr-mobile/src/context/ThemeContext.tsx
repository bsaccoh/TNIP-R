import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorMode: 'system',
  setColorMode: async () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('color_mode').then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setColorModeState(val as ColorMode);
      }
    });
  }, []);

  const setColorMode = async (mode: ColorMode) => {
    await AsyncStorage.setItem('color_mode', mode);
    setColorModeState(mode);
  };

  const isDark =
    colorMode === 'system' ? systemScheme === 'dark' : colorMode === 'dark';

  return (
    <ThemeContext.Provider value={{ colorMode, setColorMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
