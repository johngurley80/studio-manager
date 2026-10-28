/**
 * Headless balance check: plays many careers with simple AI players and
 * prints league finishes, profits, bankruptcies and sackings.
 *
 *   npm run sim                 # 50 careers x 5 seasons per strategy
 *   npm run sim -- --careers 20 --seasons 4 --difficulty mogul
 */
import { aiWeek, type AiStrategy } from '../src/sim/ai';
import { newGame } from '../src/sim/engine';
import type { Difficulty } from '../src/sim/types';
import { setCloning } from '../src/sim/util';

// The AI only ever uses the latest state, so skip defensive copies for speed.
setCloning(false);

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const CAREERS = Number(arg('careers', '50'));
const SEASONS = Number(arg('seasons', '5'));
const DIFF = arg('difficulty', 'studio') as Difficulty;
const STRATS = arg('strategies', 'decent,smart,reckless').split(',') as AiStrategy[];

interface Career {
  positions: number[];
  profits: number[];
  bankruptSeason: number | null;
  sackedSeason: number | null;
  firstTitle: number | null;
}

function play(strat: AiStrategy, i: number): Career {
  let s = newGame({ studioName: 'Sim Pictures', difficulty: DIFF, seed: `sim-${strat}-${i}` });
  const c: Career = { positions: [], profits: [], bankruptSeason: null, sackedSeason: null, firstTitle: null };
  let guard = 0;
  while (guard++ < SEASONS * 60) {
    const before = s.history.length;
    s = aiWeek(s, strat);
    if (s.history.length > before) {
      const h = s.history[s.history.length - 1];
      c.positions.push(h.position);
      c.profits.push(h.profit);
      if (h.position === 1 && c.firstTitle === null) c.firstTitle = h.season;
    }
    if (s.phase === 'gameover') {
      if (s.gameOver?.reason === 'bankrupt') c.bankruptSeason = s.season;
      else c.sackedSeason = s.history[s.history.length - 1]?.season ?? s.season;
      break;
    }
    if (s.history.length >= SEASONS) break;
  }
  return c;
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(0)}%` : '-');
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

const t0 = Date.now();
console.log(`Back Lot balance sim: ${CAREERS} careers x ${SEASONS} seasons per strategy, difficulty ${DIFF}\n`);
for (const strat of STRATS) {
  const careers: Career[] = [];
  for (let i = 0; i < CAREERS; i++) careers.push(play(strat, i));
  const seasonsPlayed = careers.reduce((n, c) => n + c.positions.length, 0);
  const titles = careers.reduce((n, c) => n + c.positions.filter((p) => p === 1).length, 0);
  console.log(`== ${strat.toUpperCase()} ==`);
  console.log(`  seasons completed      ${seasonsPlayed}`);
  console.log(`  league win rate        ${pct(titles, seasonsPlayed)} of seasons`);
  console.log(`  avg season profit      $${avg(careers.flatMap((c) => c.profits)).toFixed(1)}M`);
  console.log(`  bankruptcy rate        ${pct(careers.filter((c) => c.bankruptSeason !== null).length, CAREERS)} (within 2 seasons: ${pct(careers.filter((c) => c.bankruptSeason !== null && c.bankruptSeason <= 2).length, CAREERS)})`);
  console.log(`  sacked rate            ${pct(careers.filter((c) => c.sackedSeason !== null).length, CAREERS)}`);
  const rows: string[] = [];
  for (let k = 0; k < SEASONS; k++) {
    const pos = careers.filter((c) => c.positions.length > k).map((c) => c.positions[k]);
    const prof = careers.filter((c) => c.profits.length > k).map((c) => c.profits[k]);
    const wonBy = careers.filter((c) => c.firstTitle !== null && c.firstTitle <= k + 1).length;
    rows.push(
      `  S${k + 1}: active ${String(pos.length).padStart(3)}  avg pos ${avg(pos).toFixed(2).padStart(5)}  top-4 ${pct(pos.filter((p) => p <= 4).length, pos.length).padStart(4)}  won ${pct(pos.filter((p) => p === 1).length, pos.length).padStart(4)}  title by now ${pct(wonBy, CAREERS).padStart(4)}  avg profit $${avg(prof).toFixed(1)}M`,
    );
  }
  console.log(rows.join('\n'));
  console.log('');
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
