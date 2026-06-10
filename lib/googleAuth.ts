const TOKEN_STORAGE_KEY = 'motomaint_gcp_tokens';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  issued_at?: number;
}

export interface GoogleAuthState {
  isAuthenticated: boolean;
  hasValidToken: boolean;
  email?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: CodeClientConfig) => CodeClient;
          revoke: (token: string, callback: (response: RevokeResponse) => void) => void;
        };
      };
    };
  }
}

interface CodeClientConfig {
  client_id: string;
  scope: string;
  ux_mode: 'popup' | 'redirect';
  callback: (response: CodeResponse) => void;
  redirect_uri?: string;
  state?: string;
  login_hint?: string;
  error_callback?: (response: ErrorResponse) => void;
}

interface CodeClient {
  requestCode: () => void;
}

interface CodeResponse {
  code: string;
  state?: string;
}

interface ErrorResponse {
  error: string;
  error_description?: string;
}

interface RevokeResponse {
  successful?: boolean;
  error?: string;
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

function encryptToken(token: string, key: string): string {
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(token)));
  const keyEncoded = btoa(String.fromCharCode(...new TextEncoder().encode(key)));
  return `${keyEncoded}:${encoded}`;
}

function decryptToken(encrypted: string, key: string): string | null {
  try {
    const [keyEncoded, encoded] = encrypted.split(':');
    const expectedKey = btoa(String.fromCharCode(...new TextEncoder().encode(key)));
    if (keyEncoded !== expectedKey) return null;
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function getStorageKey(): string {
  return 'mk_' + navigator.userAgent.slice(-32);
}

export function saveTokens(tokens: GoogleTokens): void {
  const key = getStorageKey();
  const encrypted = encryptToken(JSON.stringify(tokens), key);
  localStorage.setItem(TOKEN_STORAGE_KEY, encrypted);
}

export function loadTokens(): GoogleTokens | null {
  try {
    const key = getStorageKey();
    const encrypted = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!encrypted) return null;
    const decrypted = decryptToken(encrypted, key);
    if (!decrypted) return null;
    return JSON.parse(decrypted) as GoogleTokens;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function isTokenExpired(tokens: GoogleTokens): boolean {
  if (!tokens.issued_at) return true;
  const now = Date.now();
  const expiresAt = tokens.issued_at + tokens.expires_in * 1000;
  return now >= expiresAt - 60000;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const response = await fetch('/api/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to exchange code');
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const response = await fetch('/api/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to refresh token');
  }

  return response.json();
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens?.access_token) return null;

  if (isTokenExpired(tokens)) {
    if (!tokens.refresh_token) return null;
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      newTokens.issued_at = Date.now();
      saveTokens(newTokens);
      return newTokens.access_token;
    } catch {
      clearTokens();
      return null;
    }
  }

  return tokens.access_token;
}

export function getAuthState(): GoogleAuthState {
  const tokens = loadTokens();
  if (!tokens?.access_token) {
    return { isAuthenticated: false, hasValidToken: false };
  }
  return {
    isAuthenticated: true,
    hasValidToken: !isTokenExpired(tokens),
  };
}

export function initGoogleAuth(callback: (response: CodeResponse) => void): CodeClient | null {
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    return null;
  }

  const state = generateState();
  sessionStorage.setItem('google_oauth_state', state);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }

  return window.google.accounts.oauth2.initCodeClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file',
    ux_mode: 'popup',
    callback,
    state,
    error_callback: (error) => {
      console.error('Google OAuth error:', error);
    },
  });
}

export function revokeGoogleAccess(): Promise<void> {
  return new Promise((resolve, reject) => {
    const tokens = loadTokens();
    if (!tokens?.access_token) {
      clearTokens();
      resolve();
      return;
    }

    window.google?.accounts?.oauth2?.revoke(tokens.access_token, (response) => {
      clearTokens();
      if (response.successful) {
        resolve();
      } else {
        reject(new Error(response.error || 'Failed to revoke'));
      }
    });
  });
}