import { lazy, Suspense } from 'react';

const LandingPage = lazy(() => import('../landing/LandingPage'));
const PrivateAppEntry = lazy(() => import('./PrivateAppEntry'));

function RootLoading() {
  return <div className="atal-root-loading" role="status" aria-label="Cargando Atal" />;
}

export function AtalRoot() {
  const isLanding = window.location.pathname === '/landing';

  return (
    <Suspense fallback={<RootLoading />}>
      {isLanding ? <LandingPage /> : <PrivateAppEntry />}
    </Suspense>
  );
}
