import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { preloadHref } from '@/src/routes/routeLoaders';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; prefetch?: boolean };
const Link = forwardRef<HTMLAnchorElement, Props>(({ href, prefetch = true, onFocus, onPointerEnter, ...props }, ref) => <RouterLink ref={ref} to={href} {...props} onFocus={(event) => { if (prefetch) void preloadHref(href); onFocus?.(event); }} onPointerEnter={(event) => { if (prefetch) void preloadHref(href); onPointerEnter?.(event); }} />);
Link.displayName = 'Link';
export default Link;
