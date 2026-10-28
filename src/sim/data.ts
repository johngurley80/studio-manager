import type { BudgetTier, Demands, Difficulty, DirectorStyle, Genre, RegionId, Skill, Strategy } from './types';

export const WEEKS_PER_SEASON = 52;
export const SQUAD_MAX = 30;
export const SQUAD_MIN = 18;
export const MAX_PRODUCTIONS = 3;
export const SUPPORT_SLOTS = 4;

export const GENRES: Genre[] = ['Drama', 'Comedy', 'Action', 'Thriller', 'Romance', 'Horror', 'SciFi', 'Family'];
export const SKILLS: Skill[] = ['drama', 'comedy', 'action'];

export const GENRE_LABEL: Record<Genre, string> = {
  Drama: 'Drama',
  Comedy: 'Comedy',
  Action: 'Action',
  Thriller: 'Thriller',
  Romance: 'Romance',
  Horror: 'Horror',
  SciFi: 'Sci-Fi',
  Family: 'Family',
};

/** What each genre asks of its performers (weights sum to 1). */
export const GENRE_DEMANDS: Record<Genre, Demands> = {
  Drama: { drama: 0.85, comedy: 0.1, action: 0.05 },
  Comedy: { drama: 0.15, comedy: 0.8, action: 0.05 },
  Action: { drama: 0.15, comedy: 0.1, action: 0.75 },
  Thriller: { drama: 0.55, comedy: 0, action: 0.45 },
  Romance: { drama: 0.6, comedy: 0.35, action: 0.05 },
  Horror: { drama: 0.5, comedy: 0.1, action: 0.4 },
  SciFi: { drama: 0.4, comedy: 0.05, action: 0.55 },
  Family: { drama: 0.25, comedy: 0.6, action: 0.15 },
};

/** Box office pull of each genre with general audiences. */
export const GENRE_APPEAL: Record<Genre, number> = {
  Drama: 0.8,
  Comedy: 1.0,
  Action: 1.08,
  Thriller: 0.95,
  Romance: 0.88,
  Horror: 1.0,
  SciFi: 1.06,
  Family: 1.05,
};

/** Genres that share an audience, for script fit and release clashes. */
export const GENRE_FAMILY: Record<Genre, Genre[]> = {
  Drama: ['Romance', 'Thriller'],
  Comedy: ['Family', 'Romance'],
  Action: ['SciFi', 'Thriller'],
  Thriller: ['Horror', 'Action', 'Drama'],
  Romance: ['Drama', 'Comedy'],
  Horror: ['Thriller'],
  SciFi: ['Action', 'Family'],
  Family: ['Comedy', 'SciFi'],
};

export interface TierInfo {
  label: string;
  budget: number;
  weeks: [number, number];
  production: number;
  size: number;
}

export const TIERS: Record<BudgetTier, TierInfo> = {
  micro: { label: 'Micro', budget: 4, weeks: [6, 7], production: 35, size: 0.3 },
  low: { label: 'Low', budget: 12, weeks: [7, 9], production: 50, size: 0.5 },
  mid: { label: 'Mid', budget: 35, weeks: [9, 11], production: 65, size: 0.8 },
  high: { label: 'High', budget: 80, weeks: [11, 14], production: 80, size: 1.15 },
  tentpole: { label: 'Tentpole', budget: 160, weeks: [13, 16], production: 92, size: 1.6 },
};
export const TIER_ORDER: BudgetTier[] = ['micro', 'low', 'mid', 'high', 'tentpole'];

export interface MarketingPlan {
  id: string;
  label: string;
  ratio: number;
}
export const MARKETING: MarketingPlan[] = [
  { id: 'minimal', label: 'Minimal', ratio: 0.1 },
  { id: 'standard', label: 'Standard', ratio: 0.35 },
  { id: 'heavy', label: 'Heavy', ratio: 0.6 },
  { id: 'saturation', label: 'Saturation', ratio: 1.0 },
];

export interface RegionInfo {
  name: string;
  blurb: string;
  bias: Partial<Record<Skill | 'charisma', number>>;
}
export const REGIONS: Record<RegionId, RegionInfo> = {
  capital: { name: 'Capital Stage Circuit', blurb: 'Seasoned theatre pros, few surprises.', bias: { drama: 2, charisma: 1 } },
  coast: { name: 'Sunward Coast', blurb: 'Photogenic hopefuls with screen charisma.', bias: { charisma: 3 } },
  north: { name: 'Northern Repertory', blurb: 'Gritty rep-company actors, very reliable.', bias: { drama: 2 } },
  schools: { name: 'Drama Conservatories', blurb: 'Raw, young and full of potential.', bias: { drama: 1, comedy: 1 } },
  clubs: { name: 'Late-Night Comedy Clubs', blurb: 'Quick-witted stand-ups and improvisers.', bias: { comedy: 3 } },
  stunt: { name: 'Stunt & Action Guild', blurb: 'Fearless performers who do their own stunts.', bias: { action: 3 } },
  overseas: { name: 'Overseas Cinema', blurb: 'Acclaimed art-house talent, pricier to lure.', bias: { drama: 2, charisma: 1 } },
};
export const REGION_IDS = Object.keys(REGIONS) as RegionId[];

export interface StyleInfo {
  blurb: string;
  critics: number;
  audience: number;
  acting: number;
  overrun: number;
  hype: number;
  variance: number;
  genres?: Genre[];
}
export const STYLES: Record<DirectorStyle, StyleInfo> = {
  Auteur: { blurb: 'Critics adore them; audiences can find them chilly.', critics: 6, audience: -3, acting: 0, overrun: 0.4, hype: 2, variance: 1.2 },
  'Crowd-Pleaser': { blurb: 'Knows what audiences want and delivers it.', critics: -2, audience: 6, acting: 0, overrun: 0, hype: 1, variance: 0.9 },
  Spectacle: { blurb: 'Big set pieces. Shines in action and sci-fi.', critics: 0, audience: 3, acting: -1, overrun: 0.5, hype: 3, variance: 1, genres: ['Action', 'SciFi', 'Family'] },
  "Actor's Director": { blurb: 'Draws career-best performances and better chemistry.', critics: 2, audience: 1, acting: 6, overrun: 0.1, hype: 0, variance: 0.9 },
  Journeyman: { blurb: 'On time and on budget. Rarely a surprise.', critics: 0, audience: 0, acting: 0, overrun: -0.5, hype: 0, variance: 0.7 },
  Provocateur: { blurb: 'Generates headlines. Brilliant or a disaster.', critics: 2, audience: 0, acting: 1, overrun: 0.3, hype: 6, variance: 1.6 },
};
export const STYLE_IDS = Object.keys(STYLES) as DirectorStyle[];

export interface StrategyInfo {
  label: string;
  blurb: string;
  tiers: Partial<Record<BudgetTier, number>>;
  genres: Partial<Record<Genre, number>>;
  marketing: number;
  concurrent: number;
  gap: number;
  scriptBias: number;
  cash: number;
  rep: number;
  rosterTier: number;
  skillBias: Partial<Record<Skill, number>>;
}

export const STRATEGIES: Record<Exclude<Strategy, 'player'>, StrategyInfo> = {
  blockbuster: {
    label: 'Blockbuster factory',
    blurb: 'Tentpoles and spectacle, marketing everywhere.',
    tiers: { high: 2, tentpole: 3 },
    genres: { Action: 4, SciFi: 3, Family: 1 },
    marketing: 0.6,
    concurrent: 2,
    gap: 8,
    scriptBias: -5,
    cash: 340,
    rep: 66,
    rosterTier: 0.62,
    skillBias: { action: 3 },
  },
  prestige: {
    label: 'Prestige house',
    blurb: 'Serious dramas built for awards season.',
    tiers: { low: 1, mid: 3, high: 1 },
    genres: { Drama: 5, Thriller: 2, Romance: 2 },
    marketing: 0.3,
    concurrent: 3,
    gap: 6,
    scriptBias: 12,
    cash: 180,
    rep: 62,
    rosterTier: 0.58,
    skillBias: { drama: 3 },
  },
  horror: {
    label: 'Scream merchants',
    blurb: 'Cheap horror, released often.',
    tiers: { micro: 3, low: 2 },
    genres: { Horror: 6, Thriller: 2 },
    marketing: 0.5,
    concurrent: 3,
    gap: 4,
    scriptBias: -6,
    cash: 70,
    rep: 38,
    rosterTier: 0.3,
    skillBias: { drama: 1, action: 1 },
  },
  comedy: {
    label: 'Laugh track',
    blurb: 'Mid-budget comedies and rom-coms.',
    tiers: { low: 2, mid: 2 },
    genres: { Comedy: 5, Romance: 2, Family: 1 },
    marketing: 0.4,
    concurrent: 3,
    gap: 5,
    scriptBias: 0,
    cash: 150,
    rep: 50,
    rosterTier: 0.45,
    skillBias: { comedy: 3 },
  },
  family: {
    label: 'Family entertainment',
    blurb: 'Four-quadrant crowd-pleasers.',
    tiers: { mid: 2, high: 2 },
    genres: { Family: 5, Comedy: 2, SciFi: 1 },
    marketing: 0.5,
    concurrent: 3,
    gap: 7,
    scriptBias: 2,
    cash: 260,
    rep: 58,
    rosterTier: 0.52,
    skillBias: { comedy: 2 },
  },
  indie: {
    label: 'Art-house indie',
    blurb: 'Tiny budgets, big ideas.',
    tiers: { micro: 3, low: 2 },
    genres: { Drama: 3, Romance: 2, Comedy: 1, Thriller: 1 },
    marketing: 0.2,
    concurrent: 3,
    gap: 4,
    scriptBias: 8,
    cash: 45,
    rep: 40,
    rosterTier: 0.36,
    skillBias: { drama: 2 },
  },
  balanced: {
    label: 'Old-school major',
    blurb: 'A bit of everything, mid to high budgets.',
    tiers: { low: 1, mid: 3, high: 2 },
    genres: { Drama: 1, Comedy: 1, Action: 1, Thriller: 1, Romance: 1, SciFi: 1, Family: 1 },
    marketing: 0.4,
    concurrent: 3,
    gap: 5,
    scriptBias: 2,
    cash: 240,
    rep: 55,
    rosterTier: 0.5,
    skillBias: {},
  },
};
export const RIVAL_STRATEGIES = Object.keys(STRATEGIES) as Exclude<Strategy, 'player'>[];

export const STUDIO_COLORS = ['#e2574c', '#4fa3c7', '#8bc172', '#c78bd9', '#e6a23c', '#5ccfb4', '#d97aa0', '#9aa3ff'];
export const PLAYER_COLOR = '#f2c14e';

export interface DifficultyInfo {
  label: string;
  blurb: string;
  cash: number;
  rep: number;
  squadTier: number;
  grant: number;
  rivalCash: number;
  expectation: number;
}
export const DIFFICULTY: Record<Difficulty, DifficultyInfo> = {
  indie: { label: 'Indie', blurb: 'Deep pockets and a patient board.', cash: 150, rep: 48, squadTier: 0.5, grant: 45, rivalCash: 0.85, expectation: -1 },
  studio: { label: 'Studio', blurb: 'The intended experience.', cash: 100, rep: 44, squadTier: 0.44, grant: 30, rivalCash: 1, expectation: 0 },
  mogul: { label: 'Mogul', blurb: 'Thin margins, ruthless rivals, a demanding board.', cash: 65, rep: 38, squadTier: 0.38, grant: 18, rivalCash: 1.2, expectation: 1 },
};

/** Weekly cinema attendance multiplier by week of the season. */
export function seasonality(week: number): number {
  if (week >= 47) return 1.25;
  if (week >= 22 && week <= 34) return 1.2;
  if (week <= 8) return 0.85;
  if (week >= 35 && week <= 40) return 0.92;
  return 1;
}

export const OVERHEAD_PER_WEEK = 0.25;
export const SCOUT_SALARY = 0.6;
export const MAX_SCOUTS = 4;
export const ANALYST_SALARY = [0, 0, 0.4, 0.8, 1.3, 2];
export const ANALYST_UPGRADE = [0, 0, 2, 3.5, 5, 7];
