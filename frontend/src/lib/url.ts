/**
 * Unified URL service for QuickSync.
 * Derives all endpoint URLs from a single NEXT_PUBLIC_API_URL variable.
 *
 * Example: NEXT_PUBLIC_API_URL=https://xyz-quicksync.hf.space
 *   → API:  https://xyz-quicksync.hf.space
 *   → WS:   wss://xyz-quicksync.hf.space
 *
 * Example: NEXT_PUBLIC_API_URL=http://localhost:8000
 *   → API:  http://localhost:8000
 *   → WS:   ws://localhost:8000
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Base HTTP URL for REST API calls. */
export function getApiUrl(): string {
  return BASE_URL;
}

/** Base WebSocket URL derived from the API URL. */
export function getWsUrl(): string {
  return BASE_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
}
