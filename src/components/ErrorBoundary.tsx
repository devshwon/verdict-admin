import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** location.pathname 등 변경 시 boundary 를 리셋 */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <div className="error-banner">
            <strong>페이지 렌더링 오류</strong>
            <div style={{ fontSize: 12, marginTop: 6, fontFamily: 'monospace' }}>
              {this.state.error.message}
            </div>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 12 }}
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
