import { DIFFICULTY } from './data';
import { fullName } from './people';
import type { Rng } from './rng';
import { absWeek, newId, playerStudio, pushInbox, seasonProfit } from './state';
import type { Decision, Film, GameState, Objective, ObjectiveKind, StandingRow } from './types';
import { clamp, fmtMoney, ordinal } from './util';

export function standings(s: GameState): StandingRow[] {
  return s.studios
    .map((st) => ({
      studioId: st.id,
      name: st.name,
      color: st.color,
      gross: st.season.gross,
      releases: st.season.releases,
      avgCritics: st.season.releases ? st.season.criticsSum / st.season.releases : 0,
      hits: st.season.hits,
      reputation: st.reputation,
      profit: seasonProfit(s, st),
    }))
    .sort((a, b) => b.gross - a.gross || b.avgCritics - a.avgCritics);
}

export function playerPosition(s: GameState): number {
  return standings(s).findIndex((r) => r.studioId === s.playerId) + 1;
}

function objectiveText(kind: ObjectiveKind, target: number): string {
  switch (kind) {
    case 'position':
      return `Finish ${ordinal(target)} or higher on the box office chart`;
    case 'profit':
      return target < 0 ? `Keep any season loss under ${fmtMoney(-target, 0)}` : target === 0 ? 'Avoid a season loss' : `Make a season profit of at least ${fmtMoney(target, 0)}`;
    case 'nominations':
      return `Earn at least ${target} Lantern nomination${target > 1 ? 's' : ''}`;
    case 'wins':
      return `Win at least ${target} Lantern${target > 1 ? 's' : ''}`;
    case 'releases':
      return `Release at least ${target} films`;
    case 'critics':
      return `Average a critics score of ${target}+`;
    case 'hit':
      return `Have a film gross ${fmtMoney(target, 0)} or more`;
  }
}

export function makeObjectives(s: GameState, r: Rng): Objective[] {
  const st = playerStudio(s);
  const exp = DIFFICULTY[s.difficulty].expectation;
  const rep = st.reputation;
  const repRank = 1 + s.studios.filter((x) => x.id !== st.id && x.reputation > rep).length;
  const lastPos = s.history.length ? s.history[s.history.length - 1].position : 1;
  // The board expects you to finish where your reputation ranks you, but never asks for more than last season.
  const pos = clamp(Math.max(repRank - exp, lastPos), 1, s.studios.length - 1);
  const list: Objective[] = [{ kind: 'position', target: pos, text: '' }];
  const pool: [ObjectiveKind, number][] = [
    ['profit', rep > 62 ? 15 : rep > 50 ? 0 : -40],
    ['releases', clamp(3 + exp + Math.floor(rep / 40), 2, 6)],
    [rep > 58 ? 'wins' : 'nominations', rep > 58 ? 1 : clamp(1 + exp + Math.floor((rep - 40) / 15), 1, 4)],
    ['critics', clamp(Math.round(54 + exp * 3 + (rep - 40) / 4), 50, 72)],
    ['hit', rep > 65 ? 150 : rep > 50 ? 100 : 75],
  ];
  for (const [kind, target] of r.shuffle(pool).slice(0, 2)) list.push({ kind, target, text: '' });
  for (const o of list) o.text = objectiveText(o.kind, o.target);
  return list;
}

export function objectiveProgress(s: GameState, o: Objective): { value: number; met: boolean } {
  const st = playerStudio(s);
  switch (o.kind) {
    case 'position': {
      const p = playerPosition(s);
      return { value: p, met: p <= o.target };
    }
    case 'profit': {
      const p = seasonProfit(s, st);
      return { value: p, met: p >= o.target };
    }
    case 'nominations':
      return { value: st.season.nominations, met: st.season.nominations >= o.target };
    case 'wins':
      return { value: st.season.wins, met: st.season.wins >= o.target };
    case 'releases':
      return { value: st.season.releases, met: st.season.releases >= o.target };
    case 'critics': {
      const c = st.season.releases ? st.season.criticsSum / st.season.releases : 0;
      return { value: Math.round(c), met: c >= o.target };
    }
    case 'hit': {
      const best = Math.max(
        0,
        ...Object.values(s.films)
          .filter((f) => f.studioId === st.id && f.releaseSeason === s.season)
          .map((f) => f.gross),
      );
      return { value: best, met: best >= o.target };
    }
  }
}

/* --------------------------------- press ---------------------------------- */

interface PressQ {
  prompt: (ctx: PressCtx) => string;
  options: { label: string; hint: string; hype?: number; rep?: number; morale?: number; squad?: number }[];
}

interface PressCtx {
  studio: string;
  film: Film | null;
  lead: string;
  rival: string;
}

const RELEASE_QS: PressQ[] = [
  {
    prompt: (c) => `Is "${c.film?.title}" going to win the weekend?`,
    options: [
      { label: 'Absolutely. Book your tickets now.', hint: 'Hype +5, reputation -1 if it flops.', hype: 5, rep: -1 },
      { label: 'We let the audience decide.', hint: 'Reputation +1.', rep: 1 },
      { label: 'Ask me on Monday.', hint: 'Hype -2.', hype: -2 },
    ],
  },
  {
    prompt: (c) => `Rumour says ${c.lead} was difficult on set. True?`,
    options: [
      { label: 'Total nonsense. A consummate pro.', hint: 'Lead morale +8.', morale: 8 },
      { label: 'Creative tension makes great cinema.', hint: 'Hype +4, lead morale -6.', hype: 4, morale: -6 },
      { label: 'No comment.', hint: 'Hype +1.', hype: 1 },
    ],
  },
  {
    prompt: (c) => `${c.rival} open a film the same month. Worried?`,
    options: [
      { label: 'They should be worried about us.', hint: 'Hype +3, reputation -1.', hype: 3, rep: -1 },
      { label: 'There is room for good films.', hint: 'Reputation +2.', rep: 2 },
      { label: 'Who?', hint: 'Hype +2, squad morale +2.', hype: 2, squad: 2 },
    ],
  },
  {
    prompt: () => 'Is it true the budget ran over?',
    options: [
      { label: 'Every cent is on screen.', hint: 'Hype +3.', hype: 3 },
      { label: 'We were careful with money.', hint: 'Reputation +1.', rep: 1 },
      { label: "That's between me and the board.", hint: 'Reputation -1, hype +1.', rep: -1, hype: 1 },
    ],
  },
  {
    prompt: (c) => `Is ${c.lead} the biggest star in town?`,
    options: [
      { label: 'Without question.', hint: 'Lead morale +6, hype +2.', morale: 6, hype: 2 },
      { label: 'Our whole cast are stars.', hint: 'Squad morale +3.', squad: 3 },
      { label: 'Stars come and go; studios endure.', hint: 'Lead morale -8, reputation +1.', morale: -8, rep: 1 },
    ],
  },
];

const SEASON_QS: PressQ[] = [
  {
    prompt: () => 'What are your ambitions for the new season?',
    options: [
      { label: 'Top of the chart. Nothing less.', hint: 'Squad morale +4, reputation -2 if we miss.', squad: 4 },
      { label: 'Steady progress, good films.', hint: 'Reputation +1.', rep: 1 },
      { label: 'We are quietly confident.', hint: 'No effect.' },
    ],
  },
  {
    prompt: (c) => `${c.rival} spent big this summer. Can you compete?`,
    options: [
      { label: 'Money does not make movies. Talent does.', hint: 'Squad morale +3.', squad: 3 },
      { label: 'We have a few surprises up our sleeve.', hint: 'Reputation +1.', rep: 1 },
      { label: 'Good luck to them.', hint: 'No effect.' },
    ],
  },
  {
    prompt: () => 'Any truth in the rumours your stars are unhappy?',
    options: [
      { label: 'This is the happiest lot in town.', hint: 'Squad morale +2.', squad: 2 },
      { label: 'Every family has arguments.', hint: 'Reputation +1.', rep: 1 },
      { label: 'Stop listening to agents.', hint: 'Squad morale -3, reputation +1.', squad: -3, rep: 1 },
    ],
  },
  {
    prompt: () => 'Will the board still back you if this season goes wrong?',
    options: [
      { label: 'The board and I are united.', hint: 'Board confidence +3.', rep: 0 },
      { label: 'Judge me in May.', hint: 'Reputation +1.', rep: 1 },
      { label: 'Next question.', hint: 'Reputation -1.', rep: -1 },
    ],
  },
];

export function pressConference(s: GameState, r: Rng, film: Film | null): void {
  const rivals = s.studios.filter((x) => !x.isPlayer);
  const leadSlot = film?.cast.find((c) => c.role === 'lead');
  const lead = leadSlot ? s.actors[leadSlot.actorId] : null;
  const ctx: PressCtx = {
    studio: playerStudio(s).name,
    film,
    lead: lead ? fullName(lead) : 'your lead',
    rival: r.pick(rivals).name,
  };
  const pool = film ? RELEASE_QS : SEASON_QS;
  const picked = r.shuffle(pool.map((_, i) => i)).slice(0, 3);
  const d: Decision = {
    id: newId(s, 'd'),
    kind: 'press',
    title: film ? `Press junket: "${film.title}"` : `Season ${s.season} press conference`,
    body: film ? 'The press want a word before the opening weekend.' : 'The trade press are gathered for your season preview.',
    questions: picked.map((i) => ({ prompt: pool[i].prompt(ctx), options: pool[i].options.map((o) => ({ label: o.label, hint: o.hint })) })),
    data: { filmId: film?.id ?? '', pool: film ? 'release' : 'season', q: picked.join(','), leadId: lead?.id ?? '' },
    abs: absWeek(s),
  };
  s.decisions.push(d);
  pushInbox(s, { from: 'Publicity', subject: d.title, body: d.body, kind: 'press', decisionId: d.id });
}

export function resolvePress(s: GameState, d: Decision, answers: number[]): void {
  const pool = d.data.pool === 'release' ? RELEASE_QS : SEASON_QS;
  const idx = String(d.data.q).split(',').map(Number);
  const st = playerStudio(s);
  const film = d.data.filmId ? s.films[d.data.filmId as string] : null;
  const lead = d.data.leadId ? s.actors[d.data.leadId as string] : null;
  idx.forEach((qi, k) => {
    const o = pool[qi]?.options[answers[k] ?? 0];
    if (!o) return;
    if (o.hype && film) film.hypeMod += o.hype;
    if (o.rep) st.reputation = clamp(st.reputation + o.rep * 0.4, 0, 100);
    if (o.morale && lead) lead.morale = clamp(lead.morale + o.morale, 0, 100);
    if (o.squad) for (const a of Object.values(s.actors)) if (a.studioId === st.id) a.morale = clamp(a.morale + o.squad, 0, 100);
    if (pool === SEASON_QS && qi === 3 && answers[k] === 0) s.board.confidence = clamp(s.board.confidence + 3, 0, 100);
  });
}
