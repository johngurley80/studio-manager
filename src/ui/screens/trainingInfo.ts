import type { TrainingActivity } from '../../sim';

export const DAYS_LABEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const TRAINING_INFO: Record<TrainingActivity, { label: string; icon: string; color: string; blurb: string }> = {
  workshop: { label: 'Workshop', icon: '\u{1F3AD}', color: '#f2c14e', blurb: 'Acting workshops build Drama (and a little Charisma).' },
  stunts: { label: 'Stunts', icon: '\u{1F94A}', color: '#e0682b', blurb: 'Stunt training builds Action. Small injury risk.' },
  improv: { label: 'Improv', icon: '\u{1F3A4}', color: '#3fa7a0', blurb: 'Comedy improv builds Comedy.' },
  rest: { label: 'Rest', icon: '\u{1F319}', color: '#9a8669', blurb: 'Lifts morale. Too much rest and form drops.' },
};
