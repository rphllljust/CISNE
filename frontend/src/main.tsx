import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '@/app/App';
import { AppProviders } from '@/app/providers/app-providers';
import { ErrorBoundary } from '@/shared/ui/error-boundary';

import '@/app/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>
);

