/**
 * AsyncStorage helpers: authenticated session persistence and
 * the offline queue of pre-declarations awaiting synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NewPreDeclarationPayload, Session } from '../types';

const SESSION_KEY = '@mgfl/session';
const QUEUE_KEY = '@mgfl/offline-queue';

export interface QueuedPreDeclaration {
  /** ISO date the entry was queued (display / debugging). */
  queuedAt: string;
  payload: NewPreDeclarationPayload;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function saveSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Returns the stored session, or null if absent or expired. */
export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as Session;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

// ---------------------------------------------------------------------------
// Offline queue
// ---------------------------------------------------------------------------

export async function getQueue(): Promise<QueuedPreDeclaration[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedPreDeclaration[]) : [];
  } catch {
    return [];
  }
}

export async function enqueuePreDeclaration(payload: NewPreDeclarationPayload): Promise<void> {
  const queue = await getQueue();
  queue.push({ queuedAt: new Date().toISOString(), payload });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function replaceQueue(queue: QueuedPreDeclaration[]): Promise<void> {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } else {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}
