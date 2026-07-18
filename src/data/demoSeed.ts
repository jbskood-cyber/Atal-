export function mergeMissingById<T extends { id: string }>(existing: T[], seeded: T[]): T[] {
  const ids = new Set(existing.map((item) => item.id));
  return [...existing, ...seeded.filter((item) => !ids.has(item.id))];
}
