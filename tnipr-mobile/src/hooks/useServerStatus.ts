import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export type ServerStatus = 'checking' | 'online' | 'offline' | 'unknown';

/**
 * Polls the configured server URL every `intervalMs` ms with a lightweight
 * GET /health request. Returns `status`, `latencyMs`, and `recheck()` for
 * on-demand retries.
 */
export function useServerStatus(intervalMs = 30_000) {
  const [status, setStatus]   = useState<ServerStatus>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    setStatus('checking');
    try {
      const base = (await AsyncStorage.getItem('server_url')) || '';
      if (!base) { setStatus('unknown'); return; }
      const t0 = Date.now();
      await axios.get(`${base}/health`, { timeout: 5000 });
      setLatency(Date.now() - t0);
      setStatus('online');
    } catch {
      setLatency(null);
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    check();
    timer.current = setInterval(check, intervalMs);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [check, intervalMs]);

  return { status, latency, recheck: check };
}
