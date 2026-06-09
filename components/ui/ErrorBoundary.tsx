'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Root React Error Boundary for catching unexpected render errors.
 * Data errors are handled at call-site with try/catch + toast — this
 * boundary is the last safety net for uncaught render exceptions.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            padding: '2rem',
            background: '#0f1115',
            color: '#f3f4f6',
            textAlign: 'center',
          },
        },
        React.createElement('p', { style: { fontSize: '2rem', marginBottom: '0.5rem' } }, '⚠️'),
        React.createElement(
          'p',
          { style: { fontWeight: 600, marginBottom: '0.25rem' } },
          'Algo salió mal',
        ),
        React.createElement(
          'p',
          { style: { color: '#9ca3af', fontSize: '0.875rem' } },
          'Recarga la página para intentarlo de nuevo.',
        ),
      );
    }

    return this.props.children;
  }
}
