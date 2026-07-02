/**
 * App configuration constants.
 * No secrets here — only public endpoints and static domain lists.
 */

/**
 * Backend base URL.
 * Default targets the Android emulator loopback (10.0.2.2 → host machine).
 * Change to the LAN IP of the API host when testing on a physical device.
 */
export const API_BASE_URL = 'http://10.0.2.2:5080';

/** HTTP timeout — short enough for a responsive offline fallback. */
export const REQUEST_TIMEOUT_MS = 10000;

/** Merchandise source regions (static picker list, spec §6.1). */
export const SOURCES: readonly string[] = [
  'Souss-Massa (Agadir)',
  'Doukkala (El Jadida)',
  'Gharb (Kénitra)',
  'Saïss (Meknès)',
  'Import',
];
