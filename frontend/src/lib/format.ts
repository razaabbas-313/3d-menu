export function money(amount: number, currency = 'PKR'): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(currency === 'PKR' ? 'en-PK' : undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export const CURRENCIES = ['PKR', 'USD', 'AED', 'GBP', 'EUR', 'SAR', 'INR'];

export const DEFAULT_CATEGORIES = ['Starters', 'Signatures', 'Mains', 'Sides', 'Desserts', 'Drinks'];
const RANK: Record<string, number> = { starters: 1, signatures: 2, mains: 3, sides: 5, desserts: 6, drinks: 7 };

/** Familiar categories keep a sensible menu order; custom ones sit between mains and sides. */
export function sortCategories(categories: string[]): string[] {
  const rank = (c: string) => RANK[c.toLowerCase()] ?? 4;
  return [...new Set(categories)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function parseTags(tags: string | null | undefined): string[] {
  return (tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function longDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function deltaLabel(current: number, previous: number, days: number): string {
  if (current === 0 && previous === 0) return 'No activity yet';
  if (previous === 0) return `New in the last ${days} days`;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return `Same as the previous ${days} days`;
  return `${pct > 0 ? 'Up' : 'Down'} ${Math.abs(pct)}% on the previous ${days} days`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
