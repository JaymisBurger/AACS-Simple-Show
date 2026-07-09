import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="vendor-shell">
          <section className="empty-state">
            <h1>Something went wrong</h1>
            <p>Refresh the page and try again. If it keeps happening, contact the administrator.</p>
            <button className="button primary" type="button" onClick={() => window.location.reload()}>Refresh</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
