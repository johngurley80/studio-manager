/**
 * Simple scripted "players" used by the headless balance sim and the tests.
 * They only use the public action API, exactly like the UI does.
 */
import { MARKETING, REGION_IDS, SQUAD_MAX, TIERS, TIER_ORDER } from './data';
import {
  advanceWeek,
  assignScout,
  concludeSeason,
  dismissReview,
  greenlight,
  greenlightError,
  hireScout,
  loanTerms,
  makeOffer,
  releaseActor,
  resolveDecision,
  setRelease,
  setTraining,
  takeLoan,
  upgradeAnalysts,
} from './engine';
import { directorScore } from './film';
import { bestSkill, marketValue, overall } from './people';
import { autoCast, availableDirectors, previewFilm, upfrontCost } from './production';
import { bestReleaseWeek } from './rivals';
import { absWeek, freeAgents, playerStudio, rosterOf } from './state';
import { askingSalary, feeAsk, interested, preferredYears, releaseCost, wantsTopBilling } from './transfers';
import type { BudgetTier, GameState, Script, TrainingActivity } from './types';

export type AiStrategy = 'decent' | 'smart' | 'reckless';

const PROD_CHOICE: Record<AiStrategy, Record<string, number>> = {
  decent: { stunt: 0, feud: 1, overrun: 0, reshoots: 1, leak: 2, diva: 2, breakout: 1, weather: 0 },
  smart: { stunt: 0, feud: 1, overrun: 0, reshoots: 0, leak: 0, diva: 2, breakout: 0, weather: 0 },
  reckless: { stunt: 1, feud: 2, overrun: 0, reshoots: 0, leak: 0, diva: 0, breakout: 0, weather: 1 },
};

function handleDecisions(s: GameState, strat: AiStrategy): GameState {
  let guard = 0;
  while (s.decisions.length && guard++ < 20) {
    const d = s.decisions[0];
    let answers: number[] = [0];
    if (d.kind === 'production') answers = [PROD_CHOICE[strat][String(d.data.eventId)] ?? 0];
    else if (d.kind === 'rivalBid') {
      const a = s.actors[String(d.data.actorId)];
      const fee = Number(d.data.fee);
      const value = a ? marketValue(a, s.season) : 0;
      if (strat === 'reckless') answers = [1];
      else if (strat === 'smart') answers = [a && (a.age > 48 || fee > value * 1.3) ? 0 : 2];
      else answers = [fee > value * 1.3 ? 0 : 1];
    } else if (d.kind === 'transferRequest') answers = [0];
    else if (d.kind === 'press') answers = d.questions.map(() => (strat === 'reckless' ? 0 : 1));
    s = resolveDecision(s, d.id, answers);
  }
  return s;
}

function trainingPlan(s: GameState, strat: AiStrategy): TrainingActivity[] {
  if (strat === 'reckless') return ['workshop', 'stunts', 'improv', 'workshop', 'stunts'];
  if (strat === 'decent') return ['workshop', 'stunts', 'improv', 'rest', 'rest'];
  // smart: lean on the skill the young core is weakest at, keep workload at 3
  const young = rosterOf(s, s.playerId).filter((a) => a.age < 28);
  const tot = { drama: 0, comedy: 0, action: 0 };
  for (const a of young) {
    tot.drama += a.drama;
    tot.comedy += a.comedy;
    tot.action += a.action;
  }
  const weakest = (Object.keys(tot) as (keyof typeof tot)[]).sort((a, b) => tot[a] - tot[b])[0];
  const act: TrainingActivity = weakest === 'drama' ? 'workshop' : weakest === 'action' ? 'stunts' : 'improv';
  return ['workshop', act, 'improv', 'rest', 'rest'];
}

function scheduleReleases(s: GameState, strat: AiStrategy): GameState {
  const abs = absWeek(s);
  for (const f of Object.values(s.films)) {
    if (f.studioId !== s.playerId || f.status !== 'post') continue;
    if (strat === 'reckless') {
      s = setRelease(s, f.id, abs + 1, MARKETING[2].ratio);
    } else if (strat === 'smart') {
      const when = bestReleaseWeek(s, f.genre, f.tier, abs + 1, abs + 8, f.id);
      const q = previewFilm(s, { genre: f.genre, tier: f.tier, script: null, directorId: f.directorId, cast: f.cast });
      const ratio = q.audience > 62 ? MARKETING[2].ratio : MARKETING[1].ratio;
      s = setRelease(s, f.id, when, ratio);
    } else {
      s = setRelease(s, f.id, abs + 2, MARKETING[1].ratio);
    }
  }
  return s;
}

function pickTier(cash: number, strat: AiStrategy): BudgetTier | null {
  if (strat === 'reckless') return cash > 300 ? 'tentpole' : cash > 40 ? 'high' : 'mid';
  if (strat === 'smart') return cash > 130 ? 'high' : cash > 60 ? 'mid' : cash > 25 ? 'low' : cash > 10 ? 'micro' : null;
  return cash > 70 ? 'mid' : cash > 25 ? 'low' : cash > 10 ? 'micro' : null;
}

function tryGreenlight(s: GameState, strat: AiStrategy): GameState {
  const me = playerStudio(s);
  const active = Object.values(s.films).filter((f) => f.studioId === me.id && f.status === 'production').length;
  const maxActive = strat === 'smart' ? 3 : 2;
  if (active >= maxActive) return s;
  const tier = pickTier(me.cash, strat);
  if (!tier) return s;
  const scripts = s.scripts.slice();
  let best: { score: number; script: Script; directorId: string; cast: ReturnType<typeof autoCast> } | null = null;
  const dirs = availableDirectors(s).filter((d) => d.fee <= TIERS[tier].budget * 0.06 + 0.6);
  if (!dirs.length) return s;
  const candidates = strat === 'smart' ? scripts : scripts.sort((a, b) => b.quality - a.quality).slice(0, 2);
  for (const sc of candidates) {
    const genre = sc.genre;
    const director = dirs.slice().sort((a, b) => directorScore(b, genre) - directorScore(a, genre))[0];
    const cast = autoCast(s, me.id, genre, sc.demands, director, { chemistry: strat === 'smart' });
    if (cast.length < 2) continue;
    const q = previewFilm(s, { genre, tier, script: sc, directorId: director.id, cast });
    const score = strat === 'smart' ? q.critics + q.audience - sc.price * 2 : sc.quality;
    if (!best || score > best.score) best = { score, script: sc, directorId: director.id, cast };
  }
  if (!best) return s;
  if (strat === 'smart' && best.score < 108 && active > 0) return s;
  const up = upfrontCost({ tier, scriptPrice: best.script.price, directorFee: s.directors[best.directorId].fee });
  const reserve = strat === 'reckless' ? 0 : TIERS[tier].budget * (strat === 'smart' ? 0.9 : 0.6);
  if (me.cash < up + reserve) return s;
  const params = { title: best.script.title, genre: best.script.genre, tier, script: best.script, directorId: best.directorId, cast: best.cast };
  if (greenlightError(s, params)) return s;
  return greenlight(s, params);
}

function sign(s: GameState, actorId: string, maxSalary: number, fee = 0): GameState {
  const a = s.actors[actorId];
  const years = preferredYears(a);
  const billing = wantsTopBilling(a);
  const ask = askingSalary(s, a, years, billing);
  if (ask > maxSalary) return s;
  let res = makeOffer(s, { actorId, salary: ask, years, topBilling: billing, fee }, 0);
  if (res.result.outcome === 'counter') {
    res = makeOffer(s, { actorId, salary: res.result.counterSalary ?? ask * 1.05, years, topBilling: billing, fee: res.result.counterFee ?? fee }, 1);
  }
  if (res.result.outcome === 'counter') {
    res = makeOffer(s, { actorId, salary: res.result.counterSalary ?? ask * 1.1, years, topBilling: billing, fee: res.result.counterFee ?? fee }, 2);
  }
  return res.state;
}

function squadManagement(s: GameState, strat: AiStrategy): GameState {
  const me = playerStudio(s);
  const roster = rosterOf(s, me.id);
  const abs = absWeek(s);

  // renewals late in the season
  if (s.week >= 44) {
    for (const a of roster) {
      if (a.contractEnd > s.season || a.wantsToLeave) continue;
      const keep = strat === 'reckless' ? true : strat === 'smart' ? overall(a) >= 10 || a.potential >= 14 : overall(a) >= 9.5;
      if (keep) s = sign(s, a.id, strat === 'reckless' ? 99 : Math.max(1, a.salary * 1.6));
    }
  }
  if (s.week % 4 !== 0) return s;

  const fa = freeAgents(s).filter((a) => a.blockedUntil <= abs && interested(s, a));
  if (strat === 'decent') {
    if (roster.length < 24) {
      const pick = fa.filter((a) => overall(a) >= 8.5 && a.age < 55).sort((a, b) => askingSalary(s, a, 2, false) - askingSalary(s, b, 2, false))[0];
      if (pick) s = sign(s, pick.id, 1.2);
    }
    return s;
  }
  if (strat === 'reckless') {
    if (me.cash > 30 && roster.length < SQUAD_MAX) {
      const star = fa.sort((a, b) => b.starPower - a.starPower)[0];
      if (star) s = sign(s, star.id, 99);
    }
    const rivalStar = Object.values(s.actors)
      .filter((a) => a.studioId && a.studioId !== me.id && !a.filmId && a.starPower >= 13)
      .sort((a, b) => b.starPower - a.starPower)[0];
    if (rivalStar && me.cash > 60 && rosterOf(s, me.id).length < SQUAD_MAX) s = sign(s, rivalStar.id, 99, feeAsk(s, rivalStar));
    return s;
  }

  // smart: scout, sign young high-potential talent, prune dead weight, add the odd proven star
  if (s.staff.analystLevel < 4 && me.cash > 60) s = upgradeAnalysts(s);
  if (s.scouts.length < 3 && me.cash > 50) s = hireScout(s);
  s.scouts.forEach((sc, i) => {
    if (!sc.region && !sc.targetActorId) s = assignScout(s, sc.id, { region: REGION_IDS[(abs + i * 3) % REGION_IDS.length] });
  });
  const current = rosterOf(s, me.id);
  const deadweight = current
    .filter((a) => !a.filmId && a.age > 34 && overall(a) < 9 && releaseCost(s, a) < 1.5)
    .sort((a, b) => overall(a) - overall(b))[0];
  if (deadweight && current.length > 22) s = releaseActor(s, deadweight.id);
  if (rosterOf(s, me.id).length < SQUAD_MAX - 1) {
    const prospects = fa
      .filter((a) => a.scouted && a.age <= 24 && a.potential >= 14 && a.potential - bestSkill(a) >= 3)
      .sort((a, b) => b.potential - a.potential);
    if (prospects[0]) s = sign(s, prospects[0].id, 1.3);
  }
  if (me.cash > 120 && rosterOf(s, me.id).length < SQUAD_MAX - 1) {
    const vet = fa.filter((a) => overall(a) >= 13 && a.age < 50).sort((a, b) => overall(b) - overall(a))[0];
    if (vet) s = sign(s, vet.id, Math.min(6, me.cash * 0.03));
  }
  if (me.cash > 200 && rosterOf(s, me.id).length < SQUAD_MAX - 1) {
    const target = Object.values(s.actors)
      .filter((a) => a.studioId && a.studioId !== me.id && !a.filmId && overall(a) >= 14 && a.age < 45)
      .sort((a, b) => overall(b) - overall(a))[0];
    if (target && feeAsk(s, target) < me.cash * 0.1) s = sign(s, target.id, Math.min(7, me.cash * 0.03), feeAsk(s, target));
  }
  return s;
}

function finances(s: GameState, strat: AiStrategy): GameState {
  const me = playerStudio(s);
  const t = loanTerms(s);
  if (strat === 'reckless' && me.cash < 120 && t.max > 5) return takeLoan(s, t.max);
  if (strat !== 'reckless' && me.cash < 0 && t.max > 5) return takeLoan(s, Math.min(t.max, 25));
  return s;
}

/** Plays one full week for the AI (decisions, actions, then advance). */
export function aiWeek(state: GameState, strat: AiStrategy): GameState {
  let s = state;
  if (s.phase === 'awards') return concludeSeason(s);
  if (s.phase === 'review') s = dismissReview(s);
  if (s.phase !== 'playing') return s;
  s = handleDecisions(s, strat);
  if (s.week === 1 || s.week % 8 === 0) s = setTraining(s, trainingPlan(s, strat));
  s = scheduleReleases(s, strat);
  s = squadManagement(s, strat);
  s = finances(s, strat);
  s = tryGreenlight(s, strat);
  s = handleDecisions(s, strat);
  return advanceWeek(s);
}

export function tierIndex(t: BudgetTier): number {
  return TIER_ORDER.indexOf(t);
}
