import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, post, tokenStore } from '../api/client';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokenStore.access) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data ?? data);
    } catch {
      tokenStore.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await post('/auth/login', { email, password });
    tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    // Load full profile (includes effective permissions) instead of the bare login payload
    const { data: meData } = await api.get('/auth/me');
    const fullUser = meData.data ?? meData;
    setUser(fullUser);
    return fullUser;
  };

  const logout = async () => {
    try { await post('/auth/logout', { refreshToken: tokenStore.refresh }); } catch { /* ignore */ }
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
