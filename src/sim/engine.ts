import { buildCeremony } from './awards';
import { makeObjectives, objectiveProgress, pressConference, resolvePress, standings } from './board';
import {
  ANALYST_SALARY,
  ANALYST_UPGRADE,
  DIFFICULTY,
  OVERHEAD_PER_WEEK,
  PLAYER_COLOR,
  RIVAL_STRATEGIES,
  SCOUT_SALARY,
  SKILLS,
  STRATEGIES,
  STUDIO_COLORS,
  TIERS,
  WEEKS_PER_SEASON,
} from './data';
import { studioNames } from './names';
import { developActor, fullName, generateActor, generateDirector, overall, salaryValue } from './people';
import { productionWeek, resolveProductionDecision, startFilm, upfrontCost, validateCast, type GreenlightParams } from './production';
import { boxOfficeWeek, processReleases, scheduleRelease } from './release';
import { rivalTurn, seedRivalSlates } from './rivals';
import { Rng, seedFrom } from './rng';
import { refreshScripts } from './scripts';
import {
  SAVE_VERSION,
  absWeek,
  debt,
  earn,
  emptySeason,
  newId,
  playerStudio,
  pushInbox,
  pushNews,
  rosterOf,
  seasonProfit,
  spend,
  workInProgress,
  weeklySalary,
} from './state';
import {
  assignScout as assignScoutImpl,
  completeSigning,
  evaluateOffer,
  failNegotiation,
  hireScout as hireScoutImpl,
  releaseActor as releaseActorImpl,
  replenishFreeAgents,
  resolveRivalBid,
  resolveTransferRequest,
  rivalBids,
  rivalSignings,
  scoutingWeek,
  transferRequests,
  type Offer,
  type OfferResult,
} from './transfers';
import type { Difficulty, GameState, RegionId, SeasonRecord, Skill, Studio, TrainingActivity } from './types';
import { clamp, fmtMoney, ordinal, produce } from './util';

export interface NewGameOptions {
  studioName: string;
  difficulty: Difficulty;
  seed?: number | string;
}

export function newGame(opts: NewGameOptions): GameState {
  const seed = opts.seed === undefined || opts.seed === '' ? Math.floor(Math.random() * 2 ** 31) : seedFrom(opts.seed);
  const r = new Rng(seed);
  const diff = DIFFICULTY[opts.difficulty];
  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    rng: 0,
    nextId: 0,
    difficulty: opts.difficulty,
    season: 1,
    week: 1,
    phase: 'playing',
    playerId: 'st0',
    studios: [],
    actors: {},
    directors: {},
    films: {},
    scripts: [],
    scouts: [],
    staff: { analystLevel: 1 },
    training: { schedule: ['workshop', 'stunts', 'improv', 'workshop', 'rest'], resting: [] },
    loans: [],
    inbox: [],
    news: [],
    decisions: [],
    board: { confidence: 60, warnings: 0, objectives: [] },
    cashHistory: [],
    negativeWeeks: 0,
    reports: [],
    ceremony: null,
    history: [],
    gameOver: null,
  };
  const studioName = opts.studioName.trim() || 'Sable Street Pictures';
  s.studios.push({
    id: 'st0',
    name: studioName,
    short: initials(studioName),
    color: PLAYER_COLOR,
    strategy: 'player',
    isPlayer: true,
    cash: diff.cash,
    reputation: diff.rep,
    lastGreenlitAbs: -99,
    season: emptySeason(),
  });
  const names = studioNames(r, RIVAL_STRATEGIES.length, studioName);
  r.shuffle(RIVAL_STRATEGIES).forEach((strategy, i) => {
    const info = STRATEGIES[strategy];
    s.studios.push({
      id: `st${i + 1}`,
      name: names[i],
      short: initials(names[i]),
      color: STUDIO_COLORS[i],
      strategy,
      isPlayer: false,
      cash: Math.round(info.cash * diff.rivalCash),
      reputation: clamp(info.rep + r.int(-4, 4) + diff.expectation * 2, 10, 95),
      lastGreenlitAbs: -r.int(0, 10),
      season: emptySeason(),
    });
  });

  // Player squad: a few names, a solid core and some raw youngsters.
  const plan: [number, number, number, number][] = [
    [3, 0.22, 27, 50],
    [8, 0.06, 24, 58],
    [9, -0.05, 22, 64],
    [6, -0.14, 18, 23],
  ];
  for (const [n, delta, lo, hi] of plan) {
    for (let i = 0; i < n; i++) {
      const a = generateActor(r, { id: newId(s, 'a'), tier: diff.squadTier + delta, ageMin: lo, ageMax: hi, studioId: 'st0', season: 1 });
      s.actors[a.id] = a;
    }
  }
  for (const st of s.studios) {
    if (st.isPlayer) continue;
    const info = STRATEGIES[st.strategy as keyof typeof STRATEGIES];
    for (let i = 0; i < 18; i++) {
      const a = generateActor(r, {
        id: newId(s, 'a'),
        tier: info.rosterTier + r.range(-0.15, 0.15) + (i < 3 ? 0.15 : 0),
        studioId: st.id,
        season: 1,
        skillBias: info.skillBias,
      });
      s.actors[a.id] = a;
    }
  }
  replenishFreeAgents(s, r, 45);
  for (let i = 0; i < 40; i++) {
    const d = generateDirector(r, newId(s, 'dr'));
    s.directors[d.id] = d;
  }
  hireScoutImpl(s, r);
  hireScoutImpl(s, r);
  refreshScripts(s, r, diff.rep);
  seedRivalSlates(s, r);
  s.board.objectives = makeObjectives(s, r);
  pushInbox(s, {
    from: 'The Board',
    subject: `Welcome to ${studioName}`,
    body: `Congratulations on your appointment. The board's objectives for season 1:\n${s.board.objectives.map((o) => `• ${o.text}`).join('\n')}\nMiss them and you will get a warning. Miss them twice and you are out.`,
    kind: 'board',
  });
  pushNews(s, `${studioName} has a new studio head. The trade papers give them a season.`, 'studio');
  for (const st of s.studios.filter((x) => !x.isPlayer).slice(0, 3)) {
    const info = STRATEGIES[st.strategy as keyof typeof STRATEGIES];
    pushNews(s, `${st.name} (${info.label.toLowerCase()}) open the season with ${fmtMoney(st.cash, 0)} in the bank.`, 'studio');
  }
  pressConference(s, r, null);
  s.cashHistory.push(Math.round(diff.cash * 10) / 10);
  s.rng = r.state;
  return s;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/* --------------------------------- weekly ---------------------------------- */

const ACTIVITY_SKILL: Record<TrainingActivity, Skill | null> = { workshop: 'drama', stunts: 'action', improv: 'comedy', rest: null };

function trainingWeek(s: GameState, r: Rng): void {
  const sched = s.training.schedule;
  const slots: Record<Skill, number> = { drama: 0, comedy: 0, action: 0 };
  for (const act of sched) {
    const sk = ACTIVITY_SKILL[act];
    if (sk) slots[sk] += 1;
  }
  const workload = sched.filter((x) => x !== 'rest').length;
  const none: Record<Skill, number> = { drama: 0, comedy: 0, action: 0 };
  const rivalSlots: Record<Skill, number> = { drama: 1, comedy: 1, action: 1 };
  for (const a of Object.values(s.actors)) {
    if (a.retired) continue;
    const filming = a.filmId !== null;
    if (a.injuredWeeks > 0) a.injuredWeeks -= 1;
    if (a.studioId === s.playerId) {
      const resting = s.training.resting.includes(a.id) || a.injuredWeeks > 0;
      developActor(a, filming || resting ? none : slots, filming ? 3 : resting ? 0 : workload, filming, r);
      if (!filming && !resting && slots.action > 0 && r.chance(0.0025 * slots.action * (1.4 - a.reliability / 20))) {
        a.injuredWeeks = r.int(1, 4);
        pushInbox(s, {
          from: 'Studio Medic',
          subject: `${fullName(a)} injured in stunt training`,
          body: `${fullName(a)} twisted an ankle during stunt training and is out for ${a.injuredWeeks} week(s).`,
          kind: 'studio',
          actorId: a.id,
        });
      }
      a.idleWeeks = filming ? 0 : a.idleWeeks + 1;
      if (a.starPower >= 11 && a.idleWeeks > 14) a.morale = clamp(a.morale - 0.7, 0, 100);
      if (a.salary < salaryValue(a) * 0.6) a.morale = clamp(a.morale - 0.3, 0, 100);
      if (a.wantsToLeave) a.morale = clamp(a.morale - 0.5, 0, 100);
    } else if (a.studioId) {
      developActor(a, filming ? none : rivalSlots, 3, filming, r);
      a.idleWeeks = filming ? 0 : a.idleWeeks + 1;
    } else {
      developActor(a, none, 2, false, r);
      a.idleWeeks += 1;
    }
    if (a.idleWeeks > 26) a.starPower = clamp(a.starPower - 0.03, 1, 20);
  }
}

function costsWeek(s: GameState): void {
  for (const st of s.studios) {
    const pay = rosterOf(s, st.id).reduce((sum, a) => sum + weeklySalary(a), 0);
    spend(st, pay + OVERHEAD_PER_WEEK);
  }
  const me = playerStudio(s);
  spend(me, (s.scouts.length * SCOUT_SALARY + ANALYST_SALARY[s.staff.analystLevel]) / WEEKS_PER_SEASON);
  for (const l of s.loans) {
    const i = l.rate / WEEKS_PER_SEASON;
    const interest = l.remaining * i;
    const pay = Math.min(l.weeklyPayment, l.remaining + interest);
    l.remaining = Math.max(0, l.remaining + interest - pay);
    spend(me, pay);
  }
  s.loans = s.loans.filter((l) => l.remaining > 0.01);
}

function boardMood(s: GameState): void {
  const met = s.board.objectives.filter((o) => objectiveProgress(s, o).met).length;
  const me = playerStudio(s);
  const target = 25 + met * 18 + (me.cash > 0 ? 8 : -15);
  s.board.confidence = clamp(s.board.confidence + (target - s.board.confidence) * 0.04, 0, 100);
}

function solvency(s: GameState): void {
  const me = playerStudio(s);
  if (me.cash >= 0) {
    s.negativeWeeks = 0;
    return;
  }
  s.negativeWeeks += 1;
  const limit = -(45 + me.reputation * 0.6);
  if (s.negativeWeeks >= 10 || me.cash < limit) {
    s.phase = 'gameover';
    s.gameOver = { reason: 'bankrupt', abs: absWeek(s) };
    pushNews(s, `${me.name} collapses into administration.`, 'studio');
    return;
  }
  if (s.negativeWeeks === 1 || s.negativeWeeks % 3 === 0) {
    pushInbox(s, {
      from: 'Finance Director',
      subject: 'We are overdrawn',
      body: `The studio is ${fmtMoney(-me.cash)} in the red. If we are still overdrawn after ${10 - s.negativeWeeks} more week(s), or the hole passes ${fmtMoney(-limit)}, the bank will pull the plug. Consider a loan, selling an actor or shelving spending.`,
      kind: 'finance',
    });
  }
}

/** Plays one week. Refuses while decisions are outstanding. */
export function advanceWeek(state: GameState): GameState {
  if (state.phase !== 'playing' || state.decisions.length) return state;
  return produce(state, (s) => {
    const r = new Rng(s.rng);
    trainingWeek(s, r);
    costsWeek(s);
    productionWeek(s, r);
    const reports = processReleases(s, r);
    boxOfficeWeek(s);
    for (const st of s.studios) if (!st.isPlayer) rivalTurn(s, st, r);
    rivalSignings(s, r);
    rivalBids(s, r);
    transferRequests(s);
    scoutingWeek(s, r);
    refreshScripts(s, r, playerStudio(s).reputation);
    if (s.week === 40) contractReminder(s);
    boardMood(s);
    s.reports.push(...reports);
    s.cashHistory.push(Math.round(playerStudio(s).cash * 10) / 10);
    if (s.cashHistory.length > 520) s.cashHistory.shift();
    solvency(s);
    if (s.phase === 'gameover') {
      s.rng = r.state;
      return;
    }
    if (s.week >= WEEKS_PER_SEASON) {
      s.ceremony = buildCeremony(s, r);
      s.phase = 'awards';
    } else {
      s.week += 1;
      const abs = absWeek(s);
      const releasing = Object.values(s.films).find((f) => f.studioId === s.playerId && f.status === 'scheduled' && f.releaseAbs === abs);
      if (releasing) pressConference(s, r, releasing);
    }
    s.rng = r.state;
  });
}

function contractReminder(s: GameState): void {
  const expiring = rosterOf(s, s.playerId).filter((a) => a.contractEnd <= s.season);
  if (!expiring.length) return;
  pushInbox(s, {
    from: 'Business Affairs',
    subject: `${expiring.length} contract(s) expire at season end`,
    body: `These actors leave at the end of the season unless you renew:\n${expiring.map((a) => `• ${fullName(a)}`).join('\n')}`,
    kind: 'agent',
  });
}

/* ------------------------------ season change ------------------------------ */

function grantMultiplier(pos: number, count: number): number {
  if (pos === 1) return 1.5;
  if (pos <= 3) return 1.2;
  if (pos === count) return 0.5;
  return 1;
}

/** Applies league results and the board's verdict, then sets up next season. */
export function concludeSeason(state: GameState): GameState {
  if (state.phase !== 'awards') return state;
  return produce(state, (s) => {
    const r = new Rng(s.rng);
    const table = standings(s);
    const me = playerStudio(s);
    const pos = table.findIndex((t) => t.studioId === me.id) + 1;
    const n = table.length;
    const champ = s.studios.find((st) => st.id === table[0].studioId)!;
    champ.cash += 25;
    champ.reputation = clamp(champ.reputation + 5, 0, 100);
    for (const row of table.slice(1, 3)) {
      const st = s.studios.find((x) => x.id === row.studioId)!;
      st.reputation = clamp(st.reputation + 2, 0, 100);
    }
    const last = s.studios.find((st) => st.id === table[n - 1].studioId)!;
    last.reputation = clamp(last.reputation - 8, 0, 100);
    pushNews(s, `${champ.name} top the season ${s.season} box office chart. ${last.name} finish bottom and face budget cuts.`, 'league');

    const objectives = s.board.objectives.map((o) => ({ ...o, met: objectiveProgress(s, o).met }));
    const met = objectives.filter((o) => o.met).length;
    let verdict: SeasonRecord['verdict'];
    if (met === objectives.length) {
      verdict = 'delighted';
      s.board.warnings = 0;
      s.board.confidence = clamp(s.board.confidence + 15, 0, 100);
    } else if (met >= 2) {
      verdict = 'satisfied';
      s.board.warnings = 0;
      s.board.confidence = clamp(s.board.confidence + 5, 0, 100);
    } else {
      s.board.warnings += 1;
      verdict = s.board.warnings >= 2 ? 'sacked' : 'warning';
      s.board.confidence = clamp(s.board.confidence - 20, 0, 100);
    }
    const ps = me.season;
    s.history.push({
      season: s.season,
      position: pos,
      gross: ps.gross,
      profit: seasonProfit(s, me),
      releases: ps.releases,
      avgCritics: ps.releases ? ps.criticsSum / ps.releases : 0,
      nominations: ps.nominations,
      wins: ps.wins,
      champion: champ.name,
      objectives,
      verdict,
      table,
    });
    if (verdict === 'sacked') {
      s.phase = 'gameover';
      s.gameOver = { reason: 'sacked', abs: absWeek(s) };
      pushNews(s, `${me.name} part company with their studio head after a second failed season.`, 'studio');
      s.rng = r.state;
      return;
    }
    pushInbox(s, {
      from: 'The Board',
      subject: `Season ${s.season} review: ${verdict === 'warning' ? 'a formal warning' : verdict === 'delighted' ? 'outstanding' : 'satisfactory'}`,
      body: `We finished ${ordinal(pos)} of ${n}. Objectives met: ${met}/${objectives.length}.${verdict === 'warning' ? ' This is a formal warning. Fail again and you will be dismissed.' : ''}`,
      kind: 'board',
    });

    // --- new season ---
    const diff = DIFFICULTY[s.difficulty];
    s.season += 1;
    s.week = 1;
    for (const st of s.studios) {
      const p = table.findIndex((t) => t.studioId === st.id) + 1;
      const mult = grantMultiplier(p, n);
      const base = st.isPlayer ? diff.grant : STRATEGIES[st.strategy as keyof typeof STRATEGIES].cash * 0.3 * diff.rivalCash;
      earn(st, base * mult);
      if (!st.isPlayer && st.cash < 20) {
        st.cash = 30;
        st.reputation = clamp(st.reputation - 4, 0, 100);
      }
      // reputation slowly regresses to the middle
      st.reputation = clamp(st.reputation + (50 - st.reputation) * 0.12, 0, 100);
      st.season = emptySeason();
      st.season.wipStart = workInProgress(s, st.id);
      if (st.isPlayer) {
        pushInbox(s, {
          from: 'The Board',
          subject: mult < 1 ? 'Budget cut' : mult > 1 ? 'Budget increase' : 'Season allocation',
          body: `The board allocates ${fmtMoney(base * mult)} for season ${s.season}${mult < 1 ? ' — halved after finishing bottom of the chart' : mult > 1 ? ' including a bonus for our chart finish' : ''}.`,
          kind: 'board',
        });
      }
    }
    for (const a of Object.values(s.actors)) {
      if (a.retired) continue;
      a.age += 1;
      a.face.hairColor = a.age > 58 && r.chance(0.2) ? 6 + r.int(0, 1) : a.face.hairColor;
      if (a.contractEnd < s.season && a.studioId) {
        if (a.studioId === s.playerId) {
          pushNews(s, `${fullName(a)} leaves ${me.name} as their contract expires.`, 'transfer');
          a.studioId = null;
          a.topBilling = false;
          s.training.resting = s.training.resting.filter((id) => id !== a.id);
        } else if (r.chance(0.72) && a.age < 66) {
          a.contractEnd = s.season + r.int(1, 3);
          a.salary = Math.round(salaryValue(a) * 100) / 100;
        } else {
          a.studioId = null;
        }
      }
      if (!a.studioId && (a.age > 74 || (a.age > 64 && r.chance(0.25)))) a.retired = true;
      if (a.studioId === null) a.salary = Math.round(salaryValue(a) * 100) / 100;
    }
    for (const d of Object.values(s.directors)) d.age += 1;
    replenishFreeAgents(s, r, 20);
    pruneWorld(s);
    for (const f of Object.values(s.films)) {
      if (f.studioId !== s.playerId && f.status === 'finished' && (f.releaseSeason ?? 0) < s.season - 3) delete s.films[f.id];
    }
    s.board.objectives = makeObjectives(s, r);
    pushInbox(s, {
      from: 'The Board',
      subject: `Objectives for season ${s.season}`,
      body: s.board.objectives.map((o) => `• ${o.text}`).join('\n'),
      kind: 'board',
    });
    s.ceremony = null;
    s.phase = 'review';
    pressConference(s, r, null);
    s.rng = r.state;
  });
}

/** Keeps saves small: forgets retired nobodies and the weakest surplus free agents. */
function pruneWorld(s: GameState): void {
  const referenced = new Set<string>();
  for (const f of Object.values(s.films)) for (const c of f.cast) referenced.add(c.actorId);
  for (const a of Object.values(s.actors)) {
    if (a.retired && !referenced.has(a.id) && a.awards.length === 0) delete s.actors[a.id];
  }
  const pool = Object.values(s.actors)
    .filter((a) => a.studioId === null && !a.retired && !a.discovered && !referenced.has(a.id))
    .sort((a, b) => overall(b) + b.starPower * 0.2 - (overall(a) + a.starPower * 0.2));
  for (const a of pool.slice(90)) delete s.actors[a.id];
}

export function dismissReview(state: GameState): GameState {
  if (state.phase !== 'review') return state;
  return produce(state, (s) => {
    s.phase = 'playing';
  });
}

/* ------------------------------ player actions ----------------------------- */

export function resolveDecision(state: GameState, id: string, answers: number[]): GameState {
  const d = state.decisions.find((x) => x.id === id);
  if (!d) return state;
  return produce(state, (s) => {
    const r = new Rng(s.rng);
    const dec = s.decisions.find((x) => x.id === id)!;
    s.decisions = s.decisions.filter((x) => x.id !== id);
    if (dec.kind === 'production') resolveProductionDecision(s, dec, answers[0] ?? 0, r);
    else if (dec.kind === 'rivalBid') resolveRivalBid(s, dec, answers[0] ?? 1, r);
    else if (dec.kind === 'transferRequest') resolveTransferRequest(s, dec, answers[0] ?? 0);
    else if (dec.kind === 'press') resolvePress(s, dec, answers);
    for (const m of s.inbox) if (m.decisionId === id) m.read = true;
    s.rng = r.state;
  });
}

export function greenlightError(state: GameState, p: GreenlightParams): string | null {
  const me = playerStudio(state);
  const active = Object.values(state.films).filter((f) => f.studioId === me.id && f.status === 'production').length;
  if (active >= 3) return 'All three sound stages are busy.';
  const d = state.directors[p.directorId];
  if (!d) return 'Choose a director.';
  if (d.filmId) return `${fullName(d)} is already shooting.`;
  const castErr = validateCast(state, me.id, p.cast);
  if (castErr) return castErr;
  const up = upfrontCost({ tier: p.tier, scriptPrice: p.script.price, directorFee: d.fee });
  if (me.cash < up) return `You need ${fmtMoney(up)} up front (script, director and 20% of the budget).`;
  if (!p.title.trim()) return 'Give the film a title.';
  return null;
}

export function greenlight(state: GameState, p: GreenlightParams): GameState {
  if (greenlightError(state, p)) return state;
  return produce(state, (s) => {
    const r = new Rng(s.rng);
    const f = startFilm(s, s.playerId, { ...p, title: p.title.trim() }, r);
    pushNews(s, `${playerStudio(s).name} greenlight "${f.title}" (${TIERS[f.tier].label}-budget ${f.genre}).`, 'studio');
    s.rng = r.state;
  });
}

export function releaseError(state: GameState, filmId: string, abs: number): string | null {
  const f = state.films[filmId];
  if (!f || f.studioId !== state.playerId || f.status !== 'post') return 'That film is not ready to release.';
  if (abs <= absWeek(state)) return 'Pick a future week.';
  return null;
}

export function setRelease(state: GameState, filmId: string, abs: number, marketingRatio: number): GameState {
  if (releaseError(state, filmId, abs)) return state;
  return produce(state, (s) => {
    const f = s.films[filmId];
    scheduleRelease(s, f, abs, marketingRatio);
    pushNews(s, `"${f.title}" will open in ${abs - absWeek(s)} week(s).`, 'release');
  });
}

export function setTraining(state: GameState, schedule: TrainingActivity[]): GameState {
  return produce(state, (s) => {
    s.training.schedule = schedule.slice(0, 5);
  });
}

export function toggleRest(state: GameState, actorId: string): GameState {
  return produce(state, (s) => {
    const has = s.training.resting.includes(actorId);
    s.training.resting = has ? s.training.resting.filter((x) => x !== actorId) : [...s.training.resting, actorId];
  });
}

export function makeOffer(state: GameState, offer: Offer, round: number): { state: GameState; result: OfferResult } {
  const result = evaluateOffer(state, offer, round);
  if (result.outcome === 'counter') return { state, result };
  const next = produce(state, (s) => {
    if (result.outcome === 'accepted') completeSigning(s, offer);
    else if (result.walkAway) failNegotiation(s, offer.actorId);
  });
  return { state: next, result };
}

export function releaseActor(state: GameState, actorId: string): GameState {
  const a = state.actors[actorId];
  if (!a || a.studioId !== state.playerId || a.filmId) return state;
  return produce(state, (s) => releaseActorImpl(s, actorId));
}

export function toggleTransferList(state: GameState, actorId: string): GameState {
  return produce(state, (s) => {
    const a = s.actors[actorId];
    if (a && a.studioId === s.playerId) a.transferListed = !a.transferListed;
  });
}

export function assignScout(state: GameState, scoutId: string, target: { region?: RegionId; actorId?: string }): GameState {
  return produce(state, (s) => assignScoutImpl(s, scoutId, target));
}

export function hireScout(state: GameState): GameState {
  return produce(state, (s) => {
    const r = new Rng(s.rng);
    hireScoutImpl(s, r);
    s.rng = r.state;
  });
}

export function fireScout(state: GameState, scoutId: string): GameState {
  return produce(state, (s) => {
    s.scouts = s.scouts.filter((x) => x.id !== scoutId);
  });
}

export function upgradeAnalysts(state: GameState): GameState {
  const lvl = state.staff.analystLevel;
  if (lvl >= 5 || playerStudio(state).cash < ANALYST_UPGRADE[lvl + 1]) return state;
  return produce(state, (s) => {
    spend(playerStudio(s), ANALYST_UPGRADE[lvl + 1]);
    s.staff.analystLevel = lvl + 1;
  });
}

export function loanTerms(state: GameState): { max: number; rate: number } {
  const rep = playerStudio(state).reputation;
  return { max: Math.max(0, Math.round(30 + rep * 1.2 - debt(state))), rate: Math.round((0.14 - rep * 0.0008) * 1000) / 1000 };
}

export function takeLoan(state: GameState, amount: number): GameState {
  const t = loanTerms(state);
  if (amount <= 0 || amount > t.max) return state;
  return produce(state, (s) => {
    const i = t.rate / WEEKS_PER_SEASON;
    const nWeeks = 104;
    const payment = (amount * i) / (1 - Math.pow(1 + i, -nWeeks));
    s.loans.push({ id: newId(s, 'l'), principal: amount, remaining: amount, rate: t.rate, weeklyPayment: payment, takenAbs: absWeek(s) });
    const me = playerStudio(s);
    me.cash += amount;
    pushInbox(s, { from: 'Bank', subject: `Loan approved: ${fmtMoney(amount)}`, body: `${fmtMoney(amount)} at ${(t.rate * 100).toFixed(1)}% over two seasons. Weekly repayment ${fmtMoney(payment, 2)}.`, kind: 'finance' });
  });
}

export function repayLoan(state: GameState, loanId: string): GameState {
  const l = state.loans.find((x) => x.id === loanId);
  if (!l || playerStudio(state).cash < l.remaining) return state;
  return produce(state, (s) => {
    const loan = s.loans.find((x) => x.id === loanId)!;
    spend(playerStudio(s), loan.remaining);
    s.loans = s.loans.filter((x) => x.id !== loanId);
  });
}

export function markRead(state: GameState, msgId: string | 'all'): GameState {
  return produce(state, (s) => {
    for (const m of s.inbox) if (msgId === 'all' || m.id === msgId) m.read = true;
  });
}

export function dismissReport(state: GameState, filmId: string): GameState {
  return produce(state, (s) => {
    s.reports = s.reports.filter((x) => x.filmId !== filmId);
  });
}

export type { GreenlightParams, Offer, OfferResult, Studio };
export { SKILLS };
