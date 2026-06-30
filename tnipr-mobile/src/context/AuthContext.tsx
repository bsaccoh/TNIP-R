import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, User } from '@/api/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync('user_json');
        if (raw) setUser(JSON.parse(raw));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    await SecureStore.setItemAsync('access_token', result.accessToken);
    await SecureStore.setItemAsync('refresh_token', result.refreshToken);
    await SecureStore.setItemAsync('user_json', JSON.stringify(result.user));
    setUser(result.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_json');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
