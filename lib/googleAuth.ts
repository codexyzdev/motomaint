import { notifyAuthChange } from './authEvents';

const TOKEN_STORAGE_KEY = 'motomaint:google_access_token';

const UNAUTHENTICATED_STATE: GoogleAuthState = Object.freeze({
  isAuthenticated: false,
  hasValidToken: false,
});
const AUTHENTICATED_STATE: GoogleAuthState = Object.freeze({
  isAuthenticated: true,
  hasValidToken: true,
});

let cachedState: GoogleAuthState | null = null;

function invalidateAuthState() {
  cachedState = null;
}

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
  invalidateAuthState();
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
  invalidateAuthState();
  notifyAuthChange(false);
}

export function isTokenValid(token: StoredAccessToken): boolean {
  return Date.now() < token.expires_at - 60_000;
}

export function getAuthState(): GoogleAuthState {
  if (cachedState !== null) return cachedState;

  const token = loadAccessToken();
  if (!token || !isTokenValid(token)) {
    if (token) clearAccessToken();
    cachedState = UNAUTHENTICATED_STATE;
  } else {
    cachedState = AUTHENTICATED_STATE;
  }
  return cachedState;
}

export async function getValidAccessToken(): Promise<string | null> {
  return getAuthState().hasValidToken ? loadAccessToken()?.access_token ?? null : null;
}

export async function getValidAccessTokenWithRefresh(): Promise<string | null> {
  return getValidAccessToken();
}

export { subscribeAuthChange } from './authEvents';
