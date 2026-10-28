import { GENRE_LABEL, absToSeasonWeek, fullName, specialty, type Actor, type Genre, type GameState } from '../sim';

export function weekLabel(abs: number): string {
  const { season, week } = absToSeasonWeek(abs);
  return `S${season} · W${week}`;
}

export function genreLabel(g: Genre): string {
  return GENRE_LABEL[g];
}

export const SKILL_LABEL = { drama: 'Drama', comedy: 'Comedy', action: 'Action' } as const;

export function specialtyLabel(a: Actor): string {
  return SKILL_LABEL[specialty(a)];
}

export type ActorStatus = 'Filming' | 'Injured' | 'Resting' | 'Listed' | 'Unhappy' | 'Available';

export function actorStatus(s: GameState, a: Actor): ActorStatus {
  if (a.filmId) return 'Filming';
  if (a.injuredWeeks > 0) return 'Injured';
  if (a.transferListed) return 'Listed';
  if (a.wantsToLeave) return 'Unhappy';
  if (s.training.resting.includes(a.id)) return 'Resting';
  return 'Available';
}

export const STATUS_COLOR: Record<ActorStatus, string> = {
  Filming: '#3fa7a0',
  Injured: '#e0563f',
  Resting: '#9a8669',
  Listed: '#e0682b',
  Unhappy: '#e0563f',
  Available: '#8bc172',
};

export function potentialText(a: Actor, playerId: string): string {
  if (!a.scouted && a.studioId !== playerId) return '?';
  if (!a.scouted) return '?';
  return String(Math.round(a.potential));
}

export function name(a: { first: string; last: string } | undefined | null): string {
  return a ? fullName(a) : 'Unknown';
}

export function seasonPhase(week: number): string {
  if (week >= 47) return 'Holiday season';
  if (week >= 22 && week <= 34) return 'Summer season';
  if (week <= 8) return 'Winter lull';
  if (week >= 35 && week <= 40) return 'Autumn slump';
  return 'Regular season';
}
