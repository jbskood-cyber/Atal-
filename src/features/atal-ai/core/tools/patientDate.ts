const SPANISH_MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

function formatCalendarDate(year: number, month: number, day: number): string | null {
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Canonicalize recognized, unambiguous dates supplied to Atal IA in Spanish.
 * Preserve unknown formats verbatim rather than guessing a patient's birth date.
 */
export function normalizePatientBirthDate(raw: string): string {
  const trimmed = raw.trim();
  const text = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
  const spanish = /^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/.exec(text);
  if (spanish) {
    const month = SPANISH_MONTHS[spanish[2]];
    if (!month) return trimmed;
    return formatCalendarDate(Number(spanish[3]), month, Number(spanish[1])) ?? trimmed;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return formatCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ?? trimmed;
  return trimmed;
}
