import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GameState } from '../sim';
import { AUTOSAVE, loadSettings, saveGame, saveSettings, type Settings } from './storage';

export type View = 'office' | 'inbox' | 'squad' | 'talent' | 'training' | 'films' | 'chart' | 'finance' | 'board';

interface Ctx {
  game: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  replace: (s: GameState | null) => void;
  view: View;
  go: (v: View) => void;
  actorId: string | null;
  openActor: (id: string | null) => void;
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({
  game,
  onReplace,
  children,
}: {
  game: GameState;
  onReplace: (s: GameState | null) => void;
  children: ReactNode;
}) {
  const [view, setView] = useState<View>('office');
  const [actorId, setActorId] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const [toastMsg, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const update = useCallback(
    (fn: (s: GameState) => GameState) => {
      onReplace(fn(game));
    },
    [game, onReplace],
  );

  // Autosave every week (and on phase changes).
  useEffect(() => {
    const res = saveGame(AUTOSAVE, game);
    if (!res.ok && res.error) toast(res.error);
  }, [game.season, game.week, game.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const go = useCallback((v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ game, update, replace: onReplace, view, go, actorId, openActor: setActorId, settings, setSettings, toast, toastMsg }),
    [game, update, onReplace, view, go, actorId, settings, setSettings, toast, toastMsg],
  );
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Ctx {
  const c = useContext(GameCtx);
  if (!c) throw new Error('useGame outside GameProvider');
  return c;
}
