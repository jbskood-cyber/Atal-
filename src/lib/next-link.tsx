import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link as RouterLink } from 'react-router-dom';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; prefetch?: boolean };
const Link = forwardRef<HTMLAnchorElement, Props>(({ href, prefetch: _prefetch, ...props }, ref) => <RouterLink ref={ref} to={href} {...props} />);
Link.displayName = 'Link';
export default Link;
