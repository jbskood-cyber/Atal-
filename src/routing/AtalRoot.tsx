import { lazy, Suspense } from 'react';

const LandingPage = lazy(() => import('../landing/LandingPage'));
const PrivateAppEntry = lazy(() => import('./PrivateAppEntry'));

function RootLoading() {
  return <div className="atal-root-loading" role="status" aria-label="Cargando Atal" />;
}

function isLandingPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, '');
  return normalizedPath === '/landing';
}

export function AtalRoot() {
  const isLanding = isLandingPath(window.location.pathname);

  return (
    <Suspense fallback={<RootLoading />}>
      {isLanding ? <LandingPage /> : <PrivateAppEntry />}
    </Suspense>
  );
}
