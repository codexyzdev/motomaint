import { notifyAuthChange } from './authEvents';

const TOKEN_STORAGE_KEY = 'motomaint:google_access_token';

export interface StoredAccessToken {
  access_token: string;
  expires_at: number;
}

export interface GoogleAuthState {
  isAuthenticated: boolean;
  hasValidToken: boolean;
}

export function saveAccessToken(token: { access_token: string; expires_in: number }): void {
  const stored: StoredAccessToken = {
    access_token: token.access_token,
    expires_at: Date.now() + token.expires_in * 1000,
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored));
  notifyAuthChange(true);
}

export function loadAccessToken(): StoredAccessToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAccessToken;
    if (!parsed.access_token || typeof parsed.expires_at !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  notifyAuthChange(false);
}

export function isTokenValid(token: StoredAccessToken): boolean {
  return Date.now() < token.expires_at - 60_000;
}

export function getAuthState(): GoogleAuthState {
  const token = loadAccessToken();
  if (!token) return { isAuthenticated: false, hasValidToken: false };
  const valid = isTokenValid(token);
  if (!valid) {
    clearAccessToken();
    return { isAuthenticated: false, hasValidToken: false };
  }
  return { isAuthenticated: true, hasValidToken: true };
}

export async function getValidAccessToken(): Promise<string | null> {
  const state = getAuthState();
  return state.hasValidToken ? loadAccessToken()?.access_token ?? null : null;
}

export async function getValidAccessTokenWithRefresh(): Promise<string | null> {
  return getValidAccessToken();
}

export { subscribeAuthChange } from './authEvents';
