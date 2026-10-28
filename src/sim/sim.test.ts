import { describe, expect, it } from 'vitest';
import { aiWeek } from './ai';
import { GENRE_DEMANDS, SKILLS } from './data';
import {
  advanceWeek,
  concludeSeason,
  greenlight,
  greenlightError,
  makeOffer,
  newGame,
  resolveDecision,
  setRelease,
  takeLoan,
} from './engine';
import { evaluateFilm, pairChemistry } from './film';
import { developActor } from './people';
import { autoCast, availableDirectors } from './production';
import { Rng, hashString } from './rng';
import { absWeek, freeAgents, playerStudio, rosterOf } from './state';
import { askingSalary } from './transfers';
import type { Actor, GameState } from './types';

const fresh = (seed = 'test-seed') => newGame({ studioName: 'Test Pictures', difficulty: 'studio', seed });

function clearDecisions(s: GameState): GameState {
  while (s.decisions.length) s = resolveDecision(s, s.decisions[0].id, s.decisions[0].questions.map(() => 0));
  return s;
}

function playWeeks(s: GameState, n: number): GameState {
  for (let i = 0; i < n && s.phase === 'playing'; i++) s = advanceWeek(clearDecisions(s));
  return s;
}

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const xs = Array.from({ length: 20 }, () => a.next());
    const ys = Array.from({ length: 20 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it('stays in range', () => {
    const r = new Rng(7);
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('can resume from a saved state', () => {
    const a = new Rng(99);
    a.next();
    a.next();
    const b = new Rng(a.state);
    expect(b.next()).toBe(a.next());
  });
});

describe('new game', () => {
  const s = fresh();

  it('creates the player studio, seven rivals and a 25-30 actor squad', () => {
    expect(s.studios).toHaveLength(8);
    expect(s.studios.filter((x) => x.isPlayer)).toHaveLength(1);
    const squad = rosterOf(s, s.playerId).length;
    expect(squad).toBeGreaterThanOrEqual(25);
    expect(squad).toBeLessThanOrEqual(30);
    expect(freeAgents(s).length).toBeGreaterThan(20);
    expect(new Set(s.studios.map((x) => x.strategy)).size).toBe(8);
  });

  it('keeps every attribute on the 1-20 scale', () => {
    for (const a of Object.values(s.actors)) {
      for (const k of ['drama', 'comedy', 'action', 'charisma', 'starPower', 'reliability', 'ego', 'potential'] as const) {
        expect(a[k]).toBeGreaterThanOrEqual(1);
        expect(a[k]).toBeLessThanOrEqual(20);
      }
      expect(a.potential).toBeGreaterThanOrEqual(Math.max(a.drama, a.comedy, a.action) - 1e-9);
    }
  });

  it('only uses invented award and studio names', () => {
    const text = JSON.stringify(s).toLowerCase();
    for (const banned of ['oscar', 'golden globe', 'bafta', 'academy award', 'emmy', 'warner', 'paramount', 'disney', 'universal pictures']) {
      expect(text).not.toContain(banned);
    }
  });

  it('opens with board objectives and a press conference', () => {
    expect(s.board.objectives.length).toBe(3);
    expect(s.decisions.some((d) => d.kind === 'press')).toBe(true);
  });
});

describe('weekly engine', () => {
  it('refuses to advance while decisions are pending', () => {
    const s = fresh();
    expect(s.decisions.length).toBeGreaterThan(0);
    expect(advanceWeek(s)).toBe(s);
  });

  it('never mutates its input', () => {
    const s = clearDecisions(fresh());
    const before = JSON.stringify(s);
    const next = advanceWeek(s);
    expect(JSON.stringify(s)).toBe(before);
    expect(next.week).toBe(2);
  });

  it('replays a season identically from the same seed', () => {
    const run = () => {
      let s = fresh('replay');
      while (s.history.length < 1 && s.phase !== 'gameover') s = aiWeek(s, 'decent');
      return s;
    };
    const a = run();
    const b = run();
    expect(hashString(JSON.stringify(a))).toBe(hashString(JSON.stringify(b)));
    expect(a.history[0].position).toBe(b.history[0].position);
  });

  it('different seeds produce different worlds', () => {
    expect(JSON.stringify(fresh('one').actors)).not.toBe(JSON.stringify(fresh('two').actors));
  });

  it('pays salaries every week', () => {
    const s = clearDecisions(fresh());
    const next = advanceWeek(s);
    expect(playerStudio(next).cash).toBeLessThan(playerStudio(s).cash);
  });
});

describe('films', () => {
  it('chemistry is symmetric and bounded', () => {
    const s = fresh();
    const [a, b] = rosterOf(s, s.playerId);
    expect(pairChemistry(a, b)).toBe(pairChemistry(b, a));
    for (const x of rosterOf(s, s.playerId))
      for (const y of rosterOf(s, s.playerId)) {
        const c = pairChemistry(x, y);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(100);
      }
  });

  it('a stronger cast and script score higher', () => {
    const s = fresh();
    const squad = rosterOf(s, s.playerId);
    const score = (a: Actor) => a.drama;
    const best = squad.slice().sort((x, y) => score(y) - score(x));
    const worst = best.slice().reverse();
    const director = Object.values(s.directors)[0];
    const base = { genre: 'Drama' as const, tier: 'mid' as const, genreFit: 1, demands: GENRE_DEMANDS.Drama, director, criticsMod: 0, audienceMod: 0, chemistryMod: 0 };
    const good = evaluateFilm({ ...base, scriptQuality: 85, cast: [{ actorId: best[0].id, role: 'lead' }, { actorId: best[1].id, role: 'colead' }] }, s.actors);
    const bad = evaluateFilm({ ...base, scriptQuality: 30, cast: [{ actorId: worst[0].id, role: 'lead' }, { actorId: worst[1].id, role: 'colead' }] }, s.actors);
    expect(good.critics).toBeGreaterThan(bad.critics + 10);
    expect(good.acting).toBeGreaterThan(bad.acting);
  });

  it('greenlights, shoots, releases and earns money', () => {
    let s = clearDecisions(fresh('pipeline'));
    const script = s.scripts[0];
    const director = availableDirectors(s).sort((a, b) => a.fee - b.fee)[0];
    const cast = autoCast(s, s.playerId, script.genre, script.demands, director);
    const params = { title: 'Test Feature', genre: script.genre, tier: 'low' as const, script, directorId: director.id, cast };
    expect(greenlightError(s, params)).toBeNull();
    s = greenlight(s, params);
    const film = Object.values(s.films).find((f) => f.studioId === s.playerId)!;
    expect(film.status).toBe('production');
    expect(s.actors[cast[0].actorId].filmId).toBe(film.id);
    // the same lead cannot be in two films at once
    expect(greenlightError(s, { ...params, directorId: availableDirectors(s)[0].id })).toMatch(/not available/);

    s = playWeeks(s, 20);
    let f = s.films[film.id];
    expect(['post', 'scheduled', 'released', 'finished']).toContain(f.status);
    if (f.status === 'post') {
      s = setRelease(s, f.id, absWeek(s) + 2, 0.35);
      s = playWeeks(s, 3);
    }
    f = s.films[film.id];
    expect(f.critics).not.toBeNull();
    expect(f.gross).toBeGreaterThan(0);
    expect(s.reports.length + s.inbox.filter((m) => m.subject.startsWith('Opening weekend')).length).toBeGreaterThan(0);
  });
});

describe('people', () => {
  it('young actors improve and older actors slowly decline', () => {
    const s = fresh();
    const r = new Rng(1);
    const young = { ...rosterOf(s, s.playerId)[0], age: 19, drama: 8, comedy: 8, action: 8, potential: 18, form: 70 };
    const old = { ...rosterOf(s, s.playerId)[1], age: 64, drama: 12, action: 14, potential: 14 };
    const slots = { drama: 2, comedy: 1, action: 1 };
    const y0 = young.drama;
    const o0 = { action: old.action, drama: old.drama };
    for (let w = 0; w < 52; w++) {
      developActor(young, slots, 3, false, r);
      developActor(old, slots, 3, false, r);
    }
    expect(young.drama).toBeGreaterThan(y0 + 0.5);
    expect(old.action).toBeLessThan(o0.action);
    expect(old.drama).toBeGreaterThanOrEqual(o0.drama);
    for (const k of SKILLS) expect(young[k]).toBeLessThanOrEqual(young.potential);
  });

  it('overwork hurts morale and slacking hurts form', () => {
    const s = fresh();
    const r = new Rng(2);
    const a = { ...rosterOf(s, s.playerId)[0], morale: 60, form: 60 };
    const b = { ...rosterOf(s, s.playerId)[0], morale: 60, form: 60 };
    const none = { drama: 0, comedy: 0, action: 0 };
    for (let w = 0; w < 8; w++) {
      developActor(a, { drama: 2, comedy: 2, action: 1 }, 5, false, r);
      developActor(b, none, 0, false, r);
    }
    expect(a.morale).toBeLessThan(b.morale);
    expect(b.form).toBeLessThan(a.form);
  });
});

describe('transfers', () => {
  it('accepts a generous offer and rejects a lowball', () => {
    const s = clearDecisions(fresh('deals'));
    const target = freeAgents(s)
      .filter((a) => a.starPower < 8)
      .sort((a, b) => a.salary - b.salary)[0];
    const ask = askingSalary(s, target, 2, true);
    const low = makeOffer(s, { actorId: target.id, salary: ask * 0.4, years: 2, topBilling: true, fee: 0 }, 0);
    expect(low.result.outcome).toBe('rejected');
    const s2 = clearDecisions(fresh('deals'));
    const good = makeOffer(s2, { actorId: target.id, salary: ask * 1.05, years: 2, topBilling: true, fee: 0 }, 0);
    expect(good.result.outcome).toBe('accepted');
    expect(good.state.actors[target.id].studioId).toBe(s2.playerId);
  });

  it('top billing raises ego', () => {
    const s = clearDecisions(fresh('ego'));
    const target = freeAgents(s).sort((a, b) => a.salary - b.salary)[0];
    const ask = askingSalary(s, target, 2, true);
    const res = makeOffer(s, { actorId: target.id, salary: ask * 1.2, years: 2, topBilling: true, fee: 0 }, 0);
    expect(res.state.actors[target.id].ego).toBeGreaterThan(target.ego);
  });
});

describe('finances and the board', () => {
  it('loans add cash and are repaid weekly', () => {
    let s = clearDecisions(fresh());
    const cash = playerStudio(s).cash;
    s = takeLoan(s, 20);
    expect(playerStudio(s).cash).toBeCloseTo(cash + 20);
    const owed = s.loans[0].remaining;
    s = playWeeks(s, 4);
    expect(s.loans[0].remaining).toBeLessThan(owed);
  });

  it('goes bankrupt when deep in the red', () => {
    let s = clearDecisions(fresh());
    s = { ...s, studios: s.studios.map((st) => (st.isPlayer ? { ...st, cash: -500 } : st)) };
    s = advanceWeek(s);
    expect(s.phase).toBe('gameover');
    expect(s.gameOver?.reason).toBe('bankrupt');
  });

  it('runs awards, the league and the board review at season end', () => {
    let s = fresh('season');
    while (s.phase === 'playing') s = aiWeek(s, 'decent');
    expect(s.phase).toBe('awards');
    expect(s.ceremony?.categories.map((c) => c.name)).toEqual([
      'Best Picture',
      'Best Lead Performance',
      'Best Supporting Performance',
      'Best Director',
    ]);
    for (const c of s.ceremony!.categories) {
      expect(c.nominees.length).toBeGreaterThan(0);
      expect(c.winnerIndex).toBeGreaterThanOrEqual(0);
    }
    const ages = Object.fromEntries(Object.values(s.actors).map((a) => [a.id, a.age]));
    s = concludeSeason(s);
    expect(s.history).toHaveLength(1);
    expect(s.history[0].table).toHaveLength(8);
    expect(['review', 'gameover']).toContain(s.phase);
    if (s.phase === 'review') {
      expect(s.season).toBe(2);
      expect(s.week).toBe(1);
      const someone = Object.values(s.actors).find((a) => !a.retired)!;
      expect(someone.age).toBe(ages[someone.id] + 1);
    }
  });

  it('sacks the manager after two failed seasons', () => {
    let s = fresh('sack');
    for (let season = 0; season < 2; season++) {
      while (s.phase === 'playing') s = advanceWeek(clearDecisions(s));
      if (s.phase !== 'awards') break;
      // impossible objectives: release 99 films
      s = { ...s, board: { ...s.board, objectives: s.board.objectives.map((o) => ({ ...o, kind: 'releases' as const, target: 99 })) } };
      s = concludeSeason(s);
      if (s.phase === 'review') s = { ...s, phase: 'playing' };
    }
    expect(s.phase).toBe('gameover');
    expect(s.gameOver?.reason === 'sacked' || s.gameOver?.reason === 'bankrupt').toBe(true);
  });
});
