import { createContext, useContext, useEffect, useState } from 'react';
import { get } from '../api/client';

const SettingsContext = createContext({ platformName: 'TNIP-R', regulatorName: 'Regulatory Intelligence', settings: {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    get('/settings')
      .then(r => setSettings(r.data || {}))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const value = {
    settings,
    reload: () => get('/settings').then(r => setSettings(r.data || {})).catch(() => {}),
    platformName: settings.platform_name || 'TNIP-R',
    regulatorName: settings.regulator_name || 'Regulatory Intelligence',
    loaded,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
