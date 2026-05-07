export interface SessionRecord {
  id: string;
  subject: string;
  date: string;
  duration: string;
  maxStress: number;
  status: string;
}

const STORAGE_KEY = "lie_detector_sessions";

export const getSessions = (): SessionRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const addSession = (session: Omit<SessionRecord, "id">) => {
  const sessions = getSessions();
  const newSession: SessionRecord = {
    ...session,
    id: `SYS-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newSession, ...sessions]));
};

export const clearSessions = () => {
  localStorage.removeItem(STORAGE_KEY);
};
