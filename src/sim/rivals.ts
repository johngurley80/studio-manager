import { GENRE_DEMANDS, STRATEGIES, TIERS, TIER_ORDER, seasonality } from './data';
import { directorScore } from './film';
import { autoCast, availableDirectors, startFilm, wrapFilm } from './production';
import { crowding, competitionFactor, scheduleRelease } from './release';
import type { Rng } from './rng';
import { generateScript } from './scripts';
import { absToSeasonWeek, absWeek, filmsOf } from './state';
import type { BudgetTier, Film, GameState, Genre, Studio } from './types';

/** Picks the best upcoming release week for a film from `from` to `to`. */
export function bestReleaseWeek(s: GameState, genre: Genre, tier: BudgetTier, from: number, to: number, excludeId?: string): number {
  let best = from;
  let bestV = -Infinity;
  for (let abs = from; abs <= to; abs++) {
    const { week } = absToSeasonWeek(abs);
    const v = seasonality(week) * competitionFactor(crowding(s, abs, genre, excludeId) + TIERS[tier].size * 0.1);
    if (v > bestV) {
      bestV = v;
      best = abs;
    }
  }
  return best;
}

export function rivalTurn(s: GameState, st: Studio, r: Rng): void {
  const info = STRATEGIES[st.strategy as keyof typeof STRATEGIES];
  if (!info) return;
  const abs = absWeek(s);
  const films = filmsOf(s, st.id);

  // schedule anything that has wrapped
  for (const f of films) {
    if (f.status !== 'post') continue;
    const when = bestReleaseWeek(s, f.genre, f.tier, abs + 2, abs + 7, f.id);
    const ratio = st.cash > f.budget * info.marketing ? info.marketing : 0.1;
    scheduleRelease(s, f, when, ratio);
  }

  const active = films.filter((f) => f.status === 'production').length;
  if (active >= info.concurrent || abs - st.lastGreenlitAbs < info.gap || st.cash < 4) return;
  if (!r.chance(0.6)) return;
  rivalGreenlight(s, st, r);
}

/** A rival picks a film that suits its strategy and starts shooting. */
export function rivalGreenlight(s: GameState, st: Studio, r: Rng): Film | null {
  const info = STRATEGIES[st.strategy as keyof typeof STRATEGIES];
  if (!info) return null;

  let tier = r.weighted(Object.keys(info.tiers) as BudgetTier[], (t) => info.tiers[t] ?? 0);
  while (TIERS[tier].budget > st.cash * 0.55 && tier !== 'micro') tier = TIER_ORDER[TIER_ORDER.indexOf(tier) - 1];
  if (TIERS[tier].budget > st.cash * 0.9) return null;
  const genre = r.weighted(Object.keys(info.genres) as Genre[], (g) => info.genres[g] ?? 0);
  const script = generateScript(s, r, genre, info.scriptBias + (st.reputation - 50) * 0.12);
  const dirs = availableDirectors(s).filter((d) => d.fee <= Math.max(0.6, TIERS[tier].budget * 0.08));
  if (!dirs.length) return null;
  const director = r.weighted(dirs, (d) => Math.pow(directorScore(d, genre), 2));
  const cast = autoCast(s, st.id, genre, GENRE_DEMANDS[genre], director, { supports: r.int(2, 4) });
  if (cast.length < 2) return null;
  return startFilm(s, st.id, { title: script.title, genre, tier, script: { ...script, id: undefined }, directorId: director.id, cast }, r);
}

/** New worlds start mid-flow: every rival has a film about to open. */
export function seedRivalSlates(s: GameState, r: Rng): void {
  const abs = absWeek(s);
  for (const st of s.studios) {
    if (st.isPlayer) continue;
    const info = STRATEGIES[st.strategy as keyof typeof STRATEGIES];
    const ready = rivalGreenlight(s, st, r);
    if (ready) {
      wrapFilm(s, ready);
      scheduleRelease(s, ready, abs + r.int(1, 8), info.marketing);
    }
    st.lastGreenlitAbs = abs - r.int(0, info.gap);
  }
}
