// Maps legacy / free-text observation categories (entered before the fixed
// department dropdown existed) onto the canonical department names, so old
// posts group under the correct department instead of creating false ones.
//
// Keys are matched case-insensitively after trimming. Extend as needed.
const CATEGORY_ALIASES: Record<string, string> = {
  'drinking water': 'Quality',
  water: 'Quality',
  feeding: 'Quality',
  feeds: 'Quality',
  meals: 'Quality',
  prayer: 'Theology',
  prayers: 'Theology',
};

/**
 * Resolve a raw category string to its canonical department name.
 * Unknown categories are returned trimmed and unchanged.
 */
export function normalizeCategory(raw?: string | null): string {
  if (!raw) return 'Other';
  const trimmed = raw.trim();
  return CATEGORY_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}
