import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '@/app/App';
import { AppProviders } from '@/app/providers/app-providers';
import { ErrorBoundary } from '@/shared/ui/error-boundary';

import '@/app/styles/index.css';

console.log('✅ CSS PREMIUM MODULES LOADED - Premium design is active!');
if (typeof window !== 'undefined') {
  (window as any).__PREMIUM_CSS_LOADED = true;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>
);

