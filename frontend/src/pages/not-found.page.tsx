import { Link } from 'react-router-dom';

import { appRoutes } from '@/shared/constants/routes';
import { Button } from '@/shared/ui';

import './not-found.css';

export function NotFoundPage(): React.JSX.Element {
  return (
    <section className="not-found-shell">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-description">
          The requested route does not exist or was moved. Use the navigation menu to continue operation flow.
        </p>
        <div className="not-found-actions">
          <Link to={appRoutes.dashboard}>
            <Button>Voltar ao painel</Button>
          </Link>
          <Link to={appRoutes.serviceOrders}>
            <Button variant="secondary">Abrir ordens de serviço</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

