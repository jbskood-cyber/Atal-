import { useLocation, useNavigate, useSearchParams as useReactSearchParams } from 'react-router-dom';

export function usePathname() { return useLocation().pathname; }
export function useSearchParams() { return useReactSearchParams()[0]; }
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string, _options?: { scroll?: boolean }) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    prefetch: (_href: string) => undefined,
  };
}
