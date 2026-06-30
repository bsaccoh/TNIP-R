import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LiveSample, appendSamples } from '@/api/drivetest';

const KEY = (id: number) => `offline_queue_${id}`;

export function useOfflineQueue(testId: number | null) {
  const flushing = useRef(false);

  const enqueue = useCallback(async (samples: LiveSample[]) => {
    if (!testId || !samples.length) return;
    try {
      const raw = await AsyncStorage.getItem(KEY(testId));
      const existing: LiveSample[] = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(KEY(testId), JSON.stringify([...existing, ...samples]));
    } catch {}
  }, [testId]);

  const flush = useCallback(async () => {
    if (!testId || flushing.current) return;
    flushing.current = true;
    try {
      const raw = await AsyncStorage.getItem(KEY(testId));
      if (!raw) return;
      const samples: LiveSample[] = JSON.parse(raw);
      if (!samples.length) return;
      await appendSamples(testId, samples);
      await AsyncStorage.removeItem(KEY(testId));
    } catch {} finally {
      flushing.current = false;
    }
  }, [testId]);

  const clear = useCallback(async () => {
    if (testId) await AsyncStorage.removeItem(KEY(testId));
  }, [testId]);

  return { enqueue, flush, clear };
}
