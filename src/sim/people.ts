import { GENRE_DEMANDS, GENRES, REGIONS, REGION_IDS, SKILLS, STYLE_IDS } from './data';
import { personName } from './names';
import type { Rng } from './rng';
import type { Actor, Director, FaceGenes, Genre, RegionId, Skill } from './types';
import { clamp } from './util';

export function makeFace(r: Rng, age: number): FaceGenes {
  return {
    skin: r.int(0, 7),
    hair: r.int(0, 9),
    hairColor: age > 55 ? r.pick([6, 7, 7]) : r.int(0, 5),
    eyes: r.int(0, 3),
    eyeColor: r.int(0, 4),
    brows: r.int(0, 3),
    nose: r.int(0, 3),
    mouth: r.int(0, 4),
    jaw: r.int(0, 3),
    extra: r.chance(0.55) ? 0 : r.int(1, 5),
    bg: r.int(0, 5),
  };
}

export interface ActorOpts {
  id: string;
  tier: number;
  ageMin?: number;
  ageMax?: number;
  region?: RegionId;
  studioId: string | null;
  season: number;
  skillBias?: Partial<Record<Skill, number>>;
}

export function bestSkill(a: Pick<Actor, Skill>): number {
  return Math.max(a.drama, a.comedy, a.action);
}

export function specialty(a: Pick<Actor, Skill>): Skill {
  return SKILLS.reduce((best, s) => (a[s] > a[best] ? s : best), 'drama' as Skill);
}

export function overall(a: Actor): number {
  const best = bestSkill(a);
  const mean = (a.drama + a.comedy + a.action) / 3;
  return clamp(best * 0.6 + mean * 0.2 + a.charisma * 0.2, 1, 20);
}

export function generateActor(r: Rng, o: ActorOpts): Actor {
  const age = r.int(o.ageMin ?? 19, o.ageMax ?? 62);
  const region = o.region ?? r.pick(REGION_IDS);
  const bias = REGIONS[region].bias;
  const level = 4 + o.tier * 11 + r.normal(0, 1.6) + (age < 24 ? -2 : 0) + (age > 32 && age < 55 ? 1 : 0);
  const spec = r.weighted(SKILLS, (s) => 1 + (bias[s] ?? 0) + (o.skillBias?.[s] ?? 0));
  const skill = (s: Skill) => {
    const base = s === spec ? level + r.range(1, 4) : level - r.range(1, 7);
    return clamp(base + (bias[s] ?? 0) * 0.5 + (o.skillBias?.[s] ?? 0) * 0.3, 1, 20);
  };
  const drama = skill('drama');
  const comedy = skill('comedy');
  const action = skill('action');
  const charisma = clamp(4 + o.tier * 9 + r.normal(0, 2.5) + (bias.charisma ?? 0), 1, 20);
  const fame = clamp(o.tier * 15 + r.normal(0, 2.4) + (age > 30 ? 2 : 0) - (age < 24 ? 4 : 0), 1, 20);
  const ego = clamp(fame * 0.55 + r.range(1, 8), 1, 20);
  const best = Math.max(drama, comedy, action);
  const youth = clamp((28 - age) / 9, 0, 1);
  const potential = clamp(best + youth * r.range(1, 9) + r.range(0, 1.5), best, 20);
  const genreRep = {} as Record<Genre, number>;
  for (const g of GENRES) {
    const d = GENRE_DEMANDS[g];
    const fit = (d.drama * drama + d.comedy * comedy + d.action * action) / 20;
    genreRep[g] = clamp(Math.round(fit * 40 + fame * 1.5 + r.range(-8, 8) + (age > 35 ? 8 : 0)), 0, 100);
  }
  const n = personName(r);
  const a: Actor = {
    id: o.id,
    first: n.first,
    last: n.last,
    age,
    region,
    drama,
    comedy,
    action,
    charisma,
    starPower: fame,
    reliability: clamp(r.range(4, 19) + (region === 'north' ? 2 : 0), 1, 20),
    ego,
    potential,
    morale: r.range(55, 80),
    form: r.range(45, 70),
    salary: 0,
    contractEnd: o.season + r.int(0, 3),
    topBilling: false,
    studioId: o.studioId,
    genreRep,
    face: makeFace(r, age),
    history: [],
    awards: [],
    filmId: null,
    injuredWeeks: 0,
    lowMoraleWeeks: 0,
    idleWeeks: 0,
    transferListed: false,
    wantsToLeave: false,
    scouted: false,
    blockedUntil: 0,
    discovered: false,
    retired: false,
  };
  a.salary = Math.round(salaryValue(a) * r.range(0.85, 1.1) * 100) / 100;
  return a;
}

/** What an actor is worth per season in $M at a neutral studio. */
export function salaryValue(a: Actor): number {
  const ov = overall(a) / 20;
  const sp = a.starPower / 20;
  const youthUpside = a.age < 26 ? Math.max(0, a.potential - bestSkill(a)) * 0.03 : 0;
  return Math.max(0.1, 0.1 + ov * ov * 1.6 + sp * sp * sp * 6 + youthUpside);
}

/** Buyout fee a rival studio expects. */
export function marketValue(a: Actor, season: number): number {
  const yearsLeft = Math.max(1, a.contractEnd - season + 1);
  const youth = a.age < 26 ? 1 + Math.max(0, a.potential - bestSkill(a)) * 0.08 : a.age > 55 ? 0.6 : 1;
  return Math.round(salaryValue(a) * (1.2 + yearsLeft * 0.35) * youth * 10) / 10;
}

export function fullName(p: { first: string; last: string }): string {
  return `${p.first} ${p.last}`;
}

export function generateDirector(r: Rng, id: string): Director {
  const age = r.int(28, 72);
  const skill = clamp(r.normal(10.5, 3.6) + (age > 40 ? 1 : 0), 3, 20);
  const style = r.pick(STYLE_IDS);
  const specialties = r.shuffle(GENRES).slice(0, 2);
  const n = personName(r);
  return {
    id,
    first: n.first,
    last: n.last,
    age,
    style,
    skill,
    reliability: clamp(r.range(4, 19) + (style === 'Journeyman' ? 3 : 0), 1, 20),
    specialties,
    fee: Math.round((0.2 + Math.pow(skill / 20, 2.4) * 5.5) * 100) / 100,
    face: makeFace(r, age),
    filmId: null,
    films: 0,
    awards: [],
  };
}

/** Weekly growth/decline for one actor. `slots` is per-skill training count. */
export function developActor(
  a: Actor,
  slots: Record<Skill, number>,
  workload: number,
  filming: boolean,
  r: Rng,
): void {
  const youth = clamp((31 - a.age) / 10, 0, 1.2);
  const gap = Math.max(0, a.potential - bestSkill(a));
  const gapFactor = clamp(gap / 3, 0.05, 1);
  const learn = 0.011 * youth * gapFactor * (0.8 + a.reliability / 40) * (0.6 + a.form / 125);
  for (const s of SKILLS) {
    if (a[s] < a.potential) a[s] = Math.min(a.potential, a[s] + learn * slots[s]);
  }
  if (filming) {
    const sp = specialty(a);
    if (a[sp] < a.potential) a[sp] = Math.min(a.potential, a[sp] + learn * 1.5);
  }
  a.charisma = clamp(a.charisma + learn * 0.15 * slots.drama, 1, 20);

  if (a.age > 50) {
    const decay = 0.006 + (a.age - 50) * 0.0009;
    a.action = clamp(a.action - decay * 1.6, 1, 20);
    a.comedy = clamp(a.comedy - decay * 0.6, 1, 20);
    a.charisma = clamp(a.charisma - decay * 0.4, 1, 20);
    if (a.age < 72) a.drama = clamp(a.drama + 0.004 + slots.drama * 0.002, 1, 20);
  }

  // morale and form respond to workload
  const moraleDelta = [1.4, 1.0, 0.5, 0, -1.1, -2.4][clamp(workload, 0, 5)];
  const formDelta = filming ? 1.8 : [-2.6, -1.2, 0.4, 1.4, 1.8, 2][clamp(workload, 0, 5)];
  a.morale = clamp(a.morale + moraleDelta + (62 - a.morale) * 0.02 + r.range(-0.4, 0.4), 0, 100);
  a.form = clamp(a.form + formDelta + r.range(-1, 1), 0, 100);
}
