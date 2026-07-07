import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api = axios.create({ baseURL: BASE });

const TOKEN_KEY = 'tnipr_access';
const REFRESH_KEY = 'tnipr_refresh';

export const tokenStore = {
  get access() { return localStorage.getItem(TOKEN_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); },
};

// Attach bearer token.
api.interceptors.request.use((config) => {
  const t = tokenStore.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Auto-refresh once on 401, then retry.
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh', { refreshToken: tokenStore.refresh });
        const { data } = await refreshing;
        refreshing = null;
        tokenStore.set({ accessToken: data.data.accessToken });
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

// Unwrap { data } envelope; expose meta when present.
export async function get(url, params) {
  const r = await api.get(url, { params });
  return r.data;
}
export async function post(url, body, config) {
  const r = await api.post(url, body, config);
  return r.data;
}
export async function put(url, body) {
  const r = await api.put(url, body);
  return r.data;
}
export async function patch(url, body) {
  const r = await api.patch(url, body);
  return r.data;
}
export async function del(url) {
  const r = await api.delete(url);
  return r.data;
}
