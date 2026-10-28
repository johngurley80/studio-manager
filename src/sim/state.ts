import { WEEKS_PER_SEASON } from './data';
import type { Actor, Film, GameState, InboxMessage, NewsItem, SeasonStats, Studio } from './types';

export const SAVE_VERSION = 1;

export const absWeek = (s: Pick<GameState, 'season' | 'week'>): number => (s.season - 1) * WEEKS_PER_SEASON + s.week;

export const absToSeasonWeek = (abs: number): { season: number; week: number } => ({
  season: Math.floor((abs - 1) / WEEKS_PER_SEASON) + 1,
  week: ((abs - 1) % WEEKS_PER_SEASON) + 1,
});

export function newId(s: GameState, prefix: string): string {
  s.nextId += 1;
  return `${prefix}${s.nextId}`;
}

export function emptySeason(): SeasonStats {
  return { gross: 0, releases: 0, criticsSum: 0, hits: 0, income: 0, expenses: 0, nominations: 0, wins: 0, wipStart: 0 };
}

export function playerStudio(s: GameState): Studio {
  return s.studios.find((st) => st.id === s.playerId)!;
}

export function studioById(s: GameState, id: string | null): Studio | undefined {
  return id ? s.studios.find((st) => st.id === id) : undefined;
}

export function rosterOf(s: GameState, studioId: string): Actor[] {
  return Object.values(s.actors).filter((a) => a.studioId === studioId);
}

export function freeAgents(s: GameState): Actor[] {
  return Object.values(s.actors).filter((a) => a.studioId === null && !a.retired);
}

export function filmsOf(s: GameState, studioId: string): Film[] {
  return Object.values(s.films).filter((f) => f.studioId === studioId);
}

export function earn(st: Studio, amount: number): void {
  st.cash += amount;
  st.season.income += amount;
}

export function spend(st: Studio, amount: number): void {
  st.cash -= amount;
  st.season.expenses += amount;
}

export function pushInbox(s: GameState, msg: Omit<InboxMessage, 'id' | 'abs' | 'read'>): InboxMessage {
  const m: InboxMessage = { ...msg, id: newId(s, 'm'), abs: absWeek(s), read: false };
  s.inbox.unshift(m);
  if (s.inbox.length > 150) s.inbox.length = 150;
  return m;
}

export function pushNews(s: GameState, text: string, kind: NewsItem['kind']): void {
  s.news.unshift({ id: newId(s, 'n'), abs: absWeek(s), text, kind });
  if (s.news.length > 200) s.news.length = 200;
}

export function weeklySalary(a: Actor): number {
  return a.salary / WEEKS_PER_SEASON;
}

export function payroll(s: GameState, studioId: string): number {
  return rosterOf(s, studioId).reduce((sum, a) => sum + a.salary, 0);
}

/** Money sunk into films that have not opened yet (an asset, not a loss). */
export function workInProgress(s: GameState, studioId: string): number {
  let w = 0;
  for (const f of Object.values(s.films)) {
    if (f.studioId === studioId && (f.status === 'production' || f.status === 'post' || f.status === 'scheduled')) w += f.spent;
  }
  return w;
}

/** Accrual profit: cash result adjusted for production spend on unreleased films. */
export function seasonProfit(s: GameState, st: Studio): number {
  return st.season.income - st.season.expenses + workInProgress(s, st.id) - st.season.wipStart;
}

export function debt(s: GameState): number {
  return s.loans.reduce((sum, l) => sum + l.remaining, 0);
}
