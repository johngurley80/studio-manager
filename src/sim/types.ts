export type Genre = 'Drama' | 'Comedy' | 'Action' | 'Thriller' | 'Romance' | 'Horror' | 'SciFi' | 'Family';
export type Skill = 'drama' | 'comedy' | 'action';
export type Difficulty = 'indie' | 'studio' | 'mogul';
export type BudgetTier = 'micro' | 'low' | 'mid' | 'high' | 'tentpole';
export type Role = 'lead' | 'colead' | 'support';
export type TrainingActivity = 'workshop' | 'stunts' | 'improv' | 'rest';
export type RegionId = 'capital' | 'coast' | 'north' | 'schools' | 'clubs' | 'stunt' | 'overseas';
export type DirectorStyle = 'Auteur' | 'Crowd-Pleaser' | 'Spectacle' | "Actor's Director" | 'Journeyman' | 'Provocateur';
export type Strategy =
  | 'player'
  | 'blockbuster'
  | 'prestige'
  | 'horror'
  | 'comedy'
  | 'family'
  | 'indie'
  | 'balanced';

export type Demands = Record<Skill, number>;

export interface FaceGenes {
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  eyeColor: number;
  brows: number;
  nose: number;
  mouth: number;
  jaw: number;
  extra: number;
  bg: number;
}

export interface CareerEntry {
  season: number;
  filmId: string;
  title: string;
  role: Role;
  studioName: string;
  critics: number;
  gross: number;
}

export interface AwardEntry {
  season: number;
  category: string;
  title: string;
  won: boolean;
}

export interface Actor {
  id: string;
  first: string;
  last: string;
  age: number;
  region: RegionId;
  drama: number;
  comedy: number;
  action: number;
  charisma: number;
  starPower: number;
  reliability: number;
  ego: number;
  potential: number;
  morale: number;
  form: number;
  salary: number;
  contractEnd: number;
  topBilling: boolean;
  studioId: string | null;
  genreRep: Record<Genre, number>;
  face: FaceGenes;
  history: CareerEntry[];
  awards: AwardEntry[];
  filmId: string | null;
  injuredWeeks: number;
  lowMoraleWeeks: number;
  idleWeeks: number;
  transferListed: boolean;
  wantsToLeave: boolean;
  scouted: boolean;
  /** Absolute week before which this actor refuses to talk to the player. */
  blockedUntil: number;
  /** True for youngsters found by the player's scouts. */
  discovered: boolean;
  retired: boolean;
}

export interface Director {
  id: string;
  first: string;
  last: string;
  age: number;
  style: DirectorStyle;
  skill: number;
  reliability: number;
  specialties: Genre[];
  fee: number;
  face: FaceGenes;
  filmId: string | null;
  films: number;
  awards: AwardEntry[];
}

export interface Script {
  id: string;
  title: string;
  genre: Genre;
  quality: number;
  price: number;
  writer: string;
  logline: string;
  demands: Demands;
  expiresAbs: number;
}

export interface CastSlot {
  actorId: string;
  role: Role;
}

export type FilmStatus = 'production' | 'post' | 'scheduled' | 'released' | 'finished';

export interface Performance {
  actorId: string;
  role: Role;
  score: number;
}

export interface Film {
  id: string;
  title: string;
  studioId: string;
  genre: Genre;
  tier: BudgetTier;
  budget: number;
  marketing: number;
  scriptQuality: number;
  genreFit: number;
  demands: Demands;
  directorId: string;
  cast: CastSlot[];
  status: FilmStatus;
  greenlitAbs: number;
  productionWeeks: number;
  weeksLeft: number;
  releaseAbs: number | null;
  releaseSeason: number | null;
  hypeMod: number;
  criticsMod: number;
  audienceMod: number;
  chemistryMod: number;
  spent: number;
  log: string[];
  // results
  critics: number | null;
  audience: number | null;
  openingWeekend: number;
  firstWeek: number;
  legs: number;
  gross: number;
  seasonGross: Record<number, number>;
  lastWeekGross: number;
  weeksInRelease: number;
  streaming: number;
  performances: Performance[];
  directorScore: number;
  weekendRank: number;
}

export interface Studio {
  id: string;
  name: string;
  short: string;
  color: string;
  strategy: Strategy;
  isPlayer: boolean;
  cash: number;
  reputation: number;
  lastGreenlitAbs: number;
  season: SeasonStats;
}

export interface SeasonStats {
  gross: number;
  releases: number;
  criticsSum: number;
  hits: number;
  income: number;
  expenses: number;
  nominations: number;
  wins: number;
  /** Production spend carried into the season on unreleased films. */
  wipStart: number;
}

export interface Scout {
  id: string;
  name: string;
  ability: number;
  region: RegionId | null;
  targetActorId: string | null;
  weeksLeft: number;
}

export interface Loan {
  id: string;
  principal: number;
  remaining: number;
  rate: number;
  weeklyPayment: number;
  takenAbs: number;
}

export interface InboxMessage {
  id: string;
  abs: number;
  from: string;
  subject: string;
  body: string;
  read: boolean;
  kind: 'board' | 'agent' | 'press' | 'scout' | 'finance' | 'studio' | 'awards';
  decisionId?: string;
  actorId?: string;
}

export interface NewsItem {
  id: string;
  abs: number;
  text: string;
  kind: 'release' | 'transfer' | 'studio' | 'awards' | 'league' | 'gossip';
}

export interface DecisionOption {
  label: string;
  hint: string;
}

export interface DecisionQuestion {
  prompt: string;
  options: DecisionOption[];
}

export type DecisionKind = 'production' | 'rivalBid' | 'transferRequest' | 'press';

export interface Decision {
  id: string;
  kind: DecisionKind;
  title: string;
  body: string;
  questions: DecisionQuestion[];
  /** Opaque data the resolver needs. */
  data: Record<string, string | number>;
  abs: number;
}

export type ObjectiveKind = 'position' | 'profit' | 'nominations' | 'wins' | 'releases' | 'critics' | 'hit';

export interface Objective {
  kind: ObjectiveKind;
  target: number;
  text: string;
  met?: boolean;
}

export interface BoardState {
  confidence: number;
  warnings: number;
  objectives: Objective[];
}

export interface TickRival {
  filmId: string;
  title: string;
  studioName: string;
  color: string;
  value: number;
}

export interface ReleaseTick {
  label: string;
  player: number;
  rivals: TickRival[];
  headline: string | null;
}

export interface ReleaseReport {
  filmId: string;
  title: string;
  genre: Genre;
  weekend: number;
  critics: number;
  audience: number;
  rank: number;
  openers: number;
  ticks: ReleaseTick[];
  verdict: string;
  projectedTotal: number;
}

export interface Nominee {
  filmId: string;
  filmTitle: string;
  studioId: string;
  studioName: string;
  personId: string | null;
  personName: string | null;
  score: number;
}

export interface AwardCategory {
  name: string;
  nominees: Nominee[];
  winnerIndex: number;
}

export interface Ceremony {
  season: number;
  name: string;
  categories: AwardCategory[];
}

export interface StandingRow {
  studioId: string;
  name: string;
  color: string;
  gross: number;
  releases: number;
  avgCritics: number;
  hits: number;
  reputation: number;
  profit: number;
}

export interface SeasonRecord {
  season: number;
  position: number;
  gross: number;
  profit: number;
  releases: number;
  avgCritics: number;
  nominations: number;
  wins: number;
  champion: string;
  objectives: Objective[];
  verdict: 'delighted' | 'satisfied' | 'warning' | 'sacked';
  table: StandingRow[];
}

export interface Training {
  schedule: TrainingActivity[];
  resting: string[];
}

export interface Staff {
  analystLevel: number;
}

export type Phase = 'playing' | 'awards' | 'review' | 'gameover';

export interface GameOver {
  reason: 'bankrupt' | 'sacked';
  abs: number;
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  nextId: number;
  difficulty: Difficulty;
  season: number;
  week: number;
  phase: Phase;
  playerId: string;
  studios: Studio[];
  actors: Record<string, Actor>;
  directors: Record<string, Director>;
  films: Record<string, Film>;
  scripts: Script[];
  scouts: Scout[];
  staff: Staff;
  training: Training;
  loans: Loan[];
  inbox: InboxMessage[];
  news: NewsItem[];
  decisions: Decision[];
  board: BoardState;
  cashHistory: number[];
  negativeWeeks: number;
  reports: ReleaseReport[];
  ceremony: Ceremony | null;
  history: SeasonRecord[];
  gameOver: GameOver | null;
}
