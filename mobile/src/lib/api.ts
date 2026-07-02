/**
 * Axios API client for the MGFL backend.
 * - Bearer token injection (set after login / session restore).
 * - Offline queue flush attempted after every successful network call.
 * - Fallback article list when the backend is unreachable.
 * - Multipart photo upload (local URI → server URL) used before declaring.
 */

import axios from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { getQueue, replaceQueue } from './storage';
import type {
  Article,
  NewPreDeclarationPayload,
  PreDeclaration,
  Session,
} from '../types';
import type { QueuedPreDeclaration } from './storage';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// After any successful call the network is up: opportunistically flush the queue.
client.interceptors.response.use((response) => {
  if (!isFlushing) {
    void flushOfflineQueue();
  }
  return response;
});

/** True when the error is a connectivity failure (no HTTP response at all). */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

/** HTTP status of an axios error, or null for network errors. */
export function errorStatus(error: unknown): number | null {
  return axios.isAxiosError(error) && error.response ? error.response.status : null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(username: string, password: string): Promise<Session> {
  const { data } = await client.post<Session>('/api/auth/login', { username, password });
  return data;
}

// ---------------------------------------------------------------------------
// Photo upload
// ---------------------------------------------------------------------------

/** True when the URI points to a file on the device (photo not yet uploaded). */
function isLocalUri(uri: string): boolean {
  return uri.startsWith('file:') || uri.startsWith('content:');
}

/** Builds the multipart file descriptor, deriving name/MIME from the URI extension. */
function photoFilePart(localUri: string): { uri: string; name: string; type: string } {
  const path = localUri.replace(/[?#].*$/, '').toLowerCase();
  if (path.endsWith('.png')) {
    return { uri: localUri, name: 'photo.png', type: 'image/png' };
  }
  if (path.endsWith('.webp')) {
    return { uri: localUri, name: 'photo.webp', type: 'image/webp' };
  }
  return { uri: localUri, name: 'photo.jpg', type: 'image/jpeg' };
}

/**
 * Uploads a local device photo to the backend.
 * Returns the server URL of the stored file (path relative to the API base URL,
 * e.g. "/uploads/photos/<guid>.jpg").
 */
export async function uploadPhoto(localUri: string): Promise<string> {
  const form = new FormData();
  // React Native FormData accepts a { uri, name, type } file descriptor.
  form.append('file', photoFilePart(localUri) as unknown as Blob);
  const { data } = await client.post<{ url: string }>('/api/uploads/photos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}

// ---------------------------------------------------------------------------
// Pre-declarations
// ---------------------------------------------------------------------------

export async function fetchPreDeclarations(): Promise<PreDeclaration[]> {
  const { data } = await client.get<PreDeclaration[]>('/api/pre-declarations');
  return data;
}

export async function createPreDeclaration(
  payload: NewPreDeclarationPayload
): Promise<PreDeclaration> {
  const { data } = await client.post<PreDeclaration>('/api/pre-declarations', payload);
  return data;
}

// ---------------------------------------------------------------------------
// Articles (with offline fallback)
// ---------------------------------------------------------------------------

/** Static fallback used when the backend is unreachable (offline mode). */
export const FALLBACK_ARTICLES: Article[] = [
  { code: 'ART-001', name: 'Pomme de terre', famille: 'Légumes', referenceWeightPerCrate: 30, referencePrice: 4.5, taxUnitPrice: 0.05 },
  { code: 'ART-002', name: 'Tomate', famille: 'Légumes', referenceWeightPerCrate: 28, referencePrice: 5.0, taxUnitPrice: 0.05 },
  { code: 'ART-003', name: 'Oignon', famille: 'Légumes', referenceWeightPerCrate: 25, referencePrice: 4.0, taxUnitPrice: 0.05 },
  { code: 'ART-004', name: 'Fraise', famille: 'Fruits', referenceWeightPerCrate: 8, referencePrice: 15.0, taxUnitPrice: 0.05 },
  { code: 'ART-005', name: 'Courgette', famille: 'Légumes', referenceWeightPerCrate: 18, referencePrice: 6.0, taxUnitPrice: 0.05 },
  { code: 'ART-006', name: 'Carotte', famille: 'Légumes', referenceWeightPerCrate: 22, referencePrice: 3.5, taxUnitPrice: 0.05 },
  { code: 'ART-007', name: 'Poivron', famille: 'Légumes', referenceWeightPerCrate: 12, referencePrice: 8.0, taxUnitPrice: 0.05 },
  { code: 'ART-008', name: 'Orange', famille: 'Fruits', referenceWeightPerCrate: 15, referencePrice: 5.5, taxUnitPrice: 0.05 },
];

export async function fetchArticles(): Promise<Article[]> {
  try {
    const { data } = await client.get<Article[]>('/api/articles');
    return data.length > 0 ? data : FALLBACK_ARTICLES;
  } catch {
    return FALLBACK_ARTICLES;
  }
}

// ---------------------------------------------------------------------------
// Offline queue synchronization
// ---------------------------------------------------------------------------

let isFlushing = false;

/**
 * Attempts to POST every queued pre-declaration.
 * Entries whose photoUrl is still a local device URI are uploaded first and the
 * server URL is substituted; a network failure keeps the entry queued, while a
 * server rejection (4xx: bad type/size) drops the photo but still syncs the
 * declaration. Entries that still fail remain in the queue. Returns the number synced.
 */
export async function flushOfflineQueue(): Promise<number> {
  if (isFlushing) {
    return 0;
  }
  isFlushing = true;
  try {
    const queue = await getQueue();
    if (queue.length === 0) {
      return 0;
    }
    const remaining: QueuedPreDeclaration[] = [];
    let synced = 0;
    for (const entry of queue) {
      let payload = entry.payload;
      if (payload.photoUrl && isLocalUri(payload.photoUrl)) {
        try {
          payload = { ...payload, photoUrl: await uploadPhoto(payload.photoUrl) };
        } catch (e) {
          if (isNetworkError(e)) {
            remaining.push(entry);
            continue;
          }
          // Rejected by the server (type/size): sync the declaration without the photo.
          payload = { ...payload, photoUrl: null };
        }
      }
      try {
        await client.post('/api/pre-declarations', payload);
        synced += 1;
      } catch {
        // Keep any uploaded server URL so the photo is not re-uploaded next flush.
        remaining.push({ ...entry, payload });
      }
    }
    await replaceQueue(remaining);
    return synced;
  } finally {
    isFlushing = false;
  }
}
