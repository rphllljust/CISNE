import { RouterProvider } from 'react-router-dom';

import { appRouter } from './router/app-router';

export function App(): React.JSX.Element {
  return <RouterProvider router={appRouter} />;
}


