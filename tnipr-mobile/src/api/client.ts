import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getBaseUrl() {
  return (await AsyncStorage.getItem('server_url')) || '';
}

const client = axios.create({ timeout: 15000 });

client.interceptors.request.use(async (config) => {
  if (!config.baseURL) config.baseURL = await getBaseUrl();
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = (async () => {
            const rt = await SecureStore.getItemAsync('refresh_token');
            if (!rt) throw new Error('No refresh token');
            const base = await getBaseUrl();
            const { data } = await axios.post(`${base}/auth/refresh`, { refreshToken: rt });
            const newToken = data.data.accessToken;
            await SecureStore.setItemAsync('access_token', newToken);
            return newToken;
          })().finally(() => { refreshing = null; });
        }
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        original.baseURL = await getBaseUrl();
        return client(original);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        throw error;
      }
    }
    throw error;
  },
);

export default client;
