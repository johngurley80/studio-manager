import { GENRE_APPEAL, GENRE_DEMANDS, GENRE_FAMILY, STYLES, SUPPORT_SLOTS, TIERS } from './data';
import { fullName } from './people';
import { hashString } from './rng';
import type { Actor, BudgetTier, CastSlot, Demands, Director, Genre, Role } from './types';
import { avg, clamp } from './util';

export const ROLE_WEIGHT: Record<Role, number> = { lead: 0.36, colead: 0.26, support: 0.38 / SUPPORT_SLOTS };
export const ROLE_LABEL: Record<Role, string> = { lead: 'Lead', colead: 'Co-lead', support: 'Supporting' };

export function genreFit(scriptGenre: Genre, filmGenre: Genre): number {
  if (scriptGenre === filmGenre) return 1;
  if (GENRE_FAMILY[filmGenre].includes(scriptGenre)) return 0.78;
  return 0.55;
}

export function blendDemands(scriptDemands: Demands, genre: Genre): Demands {
  const g = GENRE_DEMANDS[genre];
  return {
    drama: (scriptDemands.drama + g.drama) / 2,
    comedy: (scriptDemands.comedy + g.comedy) / 2,
    action: (scriptDemands.action + g.action) / 2,
  };
}

/** 1-20 scale: how well an actor fits a part on this film. */
export function rolePerformance(a: Actor, demands: Demands, genre: Genre, director?: Director | null): number {
  const skill = demands.drama * a.drama + demands.comedy * a.comedy + demands.action * a.action;
  let p = skill * 0.8 + a.charisma * 0.2;
  p += ((a.form - 50) / 50) * 1.4;
  p += ((a.morale - 50) / 50) * 0.9;
  p += (a.genreRep[genre] / 100) * 1.2;
  if (director) p += STYLES[director.style].acting * 0.18;
  if (a.injuredWeeks > 0) p -= 3;
  return clamp(p, 1, 22);
}

/** Stable personal compatibility between two people, -1..1. */
function compat(a: string, b: string): number {
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  return ((hashString(key) % 2001) - 1000) / 1000;
}

export function pairChemistry(a: Actor, b: Actor): number {
  let c = 54 + compat(a.id, b.id) * 24;
  c -= Math.max(0, a.ego + b.ego - 25) * 2.6;
  if (a.topBilling && b.topBilling) c -= 8;
  c += ((a.charisma + b.charisma) / 2 - 10) * 0.8;
  c += ((a.morale + b.morale) / 2 - 55) * 0.12;
  if (Math.abs(a.age - b.age) > 30) c -= 4;
  return clamp(Math.round(c), 3, 98);
}

export interface PairChem {
  a: string;
  b: string;
  value: number;
  weight: number;
}

export function castPairs(cast: CastSlot[], actors: Record<string, Actor>): PairChem[] {
  const pairs: PairChem[] = [];
  for (let i = 0; i < cast.length; i++) {
    for (let j = i + 1; j < cast.length; j++) {
      const ri = cast[i].role;
      const rj = cast[j].role;
      const weight = ri !== 'support' && rj !== 'support' ? 3 : ri !== 'support' || rj !== 'support' ? 1 : 0.3;
      const a = actors[cast[i].actorId];
      const b = actors[cast[j].actorId];
      if (!a || !b) continue;
      pairs.push({ a: a.id, b: b.id, value: pairChemistry(a, b), weight });
    }
  }
  return pairs;
}

export function filmChemistry(cast: CastSlot[], actors: Record<string, Actor>): number {
  const pairs = castPairs(cast, actors);
  if (!pairs.length) return 50;
  const tw = pairs.reduce((s, p) => s + p.weight, 0);
  return pairs.reduce((s, p) => s + p.value * p.weight, 0) / tw;
}

export interface FilmInputs {
  genre: Genre;
  tier: BudgetTier;
  scriptQuality: number;
  genreFit: number;
  demands: Demands;
  director: Director | null;
  cast: CastSlot[];
  criticsMod: number;
  audienceMod: number;
  chemistryMod: number;
}

export interface QualityBreakdown {
  acting: number;
  script: number;
  direction: number;
  chemistry: number;
  production: number;
  starPower: number;
  critics: number;
  audience: number;
  performances: { actorId: string; role: Role; score: number }[];
}

export function directorScore(d: Director | null, genre: Genre): number {
  if (!d) return 30;
  let s = d.skill * 4.6 + 6;
  if (d.specialties.includes(genre)) s += 8;
  const st = STYLES[d.style];
  if (st.genres?.includes(genre)) s += 5;
  return clamp(s, 5, 100);
}

/** Deterministic quality of a film (before luck). Scores are 0-100. */
export function evaluateFilm(f: FilmInputs, actors: Record<string, Actor>): QualityBreakdown {
  const performances = f.cast
    .map((c) => {
      const a = actors[c.actorId];
      return a ? { actorId: c.actorId, role: c.role, score: rolePerformance(a, f.demands, f.genre, f.director) } : null;
    })
    .filter((p): p is { actorId: string; role: Role; score: number } => p !== null);

  let acting = 0;
  const lead = performances.find((p) => p.role === 'lead');
  const colead = performances.find((p) => p.role === 'colead');
  const support = performances.filter((p) => p.role === 'support');
  acting += (lead?.score ?? 4) * ROLE_WEIGHT.lead;
  acting += (colead?.score ?? 4) * ROLE_WEIGHT.colead;
  for (let i = 0; i < SUPPORT_SLOTS; i++) acting += (support[i]?.score ?? 6.5) * ROLE_WEIGHT.support;
  acting = clamp(acting * 5, 0, 100);

  const star = (id: string | undefined) => (id ? actors[id]?.starPower ?? 0 : 0);
  const starPower =
    star(lead?.actorId) * 0.5 + star(colead?.actorId) * 0.3 + Math.max(0, ...support.map((s) => star(s.actorId))) * 0.2;

  const script = clamp(f.scriptQuality * f.genreFit, 0, 100);
  const direction = directorScore(f.director, f.genre);
  const chemistry = clamp(filmChemistry(f.cast, actors) + f.chemistryMod, 0, 100);
  const production = f.genre === 'Horror' ? Math.max(TIERS[f.tier].production, 62) : TIERS[f.tier].production;
  const st = f.director ? STYLES[f.director.style] : null;

  // Weights are tuned so a well-cast, well-written film lands ~75-85.
  const critics =
    script * 0.32 + acting * 0.3 + direction * 0.24 + chemistry * 0.09 + production * 0.05 + (st?.critics ?? 0) + f.criticsMod;
  const audience =
    script * 0.18 +
    acting * 0.22 +
    direction * 0.12 +
    chemistry * 0.14 +
    production * 0.2 +
    starPower * 0.7 +
    (st?.audience ?? 0) +
    f.audienceMod;

  return {
    acting,
    script,
    direction,
    chemistry,
    production,
    starPower,
    critics: clamp(critics, 3, 99),
    audience: clamp(audience, 3, 99),
    performances,
  };
}

export function hypeScore(opts: {
  starPower: number;
  marketingRatio: number;
  reputation: number;
  genre: Genre;
  hypeMod: number;
  director: Director | null;
}): number {
  const st = opts.director ? STYLES[opts.director.style].hype : 0;
  return clamp(
    14 + opts.starPower * 1.3 + 42 * Math.sqrt(Math.max(0, opts.marketingRatio)) + opts.reputation * 0.08 + st + opts.hypeMod,
    5,
    120,
  );
}

/** Size of the potential audience a budget buys, in $M of first-week gross. */
export function reach(budget: number): number {
  return budget * (0.36 + 1.1 / Math.sqrt(Math.max(1, budget)));
}

/** Word-of-mouth pull of the audience score; 1.0 at 60. */
export function appeal(audience: number): number {
  return Math.pow(Math.max(5, audience) / 60, 1.2);
}

/** Turns hype (0-120) into a box office multiplier around 1.0. */
export function awareness(hype: number): number {
  return clamp(0.5 + hype / 110, 0.4, 1.6);
}

export function legsFor(critics: number, audience: number): number {
  return 1.7 + (audience / 100) * 2.3 + (critics / 100) * 1.0;
}

/** Expected total gross for UI estimates (no competition, no luck). */
export function estimateGross(
  budget: number,
  genre: Genre,
  hype: number,
  critics: number,
  audience: number,
  seasonal = 1,
): number {
  const first = reach(budget) * awareness(hype) * appeal(audience) * GENRE_APPEAL[genre] * seasonal;
  return first * legsFor(critics, audience);
}

export function castNames(cast: CastSlot[], actors: Record<string, Actor>): string {
  return cast
    .filter((c) => c.role !== 'support')
    .map((c) => (actors[c.actorId] ? fullName(actors[c.actorId]) : '?'))
    .join(' & ');
}

export function avgPerformance(scores: number[]): number {
  return avg(scores);
}
