'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { initGoogleAuth, exchangeCodeForTokens, saveTokens, getAuthState } from '@/lib/googleAuth';
import { subscribeAuthChange } from '@/lib/authEvents';
import { useToast } from '@/components/ui/useToast';

interface GoogleLoginButtonProps {
  onAuthenticated?: () => void;
}

export function GoogleLoginButton({ onAuthenticated }: GoogleLoginButtonProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    const checkAuth = () => {
      const state = getAuthState();
      setIsAuthenticated(state.isAuthenticated);
      setIsReady(true);
    };

    checkAuth();

    const timeout = setTimeout(() => {
      if (!isReady) setIsReady(true);
    }, 2000);

    const unsubscribe = subscribeAuthChange((authenticated) => {
      setIsAuthenticated(authenticated);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [isReady]);

  const handleLogin = useCallback(() => {
    if (processingRef.current) return;
    if (!window.google?.accounts?.oauth2) {
      showToast('Google no disponible. Recarga la página.', 'danger');
      return;
    }

    processingRef.current = true;
    setIsLoading(true);

    const timeout = setTimeout(() => {
      processingRef.current = false;
      setIsLoading(false);
    }, 30000);

    const client = initGoogleAuth((response: { code?: string }) => {
      clearTimeout(timeout);
      processingRef.current = false;

      if (response.code) {
        setIsLoading(true);
        exchangeCodeForTokens(response.code)
          .then((tokens) => {
            saveTokens(tokens);
            setIsAuthenticated(true);
            showToast('Conectado con Google', 'success');
            onAuthenticated?.();
          })
          .catch((error) => {
            console.error('Auth error:', error);
            showToast('Error al conectar con Google', 'danger');
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    });

    if (client) {
      client.requestCode();
    } else {
      clearTimeout(timeout);
      processingRef.current = false;
      setIsLoading(false);
      showToast('Error al iniciar Google. Recarga la página.', 'danger');
    }
  }, [showToast, onAuthenticated]);

  if (!isReady) {
    return (
      <button className="btn btn-secondary" disabled>
        <span className="loading-spinner" aria-hidden="true" />
        Conectando...
      </button>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="sync-connected">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>Google Drive conectado</span>
      </div>
    );
  }

  return (
    <button
      className="btn btn-secondary google-btn"
      onClick={handleLogin}
      disabled={isLoading}
      type="button"
    >
      {isLoading ? (
        <>
          <span className="loading-spinner" aria-hidden="true" />
          Conectando...
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Conectar con Google Drive
        </>
      )}
    </button>
  );
}