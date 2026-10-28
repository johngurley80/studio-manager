import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import type { GameState } from '../sim';
import { SAVE_VERSION } from '../sim';

const PREFIX = 'backlot.';
export const AUTOSAVE = 'auto';
export const SLOTS = ['1', '2', '3'] as const;
export type SlotId = typeof AUTOSAVE | (typeof SLOTS)[number];

export interface SaveMeta {
  slot: SlotId;
  studio: string;
  season: number;
  week: number;
  difficulty: string;
  savedAt: number;
}

export interface Settings {
  tutorialDone: boolean;
  fastReleases: boolean;
}

const DEFAULT_SETTINGS: Settings = { tutorialDone: false, fastReleases: false };

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Floats are rounded so saves stay small; integers (like the RNG state) are untouched. */
function serialize(state: GameState): string {
  return JSON.stringify(state, (_k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v));
}

export function saveGame(slot: SlotId, state: GameState): { ok: boolean; error?: string } {
  const ls = storage();
  if (!ls) return { ok: false, error: 'Browser storage is unavailable.' };
  const player = state.studios.find((s) => s.isPlayer);
  const meta: SaveMeta = {
    slot,
    studio: player?.name ?? 'Studio',
    season: state.season,
    week: state.week,
    difficulty: state.difficulty,
    savedAt: Date.now(),
  };
  try {
    ls.setItem(`${PREFIX}save.${slot}`, compressToUTF16(serialize(state)));
    ls.setItem(`${PREFIX}meta.${slot}`, JSON.stringify(meta));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === 'QuotaExceededError' ? 'Storage is full. Delete a save slot.' : 'Could not save the game.' };
  }
}

export function loadGame(slot: SlotId): GameState | null {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(`${PREFIX}save.${slot}`);
    if (!raw) return null;
    const json = decompressFromUTF16(raw);
    if (!json) return null;
    const state = JSON.parse(json) as GameState;
    if (state.version !== SAVE_VERSION || !Array.isArray(state.studios)) return null;
    return state;
  } catch {
    return null;
  }
}

export function deleteSave(slot: SlotId): void {
  const ls = storage();
  try {
    ls?.removeItem(`${PREFIX}save.${slot}`);
    ls?.removeItem(`${PREFIX}meta.${slot}`);
  } catch {
    /* ignore */
  }
}

export function listSaves(): Partial<Record<SlotId, SaveMeta>> {
  const ls = storage();
  const out: Partial<Record<SlotId, SaveMeta>> = {};
  if (!ls) return out;
  for (const slot of [AUTOSAVE, ...SLOTS] as SlotId[]) {
    try {
      const raw = ls.getItem(`${PREFIX}meta.${slot}`);
      if (raw) out[slot] = JSON.parse(raw) as SaveMeta;
    } catch {
      /* ignore corrupt meta */
    }
  }
  return out;
}

export function loadSettings(): Settings {
  const ls = storage();
  try {
    const raw = ls?.getItem(`${PREFIX}settings`);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    storage()?.setItem(`${PREFIX}settings`, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
