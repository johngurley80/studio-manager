export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export const round1 = (v: number): number => Math.round(v * 10) / 10;

export const round2 = (v: number): number => Math.round(v * 100) / 100;

export const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

let cloning = true;

/**
 * Headless runs that never look at old states can skip the defensive copy.
 * The game UI always keeps it on.
 */
export function setCloning(on: boolean): void {
  cloning = on;
}

/** Clone-then-mutate helper so every public sim function is pure. */
export function produce<T>(state: T, fn: (draft: T) => void): T {
  const draft = cloning ? structuredClone(state) : state;
  fn(draft);
  return draft;
}

/** Money is stored in millions of dollars. */
export function fmtMoney(m: number, digits = 1): string {
  const neg = m < 0;
  const a = Math.abs(m);
  let s: string;
  if (a < 0.0005) return '$0';
  if (a >= 1000) s = `$${(a / 1000).toFixed(2)}B`;
  else if (a >= 1) s = `$${a.toFixed(digits)}M`;
  else s = `$${Math.round(a * 1000)}K`;
  return neg ? `-${s}` : s;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
