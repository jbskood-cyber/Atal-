import { Search, SlidersHorizontal } from 'lucide-react';

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="atal-search">
      <Search aria-hidden="true" size={22} strokeWidth={1.8} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <SlidersHorizontal aria-hidden="true" size={22} strokeWidth={1.8} />
    </label>
  );
}
