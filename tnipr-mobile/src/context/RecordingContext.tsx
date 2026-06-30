import React, { createContext, useContext, useRef, useState } from 'react';
import { LiveSample } from '@/api/drivetest';

interface RecordingSession {
  testId: number;
  startedAt: number;
  samples: LiveSample[];
  paused: boolean;
}

interface RecordingContextValue {
  session: RecordingSession | null;
  startSession: (testId: number) => void;
  addSample: (s: LiveSample) => void;
  togglePause: () => void;
  clearSession: () => void;
  pendingQueue: React.MutableRefObject<LiveSample[]>;
}

const RecordingContext = createContext<RecordingContextValue>({} as RecordingContextValue);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<RecordingSession | null>(null);
  const pendingQueue = useRef<LiveSample[]>([]);

  const startSession = (testId: number) => {
    pendingQueue.current = [];
    setSession({ testId, startedAt: Date.now(), samples: [], paused: false });
  };

  const addSample = (s: LiveSample) => {
    pendingQueue.current.push(s);
    setSession((prev) => prev ? { ...prev, samples: [...prev.samples, s] } : prev);
  };

  const togglePause = () => {
    setSession((prev) => prev ? { ...prev, paused: !prev.paused } : prev);
  };

  const clearSession = () => {
    pendingQueue.current = [];
    setSession(null);
  };

  return (
    <RecordingContext.Provider value={{ session, startSession, addSample, togglePause, clearSession, pendingQueue }}>
      {children}
    </RecordingContext.Provider>
  );
}

export const useRecording = () => useContext(RecordingContext);
