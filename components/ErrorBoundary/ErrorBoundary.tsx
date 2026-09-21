'use client';

import React from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4444' }}>
            <h2>Bir hata oluştu</h2>
            <p>Lütfen sayfayı yenileyin.</p>
            <button onClick={() => this.setState({ hasError: false })}>Tekrar Dene</button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
