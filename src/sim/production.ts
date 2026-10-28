import { GENRE_DEMANDS, STYLES, SUPPORT_SLOTS, TIERS } from './data';
import { blendDemands, castPairs, evaluateFilm, genreFit, pairChemistry, rolePerformance } from './film';
import { fullName } from './people';
import type { Rng } from './rng';
import { absWeek, newId, playerStudio, pushInbox, pushNews, rosterOf, spend, studioById } from './state';
import type { Actor, BudgetTier, CastSlot, Decision, Demands, Director, Film, GameState, Genre, Role, Script } from './types';
import { clamp } from './util';

export function isAvailable(a: Actor): boolean {
  return a.filmId === null && a.injuredWeeks === 0;
}

export function availableRoster(s: GameState, studioId: string): Actor[] {
  return rosterOf(s, studioId).filter(isAvailable);
}

export function availableDirectors(s: GameState): Director[] {
  return Object.values(s.directors).filter((d) => d.filmId === null);
}

/**
 * Greedy casting used by rivals, the headless AI and the "auto-cast" button.
 * With `chemistry` on, the co-lead is chosen with the lead's chemistry in mind.
 */
export function autoCast(
  s: GameState,
  studioId: string,
  genre: Genre,
  demands: Demands,
  director: Director | null,
  opts: { supports?: number; chemistry?: boolean; pool?: Actor[] } = {},
): CastSlot[] {
  const pool = (opts.pool ?? availableRoster(s, studioId)).slice();
  const score = (a: Actor) => rolePerformance(a, demands, genre, director) + a.starPower * 0.12;
  pool.sort((a, b) => score(b) - score(a));
  if (pool.length < 2) return [];
  const lead = pool.shift()!;
  let coIdx = 0;
  if (opts.chemistry) {
    let best = -Infinity;
    pool.slice(0, 6).forEach((a, i) => {
      const v = score(a) + (pairChemistry(lead, a) - 50) * 0.09;
      if (v > best) {
        best = v;
        coIdx = i;
      }
    });
  }
  const colead = pool.splice(coIdx, 1)[0];
  const cast: CastSlot[] = [
    { actorId: lead.id, role: 'lead' },
    { actorId: colead.id, role: 'colead' },
  ];
  const n = Math.min(opts.supports ?? SUPPORT_SLOTS, SUPPORT_SLOTS, pool.length);
  // Prefer low-ego actors in support so stars are not wasted in small parts.
  const supports = pool
    .slice(0, n + 4)
    .sort((a, b) => score(b) - a.ego * 0.05 - (score(a) - b.ego * 0.05))
    .slice(0, n);
  for (const a of supports) cast.push({ actorId: a.id, role: 'support' });
  return cast;
}

export interface GreenlightParams {
  title: string;
  genre: Genre;
  tier: BudgetTier;
  script: Pick<Script, 'quality' | 'genre' | 'demands'> & { id?: string; price: number };
  directorId: string;
  cast: CastSlot[];
}

export function upfrontCost(p: { tier: BudgetTier; scriptPrice: number; directorFee: number }): number {
  return TIERS[p.tier].budget * 0.2 + p.scriptPrice + p.directorFee;
}

export function validateCast(s: GameState, studioId: string, cast: CastSlot[]): string | null {
  const leads = cast.filter((c) => c.role === 'lead').length;
  const coleads = cast.filter((c) => c.role === 'colead').length;
  if (leads !== 1) return 'Cast exactly one lead.';
  if (coleads !== 1) return 'Cast exactly one co-lead.';
  if (cast.filter((c) => c.role === 'support').length > SUPPORT_SLOTS) return `At most ${SUPPORT_SLOTS} supporting roles.`;
  const ids = new Set<string>();
  for (const c of cast) {
    const a = s.actors[c.actorId];
    if (!a || a.studioId !== studioId) return 'Every cast member must be under contract.';
    if (!isAvailable(a)) return `${fullName(a)} is not available.`;
    if (ids.has(a.id)) return `${fullName(a)} is cast twice.`;
    ids.add(a.id);
  }
  return null;
}

/** Creates a film in production. Caller validates affordability. */
export function startFilm(s: GameState, studioId: string, p: GreenlightParams, r: Rng): Film {
  const st = studioById(s, studioId)!;
  const director = s.directors[p.directorId];
  const info = TIERS[p.tier];
  const weeks = r.int(info.weeks[0], info.weeks[1]);
  const film: Film = {
    id: newId(s, 'f'),
    title: p.title,
    studioId,
    genre: p.genre,
    tier: p.tier,
    budget: info.budget,
    marketing: 0,
    scriptQuality: p.script.quality,
    genreFit: genreFit(p.script.genre, p.genre),
    demands: blendDemands(p.script.demands ?? GENRE_DEMANDS[p.genre], p.genre),
    directorId: p.directorId,
    cast: p.cast.map((c) => ({ ...c })),
    status: 'production',
    greenlitAbs: absWeek(s),
    productionWeeks: weeks,
    weeksLeft: weeks,
    releaseAbs: null,
    releaseSeason: null,
    hypeMod: 0,
    criticsMod: 0,
    audienceMod: 0,
    chemistryMod: 0,
    spent: 0,
    log: [`Greenlit in season ${s.season}, week ${s.week}.`],
    critics: null,
    audience: null,
    openingWeekend: 0,
    firstWeek: 0,
    legs: 0,
    gross: 0,
    seasonGross: {},
    lastWeekGross: 0,
    weeksInRelease: 0,
    streaming: 0,
    performances: [],
    directorScore: 0,
    weekendRank: 0,
  };
  s.films[film.id] = film;
  spend(st, p.script.price + director.fee + info.budget * 0.2);
  film.spent += info.budget * 0.2;
  director.filmId = film.id;
  st.lastGreenlitAbs = absWeek(s);
  if (p.script.id) s.scripts = s.scripts.filter((sc) => sc.id !== p.script.id);
  for (const c of film.cast) {
    const a = s.actors[c.actorId];
    a.filmId = film.id;
    a.idleWeeks = 0;
    applyCastingMorale(a, c.role);
  }
  return film;
}

function applyCastingMorale(a: Actor, role: Role): void {
  if (role === 'lead') a.morale = clamp(a.morale + 9, 0, 100);
  else if (role === 'colead') a.morale = clamp(a.morale + 5, 0, 100);
  else if (a.ego >= 14 || a.starPower >= 14) a.morale = clamp(a.morale - 8, 0, 100);
  else a.morale = clamp(a.morale + 2, 0, 100);
}

function wrapFilm(s: GameState, f: Film): void {
  f.status = 'post';
  f.log.push(`Wrapped after ${f.productionWeeks} weeks of shooting.`);
  for (const c of f.cast) {
    const a = s.actors[c.actorId];
    if (a && a.filmId === f.id) a.filmId = null;
  }
  const d = s.directors[f.directorId];
  if (d && d.filmId === f.id) {
    d.filmId = null;
    d.films += 1;
  }
  if (f.studioId === s.playerId) {
    pushInbox(s, {
      from: 'Post-production',
      subject: `"${f.title}" is in the can`,
      body: `Shooting has wrapped on "${f.title}". Pick a release date and a marketing campaign from the Films screen.`,
      kind: 'studio',
    });
  }
}

/* ---------------------------- production events ---------------------------- */

interface EventCtx {
  s: GameState;
  f: Film;
  r: Rng;
  cast: Actor[];
  lead: Actor;
  director: Director;
}

interface EventDef {
  id: string;
  weight: (c: EventCtx) => number;
  build: (c: EventCtx) => { title: string; body: string; options: { label: string; hint: string }[]; data: Record<string, string | number> };
  resolve: (c: EventCtx, choice: number, data: Record<string, string | number>) => string;
}

const addWeeks = (f: Film, w: number) => {
  f.weeksLeft += w;
  f.productionWeeks += w;
};
const overrun = (c: EventCtx, pct: number) => {
  const cost = c.f.budget * pct;
  spend(studioById(c.s, c.f.studioId)!, cost);
  c.f.spent += cost;
  return cost;
};
const bump = (a: Actor, key: 'morale' | 'ego', d: number) => {
  a[key] = clamp(a[key] + d, key === 'ego' ? 1 : 0, key === 'ego' ? 20 : 100);
};
const money = (m: number) => `$${m.toFixed(1)}M`;

const EVENTS: EventDef[] = [
  {
    id: 'stunt',
    weight: (c) => 0.6 + c.f.demands.action * 3 - c.lead.reliability * 0.02,
    build: (c) => ({
      title: 'Stunt goes wrong',
      body: `${fullName(c.lead)} was hurt during a stunt on "${c.f.title}". The medic says two weeks off; the producer wants to keep rolling.`,
      options: [
        { label: 'Shut down for two weeks', hint: '+2 weeks, +4% budget. Lead fully recovers.' },
        { label: 'Use a stunt double and keep going', hint: 'Audience -4. Lead morale -5.' },
        { label: 'Rewrite the role to be smaller', hint: 'Critics -5. Lead morale -12.' },
      ],
      data: { actorId: c.lead.id },
    }),
    resolve: (c, choice) => {
      const a = c.s.actors[c.lead.id];
      if (choice === 0) {
        addWeeks(c.f, 2);
        overrun(c, 0.04);
        return 'Production paused two weeks after a stunt injury.';
      }
      if (choice === 1) {
        c.f.audienceMod -= 4;
        a.injuredWeeks = Math.max(a.injuredWeeks, 3);
        bump(a, 'morale', -5);
        return 'A stunt double finished the action scenes.';
      }
      c.f.criticsMod -= 5;
      bump(a, 'morale', -12);
      return 'The lead role was rewritten after an injury.';
    },
  },
  {
    id: 'feud',
    weight: (c) => (c.cast.length >= 2 ? 0.3 + Math.max(0, ...c.cast.map((a) => a.ego)) / 12 : 0),
    build: (c) => {
      const sorted = c.cast.slice().sort((x, y) => y.ego - x.ego);
      const [a, b] = [sorted[0], sorted[1]];
      return {
        title: 'On-set feud',
        body: `${fullName(a)} and ${fullName(b)} have stopped speaking to each other. The crew is taking sides.`,
        options: [
          { label: `Side with ${a.first}`, hint: `${a.first} morale +6, ${b.first} morale -18.` },
          { label: 'Hire a mediator ($0.6M)', hint: 'Costs $0.6M. Chemistry -3.' },
          { label: 'Let them fight it out', hint: 'Chemistry -10, but the tabloids add hype +6.' },
        ],
        data: { a: a.id, b: b.id },
      };
    },
    resolve: (c, choice, data) => {
      const a = c.s.actors[data.a as string];
      const b = c.s.actors[data.b as string];
      if (choice === 0) {
        bump(a, 'morale', 6);
        bump(b, 'morale', -18);
        return `The studio sided with ${a.first} in an on-set feud.`;
      }
      if (choice === 1) {
        spend(studioById(c.s, c.f.studioId)!, 0.6);
        c.f.chemistryMod -= 3;
        return 'A mediator calmed an on-set feud.';
      }
      c.f.chemistryMod -= 10;
      c.f.hypeMod += 6;
      return 'A very public on-set feud made the gossip columns.';
    },
  },
  {
    id: 'overrun',
    weight: (c) => 0.4 + (20 - c.director.reliability) / 14 + STYLES[c.director.style].overrun,
    build: (c) => {
      const pct = 0.08 + c.r.range(0, 0.1);
      return {
        title: 'Budget overrun',
        body: `${fullName(c.director)} is over budget on "${c.f.title}" by ${money(c.f.budget * pct)}. Accounting needs a decision.`,
        options: [
          { label: 'Pay the overrun', hint: `Costs ${money(c.f.budget * pct)}.` },
          { label: 'Cut scenes to stay on budget', hint: 'Critics -5, audience -2.' },
          { label: 'Pressure the director', hint: `Costs ${money(c.f.budget * pct * 0.5)}, critics -2.` },
        ],
        data: { pct },
      };
    },
    resolve: (c, choice, data) => {
      const pct = Number(data.pct);
      if (choice === 0) {
        overrun(c, pct);
        return 'The studio covered a budget overrun.';
      }
      if (choice === 1) {
        c.f.criticsMod -= 5;
        c.f.audienceMod -= 2;
        return 'Scenes were cut to contain costs.';
      }
      overrun(c, pct / 2);
      c.f.criticsMod -= 2;
      return 'The director was leaned on to finish cheaper.';
    },
  },
  {
    id: 'reshoots',
    weight: () => 0.8,
    build: (c) => ({
      title: 'Test screening is lukewarm',
      body: `An early cut of "${c.f.title}" tested poorly with a preview audience. The third act isn't landing.`,
      options: [
        { label: 'Full reshoots', hint: '+3 weeks, +10% budget. Critics +6, audience +5.' },
        { label: 'Minor pick-up shots', hint: '+1 week, +3% budget. Critics +2, audience +2.' },
        { label: 'Release it as it is', hint: 'No cost. Audience -2.' },
      ],
      data: {},
    }),
    resolve: (c, choice) => {
      if (choice === 0) {
        addWeeks(c.f, 3);
        overrun(c, 0.1);
        c.f.criticsMod += 6;
        c.f.audienceMod += 5;
        return 'Full reshoots rebuilt the third act.';
      }
      if (choice === 1) {
        addWeeks(c.f, 1);
        overrun(c, 0.03);
        c.f.criticsMod += 2;
        c.f.audienceMod += 2;
        return 'Pick-up shots tightened the ending.';
      }
      c.f.audienceMod -= 2;
      return 'The studio kept the original cut.';
    },
  },
  {
    id: 'leak',
    weight: (c) => 0.5 + c.lead.starPower / 20,
    build: (c) => ({
      title: 'Footage leaked online',
      body: `Behind-the-scenes footage from "${c.f.title}" is all over the internet. ${fullName(c.lead)} is trending.`,
      options: [
        { label: 'Lean into it', hint: 'Hype +9, critics -2.' },
        { label: 'Legal crackdown', hint: 'Costs $1M, hype -3.' },
        { label: 'Drop an official teaser now', hint: `Costs ${money(c.f.budget * 0.03)}, hype +6.` },
      ],
      data: {},
    }),
    resolve: (c, choice) => {
      if (choice === 0) {
        c.f.hypeMod += 9;
        c.f.criticsMod -= 2;
        return 'The studio embraced a viral leak.';
      }
      if (choice === 1) {
        spend(studioById(c.s, c.f.studioId)!, 1);
        c.f.hypeMod -= 3;
        return 'Lawyers scrubbed leaked footage.';
      }
      overrun(c, 0.03);
      c.f.hypeMod += 6;
      return 'An early teaser turned a leak into buzz.';
    },
  },
  {
    id: 'diva',
    weight: (c) => Math.max(0, c.lead.ego - 9) / 5,
    build: (c) => ({
      title: 'Trailer demands',
      body: `${fullName(c.lead)}'s agent says their client needs a bigger trailer, a private chef and approval over the poster.`,
      options: [
        { label: 'Give them everything', hint: 'Costs $0.4M. Morale +10, ego +1.' },
        { label: 'Refuse', hint: 'Morale -15.' },
        { label: 'Offer a producer credit instead', hint: 'Morale +4, ego +2.' },
      ],
      data: { actorId: c.lead.id },
    }),
    resolve: (c, choice) => {
      const a = c.s.actors[c.lead.id];
      if (choice === 0) {
        spend(studioById(c.s, c.f.studioId)!, 0.4);
        bump(a, 'morale', 10);
        bump(a, 'ego', 1);
        return `${a.first} got the bigger trailer.`;
      }
      if (choice === 1) {
        bump(a, 'morale', -15);
        return `${a.first}'s demands were turned down.`;
      }
      bump(a, 'morale', 4);
      bump(a, 'ego', 2);
      return `${a.first} took a producer credit.`;
    },
  },
  {
    id: 'breakout',
    weight: (c) => (c.cast.some((a) => a.age < 27) ? 0.7 : 0.2),
    build: (c) => {
      const young = c.cast.slice().sort((x, y) => x.age - y.age)[0];
      return {
        title: 'A breakout performance',
        body: `Dailies are buzzing about ${fullName(young)}. The director wants to expand the part.`,
        options: [
          { label: 'Expand the role', hint: '+2 weeks, +4% budget. Critics +4, their morale +10.' },
          { label: 'Stick to the plan', hint: 'No change. Their morale -3.' },
        ],
        data: { actorId: young.id },
      };
    },
    resolve: (c, choice, data) => {
      const a = c.s.actors[data.actorId as string];
      if (choice === 0) {
        addWeeks(c.f, 2);
        overrun(c, 0.04);
        c.f.criticsMod += 4;
        bump(a, 'morale', 10);
        a.starPower = clamp(a.starPower + 0.8, 1, 20);
        return `${a.first}'s role was expanded after a breakout turn.`;
      }
      bump(a, 'morale', -3);
      return 'The shoot stuck to the plan.';
    },
  },
  {
    id: 'weather',
    weight: () => 0.6,
    build: (c) => ({
      title: 'Storm on location',
      body: `A week of storms has shut down the outdoor shoot on "${c.f.title}".`,
      options: [
        { label: 'Wait it out', hint: '+1 week.' },
        { label: 'Move to a sound stage', hint: `Costs ${money(c.f.budget * 0.05)}. Audience -1.` },
        { label: 'Shoot in the rain', hint: 'Gamble: critics +4 or -4.' },
      ],
      data: {},
    }),
    resolve: (c, choice) => {
      if (choice === 0) {
        addWeeks(c.f, 1);
        return 'Storms delayed the shoot by a week.';
      }
      if (choice === 1) {
        overrun(c, 0.05);
        c.f.audienceMod -= 1;
        return 'Exteriors were rebuilt on a sound stage.';
      }
      const good = c.r.chance(0.5);
      c.f.criticsMod += good ? 4 : -4;
      return good ? 'Rain-soaked scenes look stunning.' : 'Rain-soaked scenes look murky.';
    },
  },
];

function ctxFor(s: GameState, f: Film, r: Rng): EventCtx | null {
  const cast = f.cast.map((c) => s.actors[c.actorId]).filter(Boolean);
  const leadSlot = f.cast.find((c) => c.role === 'lead');
  const lead = leadSlot ? s.actors[leadSlot.actorId] : undefined;
  const director = s.directors[f.directorId];
  if (!lead || !director) return null;
  return { s, f, r, cast, lead, director };
}

export function resolveProductionDecision(s: GameState, d: Decision, choice: number, r: Rng): void {
  const f = s.films[d.data.filmId as string];
  if (!f) return;
  const def = EVENTS.find((e) => e.id === d.data.eventId);
  const c = ctxFor(s, f, r);
  if (!def || !c) return;
  f.log.push(def.resolve(c, choice, d.data));
}

/** Advances every production by a week; may raise events for the player. */
export function productionWeek(s: GameState, r: Rng): void {
  const abs = absWeek(s);
  for (const f of Object.values(s.films)) {
    if (f.status !== 'production') continue;
    const st = studioById(s, f.studioId);
    if (!st) continue;
    const weekly = (f.budget * 0.8) / f.productionWeeks;
    spend(st, weekly);
    f.spent += weekly;
    f.weeksLeft -= 1;

    const c = ctxFor(s, f, r);
    const avgRel = c ? c.cast.reduce((x, a) => x + a.reliability, 0) / Math.max(1, c.cast.length) : 10;
    const p = 0.085 * (1 + (10 - avgRel) / 14);
    if (c && f.weeksLeft > 0 && r.chance(p)) {
      const def = r.weighted(EVENTS, (e) => e.weight(c));
      if (f.studioId === s.playerId) {
        const built = def.build(c);
        const d: Decision = {
          id: newId(s, 'd'),
          kind: 'production',
          title: built.title,
          body: built.body,
          questions: [{ prompt: 'How do you respond?', options: built.options }],
          data: { ...built.data, filmId: f.id, eventId: def.id },
          abs,
        };
        s.decisions.push(d);
        pushInbox(s, { from: 'Line Producer', subject: `${built.title}: "${f.title}"`, body: built.body, kind: 'studio', decisionId: d.id });
      } else {
        const built = def.build(c);
        f.log.push(def.resolve(c, r.int(0, built.options.length - 1), built.data));
      }
    }
    if (f.weeksLeft <= 0) wrapFilm(s, f);
  }
}

/** Live breakdown used by the greenlight screen. */
export function previewFilm(
  s: GameState,
  p: { genre: Genre; tier: BudgetTier; script: Pick<Script, 'quality' | 'genre' | 'demands'> | null; directorId: string | null; cast: CastSlot[] },
) {
  const director = p.directorId ? s.directors[p.directorId] : null;
  const script = p.script ?? { quality: 40, genre: p.genre, demands: GENRE_DEMANDS[p.genre] };
  return evaluateFilm(
    {
      genre: p.genre,
      tier: p.tier,
      scriptQuality: script.quality,
      genreFit: genreFit(script.genre, p.genre),
      demands: blendDemands(script.demands, p.genre),
      director,
      cast: p.cast,
      criticsMod: 0,
      audienceMod: 0,
      chemistryMod: 0,
    },
    s.actors,
  );
}

/** ± range on predictions; better analysts narrow it. */
export function predictionFuzz(analystLevel: number): number {
  return [0, 18, 13, 9, 6, 3][clamp(analystLevel, 1, 5)];
}

export { castPairs };

export function notifyPlayerFilmNews(s: GameState, f: Film, text: string): void {
  if (f.studioId === playerStudio(s).id) pushNews(s, text, 'studio');
}
