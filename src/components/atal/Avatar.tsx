export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .slice(-2)
    .map((part) => part[0])
    .join('');

  return <span className={`atal-avatar atal-avatar--${size}`}>{initials}</span>;
}
