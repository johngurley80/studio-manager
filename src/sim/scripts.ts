import { GENRE_DEMANDS, GENRES } from './data';
import { filmTitle, logline, personName } from './names';
import type { Rng } from './rng';
import { absWeek, newId } from './state';
import type { GameState, Genre, Script } from './types';
import { clamp } from './util';

export function scriptPrice(quality: number): number {
  return Math.round((0.15 + Math.pow(quality / 100, 3) * 3.2) * 100) / 100;
}

export function generateScript(s: GameState, r: Rng, genre?: Genre, qualityBias = 0): Script {
  const g = genre ?? r.pick(GENRES);
  const base = GENRE_DEMANDS[g];
  const jitter = (v: number) => Math.max(0, v + r.range(-0.12, 0.12));
  const d = { drama: jitter(base.drama), comedy: jitter(base.comedy), action: jitter(base.action) };
  const total = d.drama + d.comedy + d.action;
  const quality = Math.round(clamp(r.normal(56 + qualityBias, 15), 18, 97));
  const w = personName(r);
  return {
    id: newId(s, 'sc'),
    title: filmTitle(r, g),
    genre: g,
    quality,
    price: scriptPrice(quality),
    writer: `${w.first} ${w.last}`,
    logline: logline(r, g),
    demands: { drama: d.drama / total, comedy: d.comedy / total, action: d.action / total },
    expiresAbs: absWeek(s) + r.int(6, 14),
  };
}

/** Keeps the spec-script market stocked; better studios get better pitches. */
export function refreshScripts(s: GameState, r: Rng, rep: number): void {
  const abs = absWeek(s);
  s.scripts = s.scripts.filter((sc) => sc.expiresAbs > abs);
  while (s.scripts.length < 10) s.scripts.push(generateScript(s, r, undefined, (rep - 45) * 0.12));
}
