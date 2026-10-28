import { MAX_SCOUTS, REGIONS, REGION_IDS, SQUAD_MAX, STRATEGIES } from './data';
import { bestSkill, fullName, generateActor, marketValue, overall, salaryValue } from './people';
import type { Rng } from './rng';
import { absWeek, earn, freeAgents, newId, playerStudio, pushInbox, pushNews, rosterOf, spend, studioById } from './state';
import type { Actor, Decision, GameState, RegionId } from './types';
import { clamp, fmtMoney } from './util';

export interface Offer {
  actorId: string;
  salary: number;
  years: number;
  topBilling: boolean;
  fee: number;
}

export interface OfferResult {
  outcome: 'accepted' | 'counter' | 'rejected';
  message: string;
  counterSalary?: number;
  counterFee?: number;
  wantsBilling?: boolean;
  walkAway?: boolean;
}

export function preferredYears(a: Actor): number {
  return a.age < 28 ? 4 : a.age < 40 ? 3 : a.age < 55 ? 2 : 1;
}

export function wantsTopBilling(a: Actor): boolean {
  return a.ego >= 13;
}

/** Salary ($M/season) an actor asks of a studio for a given deal shape. */
export function askingSalary(s: GameState, a: Actor, years: number, topBilling: boolean): number {
  const st = playerStudio(s);
  const renewal = a.studioId === st.id;
  let ask = salaryValue(a);
  ask *= 1 + clamp((a.starPower * 4 - st.reputation) / 150, -0.15, 0.35);
  ask *= 1 + (a.ego - 10) / 50;
  if (renewal) ask *= 1 + (60 - a.morale) / 220;
  if (wantsTopBilling(a) && !topBilling) ask *= 1.18;
  ask *= 1 + Math.abs(years - preferredYears(a)) * 0.04;
  return Math.round(ask * 20) / 20;
}

export function feeAsk(s: GameState, a: Actor): number {
  if (!a.studioId || a.studioId === s.playerId) return 0;
  const listed = a.transferListed ? 0.85 : 1.15;
  return Math.round(marketValue(a, s.season) * listed * 10) / 10;
}

export function interested(s: GameState, a: Actor): boolean {
  return a.starPower * 4.2 <= playerStudio(s).reputation + 42;
}

export function evaluateOffer(s: GameState, o: Offer, round: number): OfferResult {
  const a = s.actors[o.actorId];
  const st = playerStudio(s);
  const name = fullName(a);
  if (a.blockedUntil > absWeek(s)) return { outcome: 'rejected', message: `${name}'s agent isn't taking your calls right now.` };
  if (a.studioId === st.id && a.wantsToLeave) return { outcome: 'rejected', message: `${name} has made it clear they want to leave.` };
  if (a.studioId !== st.id && rosterOf(s, st.id).length >= SQUAD_MAX)
    return { outcome: 'rejected', message: `Your roster is full (${SQUAD_MAX}). Release someone first.` };
  if (a.filmId && a.studioId !== st.id) return { outcome: 'rejected', message: `${name} is shooting a film and won't move mid-production.` };
  if (o.years < 1 || o.years > 5) return { outcome: 'rejected', message: 'Contracts run 1 to 5 seasons.' };

  const fee = feeAsk(s, a);
  if (fee > 0) {
    if (o.fee > st.cash) return { outcome: 'rejected', message: `You can't cover a ${fmtMoney(o.fee)} buyout.` };
    if (o.fee < fee * 0.8) {
      const owner = studioById(s, a.studioId)!;
      return { outcome: 'rejected', message: `${owner.name} laughs off the bid. They value ${a.first} at around ${fmtMoney(fee)}.` };
    }
    if (o.fee < fee) {
      const owner = studioById(s, a.studioId)!;
      return { outcome: 'counter', message: `${owner.name} will sell for ${fmtMoney(fee)}.`, counterFee: fee };
    }
  }

  const ask = askingSalary(s, a, o.years, o.topBilling) * (1 + 0.03 * round);
  if (!interested(s, a) && o.salary < ask * 1.5)
    return { outcome: 'rejected', message: `${name} doesn't see your studio as big enough. Only a huge offer (${fmtMoney(ask * 1.5)}/yr) might change that.` };
  const ratio = o.salary / ask;
  if (ratio >= 1) return { outcome: 'accepted', message: `${name} accepts! Welcome to the lot.` };
  if (ratio >= 0.82 && round < 3) {
    const billingNote = wantsTopBilling(a) && !o.topBilling ? ' Top billing would bring the price down.' : '';
    return {
      outcome: 'counter',
      message: `${name}'s agent asks for ${fmtMoney(ask, 2)}/yr over ${o.years} season${o.years > 1 ? 's' : ''}.${billingNote}`,
      counterSalary: Math.round(ask * 100) / 100,
      wantsBilling: wantsTopBilling(a) && !o.topBilling,
    };
  }
  return { outcome: 'rejected', message: `${name}'s agent walks away from the table.`, walkAway: true };
}

/** Moves an actor onto the player's books on agreed terms. */
export function completeSigning(s: GameState, o: Offer): void {
  const a = s.actors[o.actorId];
  const st = playerStudio(s);
  const prev = studioById(s, a.studioId);
  const renewal = a.studioId === st.id;
  if (prev && !renewal && o.fee > 0) {
    spend(st, o.fee);
    earn(prev, o.fee);
  }
  a.studioId = st.id;
  a.salary = Math.round(o.salary * 100) / 100;
  a.contractEnd = s.season + o.years - (s.week > 40 ? 0 : 1);
  if (o.topBilling && !a.topBilling) a.ego = clamp(a.ego + 2, 1, 20);
  a.topBilling = o.topBilling;
  a.morale = clamp(a.morale + (renewal ? 8 : 12), 0, 100);
  a.transferListed = false;
  a.wantsToLeave = false;
  a.lowMoraleWeeks = 0;
  a.scouted = true;
  if (renewal) {
    pushNews(s, `${fullName(a)} signs a new ${o.years}-season deal with ${st.name}.`, 'transfer');
  } else {
    pushNews(
      s,
      prev
        ? `${st.name} prise ${fullName(a)} away from ${prev.name} for ${fmtMoney(o.fee)}.`
        : `${st.name} sign free agent ${fullName(a)} (${fmtMoney(o.salary, 2)}/yr).`,
      'transfer',
    );
  }
}

export function failNegotiation(s: GameState, actorId: string): void {
  s.actors[actorId].blockedUntil = absWeek(s) + 8;
}

export function releaseCost(s: GameState, a: Actor): number {
  const seasonsLeft = Math.max(0, a.contractEnd - s.season) + (52 - s.week) / 52;
  return Math.round(a.salary * seasonsLeft * 0.5 * 100) / 100;
}

export function releaseActor(s: GameState, actorId: string): void {
  const a = s.actors[actorId];
  const st = playerStudio(s);
  spend(st, releaseCost(s, a));
  a.studioId = null;
  a.transferListed = false;
  a.wantsToLeave = false;
  a.topBilling = false;
  a.blockedUntil = absWeek(s) + 26;
  s.training.resting = s.training.resting.filter((id) => id !== actorId);
  pushNews(s, `${st.name} release ${fullName(a)} from their contract.`, 'transfer');
}

/* ------------------------------ rival activity ----------------------------- */

function moveToRival(s: GameState, a: Actor, buyerId: string, fee: number): void {
  const buyer = studioById(s, buyerId)!;
  const seller = studioById(s, a.studioId);
  if (seller && fee > 0) {
    earn(seller, fee);
    spend(buyer, fee);
  }
  a.studioId = buyerId;
  a.transferListed = false;
  a.wantsToLeave = false;
  a.topBilling = false;
  a.salary = Math.round(salaryValue(a) * 1.05 * 100) / 100;
  a.contractEnd = s.season + 2;
  a.morale = clamp(a.morale + 15, 0, 100);
  if (s.training.resting.includes(a.id)) s.training.resting = s.training.resting.filter((id) => id !== a.id);
}

export function rivalBids(s: GameState, r: Rng): void {
  const st = playerStudio(s);
  const mine = rosterOf(s, st.id).filter((a) => !a.filmId);
  if (!mine.length || s.decisions.some((d) => d.kind === 'rivalBid')) return;
  for (const rival of s.studios) {
    if (rival.isPlayer) continue;
    if (!r.chance(0.011)) continue;
    const target = r.weighted(mine, (a) => Math.pow(overall(a), 2) * (a.transferListed ? 6 : 1) * (a.wantsToLeave ? 3 : 1));
    const fee = Math.round(marketValue(target, s.season) * r.range(0.9, 1.4) * 10) / 10;
    if (rival.cash < fee * 1.5) continue;
    const d: Decision = {
      id: newId(s, 'd'),
      kind: 'rivalBid',
      title: `${rival.name} bid for ${fullName(target)}`,
      body: `${rival.name} have offered ${fmtMoney(fee)} for ${fullName(target)} (contract to season ${target.contractEnd}, ${fmtMoney(target.salary, 2)}/yr).`,
      questions: [
        {
          prompt: 'Your response?',
          options: [
            { label: `Accept ${fmtMoney(fee)}`, hint: `${target.first} leaves immediately.` },
            { label: 'Reject the bid', hint: target.ego >= 13 ? `${target.first} may be upset to miss out.` : 'They stay.' },
            { label: `Demand ${fmtMoney(fee * 1.3)}`, hint: 'They might pay. They might walk away.' },
          ],
        },
      ],
      data: { actorId: target.id, studioId: rival.id, fee },
      abs: absWeek(s),
    };
    s.decisions.push(d);
    pushInbox(s, { from: `${rival.name} (Business Affairs)`, subject: d.title, body: d.body, kind: 'agent', decisionId: d.id, actorId: target.id });
    return;
  }
}

export function resolveRivalBid(s: GameState, d: Decision, choice: number, r: Rng): void {
  const a = s.actors[d.data.actorId as string];
  const rival = studioById(s, d.data.studioId as string);
  const fee = Number(d.data.fee);
  if (!a || !rival || a.studioId !== s.playerId) return;
  if (choice === 0 || (choice === 2 && r.chance(0.45) && rival.cash > fee * 1.3)) {
    const paid = choice === 0 ? fee : Math.round(fee * 1.3 * 10) / 10;
    moveToRival(s, a, rival.id, paid);
    pushNews(s, `${rival.name} sign ${fullName(a)} from ${playerStudio(s).name} for ${fmtMoney(paid)}.`, 'transfer');
    pushInbox(s, { from: 'Business Affairs', subject: `${fullName(a)} sold`, body: `${fullName(a)} joins ${rival.name}. ${fmtMoney(paid)} has been received.`, kind: 'finance' });
    return;
  }
  if (choice === 2) pushInbox(s, { from: 'Business Affairs', subject: `${rival.name} walk away`, body: `${rival.name} refused to raise their bid for ${fullName(a)}.`, kind: 'agent' });
  if (a.ego >= 13 && rival.reputation > playerStudio(s).reputation) {
    a.morale = clamp(a.morale - 12, 0, 100);
    pushInbox(s, { from: `${a.first}'s agent`, subject: 'Disappointed', body: `${fullName(a)} is unhappy you blocked a move to ${rival.name}.`, kind: 'agent', actorId: a.id });
  }
}

export function transferRequests(s: GameState): void {
  for (const a of rosterOf(s, s.playerId)) {
    if (a.morale < 25) a.lowMoraleWeeks += 1;
    else a.lowMoraleWeeks = Math.max(0, a.lowMoraleWeeks - 1);
    if (a.lowMoraleWeeks >= 5 && !a.wantsToLeave && !s.decisions.some((d) => d.data.actorId === a.id)) {
      const d: Decision = {
        id: newId(s, 'd'),
        kind: 'transferRequest',
        title: `${fullName(a)} wants out`,
        body: `${fullName(a)} has been miserable for weeks and has asked to leave the studio.`,
        questions: [
          {
            prompt: 'How do you handle it?',
            options: [
              { label: 'Promise a lead role soon', hint: 'Morale +18. They will expect it.' },
              { label: 'Put them on the transfer list', hint: 'Rivals will start bidding.' },
              { label: "Refuse — they're under contract", hint: 'Morale -8, ego +1.' },
            ],
          },
        ],
        data: { actorId: a.id },
        abs: absWeek(s),
      };
      s.decisions.push(d);
      pushInbox(s, { from: `${a.first}'s agent`, subject: 'Transfer request', body: d.body, kind: 'agent', decisionId: d.id, actorId: a.id });
      return;
    }
  }
}

export function resolveTransferRequest(s: GameState, d: Decision, choice: number): void {
  const a = s.actors[d.data.actorId as string];
  if (!a) return;
  a.lowMoraleWeeks = 0;
  if (choice === 0) a.morale = clamp(a.morale + 18, 0, 100);
  else if (choice === 1) {
    a.transferListed = true;
    a.wantsToLeave = true;
  } else {
    a.morale = clamp(a.morale - 8, 0, 100);
    a.ego = clamp(a.ego + 1, 1, 20);
  }
}

/** Rivals keep their rosters topped up from the free-agent pool. */
export function rivalSignings(s: GameState, r: Rng): void {
  for (const st of s.studios) {
    if (st.isPlayer) continue;
    const roster = rosterOf(s, st.id);
    const need = roster.length < 15 ? 0.35 : roster.length < 20 && st.cash > 80 ? 0.03 : 0;
    if (!r.chance(need)) continue;
    const info = STRATEGIES[st.strategy as keyof typeof STRATEGIES];
    const pool = freeAgents(s).filter((a) => !a.discovered || r.chance(0.3));
    if (!pool.length) continue;
    const budget = Math.max(0.5, st.cash * 0.03);
    const affordable = pool.filter((a) => salaryValue(a) <= budget && a.starPower * 4.2 <= st.reputation + 50);
    if (!affordable.length) continue;
    const pick = r.weighted(affordable, (a) => {
      const bias = (info?.skillBias.drama ?? 0) * a.drama + (info?.skillBias.comedy ?? 0) * a.comedy + (info?.skillBias.action ?? 0) * a.action;
      return Math.pow(overall(a) + bias * 0.05, 3);
    });
    moveToRival(s, pick, st.id, 0);
    if (pick.starPower >= 11) pushNews(s, `${st.name} sign ${fullName(pick)}.`, 'transfer');
  }
}

/* --------------------------------- scouting -------------------------------- */

export function scoutWeeks(ability: number, region: boolean): number {
  return region ? Math.max(3, 7 - ability) : 2;
}

export function assignScout(s: GameState, scoutId: string, target: { region?: RegionId; actorId?: string }): void {
  const sc = s.scouts.find((x) => x.id === scoutId);
  if (!sc) return;
  sc.region = target.region ?? null;
  sc.targetActorId = target.actorId ?? null;
  sc.weeksLeft = scoutWeeks(sc.ability, !!target.region);
}

export function hireScout(s: GameState, r: Rng): void {
  if (s.scouts.length >= MAX_SCOUTS) return;
  const n = generateActor(r, { id: 'tmp', tier: 0.3, studioId: null, season: s.season });
  s.scouts.push({ id: newId(s, 's'), name: `${n.first} ${n.last}`, ability: r.int(2, 4), region: null, targetActorId: null, weeksLeft: 0 });
}

export function scoutingWeek(s: GameState, r: Rng): void {
  for (const sc of s.scouts) {
    if (!sc.region && !sc.targetActorId) continue;
    sc.weeksLeft -= 1;
    if (sc.weeksLeft > 0) continue;
    if (sc.targetActorId) {
      const a = s.actors[sc.targetActorId];
      if (a) {
        a.scouted = true;
        pushInbox(s, {
          from: `Scout ${sc.name}`,
          subject: `Report: ${fullName(a)}`,
          body: `I've watched ${fullName(a)} closely. Potential: ${Math.round(a.potential)}/20 (current best ${Math.round(bestSkill(a))}). ${verdictLine(a)}`,
          kind: 'scout',
          actorId: a.id,
        });
      }
    } else if (sc.region) {
      const region = sc.region;
      const seen = Object.values(s.actors).filter((a) => a.region === region && a.studioId !== s.playerId);
      for (const a of seen) a.scouted = true;
      const found: Actor[] = [];
      const count = r.int(1, 1 + Math.floor(sc.ability / 2));
      for (let i = 0; i < count; i++) {
        const a = generateActor(r, { id: newId(s, 'a'), tier: r.range(0.18, 0.42), ageMin: 18, ageMax: 23, region, studioId: null, season: s.season });
        a.potential = clamp(a.potential + r.range(1, 2 + sc.ability), bestSkill(a), 20);
        a.scouted = true;
        a.discovered = true;
        s.actors[a.id] = a;
        found.push(a);
      }
      const gems = seen
        .filter((a) => a.age < 27)
        .sort((x, y) => y.potential - x.potential)
        .slice(0, 3);
      const lines = [...found, ...gems].map((a) => `• ${fullName(a)} (${a.age}) — potential ${Math.round(a.potential)}`);
      pushInbox(s, {
        from: `Scout ${sc.name}`,
        subject: `${REGIONS[region].name}: report`,
        body: `Finished my trip to the ${REGIONS[region].name}. ${seen.length} performers assessed. New discoveries and the best prospects:\n${lines.join('\n')}`,
        kind: 'scout',
      });
    }
    sc.region = null;
    sc.targetActorId = null;
    sc.weeksLeft = 0;
  }
}

function verdictLine(a: Actor): string {
  const gap = a.potential - bestSkill(a);
  if (a.age > 34) return 'What you see is what you get at this stage.';
  if (gap > 5) return 'A future star if developed properly.';
  if (gap > 2) return 'Room to grow with good coaching.';
  return 'Close to their ceiling already.';
}

/** Seeds fresh talent into the free agent pool each season. */
export function replenishFreeAgents(s: GameState, r: Rng, count: number): void {
  for (let i = 0; i < count; i++) {
    const young = r.chance(0.45);
    const a = generateActor(r, {
      id: newId(s, 'a'),
      tier: r.range(0.15, 0.7),
      ageMin: young ? 18 : 25,
      ageMax: young ? 25 : 66,
      region: r.pick(REGION_IDS),
      studioId: null,
      season: s.season,
    });
    s.actors[a.id] = a;
  }
}
