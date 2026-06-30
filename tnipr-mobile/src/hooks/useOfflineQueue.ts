import { useCallback, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LiveSample, appendSamples } from '@/api/drivetest';

const KEY = (id: number) => `offline_queue_${id}`;

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'offline' | 'error';

export function useOfflineQueue(testId: number | null) {
  const flushing = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const refreshCount = useCallback(async () => {
    if (!testId) return;
    try {
      const raw = await AsyncStorage.getItem(KEY(testId));
      setPendingCount(raw ? (JSON.parse(raw) as LiveSample[]).length : 0);
    } catch {}
  }, [testId]);

  const enqueue = useCallback(async (samples: LiveSample[]) => {
    if (!testId || !samples.length) return;
    try {
      const raw = await AsyncStorage.getItem(KEY(testId));
      const existing: LiveSample[] = raw ? JSON.parse(raw) : [];
      const merged = [...existing, ...samples];
      await AsyncStorage.setItem(KEY(testId), JSON.stringify(merged));
      setPendingCount(merged.length);
    } catch {}
  }, [testId]);

  const flush = useCallback(async (liveBatch?: LiveSample[]): Promise<boolean> => {
    if (!testId || flushing.current) return false;
    flushing.current = true;
    setSyncStatus('syncing');
    try {
      // Merge live batch (in-memory) with anything already queued in storage
      const raw = await AsyncStorage.getItem(KEY(testId));
      const queued: LiveSample[] = raw ? JSON.parse(raw) : [];
      const toSend = [...(liveBatch ?? []), ...queued];
      if (!toSend.length) {
        setSyncStatus('idle');
        return true;
      }
      await appendSamples(testId, toSend);
      await AsyncStorage.removeItem(KEY(testId));
      setPendingCount(0);
      setSyncStatus('ok');
      setLastSyncAt(new Date());
      return true;
    } catch (err: any) {
      // Network errors → queue the live batch for later
      if (liveBatch?.length) {
        await enqueue(liveBatch);
      } else {
        await refreshCount();
      }
      const isNetworkErr =
        err?.code === 'ERR_NETWORK' ||
        err?.message?.toLowerCase().includes('network') ||
        err?.message?.toLowerCase().includes('timeout');
      setSyncStatus(isNetworkErr ? 'offline' : 'error');
      return false;
    } finally {
      flushing.current = false;
    }
  }, [testId, enqueue, refreshCount]);

  const clear = useCallback(async () => {
    if (testId) {
      await AsyncStorage.removeItem(KEY(testId));
      setPendingCount(0);
    }
  }, [testId]);

  return { enqueue, flush, clear, pendingCount, syncStatus, lastSyncAt };
}
