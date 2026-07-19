import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousKey = useRef(location.key);
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    if (previousKey.current !== location.key) positions.current.set(previousKey.current, window.scrollY);
    const target = navigationType === 'POP' ? positions.current.get(location.key) ?? 0 : 0;
    window.scrollTo(0, target);
    previousKey.current = location.key;
  }, [location.key, navigationType]);
  return null;
}
