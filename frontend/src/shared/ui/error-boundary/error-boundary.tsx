import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/shared/ui/button';

import './error-boundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <section className="error-boundary-shell">
        <div className="error-boundary-card">
          <div className="error-boundary-icon" aria-hidden="true">
            <AlertTriangle size={22} />
          </div>
          <h2 className="error-boundary-title">Erro inesperado</h2>
          <p className="error-boundary-description">
            Esta tela falhou ao renderizar. Voce pode tentar novamente ou voltar ao painel.
          </p>
          {this.state.error ? <code className="error-boundary-code">{this.state.error.message}</code> : null}
          <div className="error-boundary-actions">
            <Button variant="secondary" onClick={this.handleReset}>
              Tentar novamente
            </Button>
            <Button onClick={() => { window.location.href = '/'; }}>
              Ir para o painel
            </Button>
          </div>
        </div>
      </section>
    );
  }
}
