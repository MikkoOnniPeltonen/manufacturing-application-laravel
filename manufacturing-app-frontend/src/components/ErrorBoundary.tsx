import { Component, type ErrorInfo, type ReactNode } from 'react';
import { apiClient } from '../api/client';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    const categories = [
      'Error',
      'TypeError',
      'RangeError',
      'ReferenceError',
      'SyntaxError',
      'URIError',
      'EvalError',
    ] as const;
    const category = categories.find(name => name === error.name) ?? 'Error';
    apiClient.POST('/v1/client-errors', { body: { category } }).catch(() => {});
  }
  render() {
    if (this.state.failed)
      return (
        <main role="alert" className="p-8 text-foreground bg-background min-h-screen">
          <h1>Something went wrong</h1>
          <p>
            Reload the page to recover. Your saved orders and background production runs remain on
            the server.
          </p>
          <button className="mt-4 underline" type="button" onClick={() => window.location.reload()}>
            Reload application
          </button>
        </main>
      );
    return this.props.children;
  }
}
