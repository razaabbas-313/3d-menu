import type { CSSProperties } from 'react';
import type { Accent } from './api';

export const ACCENTS: Record<Accent, { label: string; color: string; on: string; ink: string }> = {
  cobalt: { label: 'Cobalt', color: '#1D3FD6', on: '#FFFFFF', ink: '#1D3FD6' },
  saffron: { label: 'Saffron', color: '#F2A33A', on: '#0E1A3B', ink: '#9A5B05' },
  basil: { label: 'Basil', color: '#1E7A52', on: '#FFFFFF', ink: '#1E7A52' },
  rose: { label: 'Rose', color: '#C2254F', on: '#FFFFFF', ink: '#C2254F' },
  graphite: { label: 'Graphite', color: '#1F2430', on: '#FFFFFF', ink: '#1F2430' }
};

/** CSS custom properties that re-colour the guest menu for a restaurant. */
export function accentStyle(accent: Accent | string | undefined): CSSProperties {
  const a = ACCENTS[(accent as Accent) in ACCENTS ? (accent as Accent) : 'cobalt'];
  return { '--accent': a.color, '--on-accent': a.on, '--accent-ink': a.ink } as CSSProperties;
}
