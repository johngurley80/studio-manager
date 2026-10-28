import { useCallback, useEffect, useState } from 'react';
import { DIFFICULTY, advanceWeek, newGame, playerPosition, playerStudio, type Difficulty, type GameState } from './sim';
import { GameProvider, useGame, type View } from './state/GameContext';
import { AUTOSAVE, SLOTS, deleteSave, listSaves, loadGame, saveGame, type SlotId } from './state/storage';
import { ordinal } from './sim';
import { ActorProfile } from './ui/screens/ActorProfile';
import { AwardsCeremony } from './ui/screens/Awards';
import { BoardScreen } from './ui/screens/Board';
import { ChartScreen } from './ui/screens/Chart';
import { DecisionModal } from './ui/screens/Decision';
import { FilmsScreen } from './ui/screens/Films';
import { FinanceScreen } from './ui/screens/Finance';
import { GameOverScreen } from './ui/screens/GameOver';
import { InboxScreen } from './ui/screens/Inbox';
import { OfficeScreen } from './ui/screens/Office';
import { ReleaseDay } from './ui/screens/ReleaseDay';
import { SeasonReview } from './ui/screens/SeasonReview';
import { SquadScreen } from './ui/screens/Squad';
import { TalentScreen } from './ui/screens/Talent';
import { TrainingScreen } from './ui/screens/Training';
import { Tutorial } from './ui/screens/Tutorial';
import { Icon, Logo, Modal, Money, Segmented } from './ui/kit';

const NAV: { id: View; label: string; key: string }[] = [
  { id: 'office', label: 'Office', key: '1' },
  { id: 'inbox', label: 'Inbox', key: '2' },
  { id: 'squad', label: 'Squad', key: '3' },
  { id: 'talent', label: 'Talent', key: '4' },
  { id: 'training', label: 'Training', key: '5' },
  { id: 'films', label: 'Films', key: '6' },
  { id: 'chart', label: 'Chart', key: '7' },
  { id: 'finance', label: 'Finance', key: '8' },
  { id: 'board', label: 'Board', key: '9' },
];
const MOBILE_NAV: View[] = ['office', 'squad', 'films', 'chart'];

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const replace = useCallback((s: GameState | null) => setGame(s), []);
  if (!game) return <TitleScreen onStart={setGame} />;
  return (
    <GameProvider game={game} onReplace={replace}>
      <Shell />
    </GameProvider>
  );
}

/* ------------------------------- title screen ------------------------------ */

function TitleScreen({ onStart }: { onStart: (s: GameState) => void }) {
  const [saves, setSaves] = useState(() => listSaves());
  const [name, setName] = useState('Sable Street Pictures');
  const [difficulty, setDifficulty] = useState<Difficulty>('studio');
  const [seed, setSeed] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = (slot: SlotId) => {
    const g = loadGame(slot);
    if (g) onStart(g);
    else setError('That save could not be loaded.');
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 py-6 sm:py-10">
      <div className="flex flex-col items-center text-center">
        <TitleMarquee />
        <p className="mt-4 max-w-xl text-cream-dim">
          You run a film studio. Your actors are the squad, every film is a match, the box office chart is the league and awards season is the cup.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr]">
        <section className="panel p-4 sm:p-5">
          <h2 className="h-poster text-lg text-gold">New career</h2>
          <label className="label mt-4 block" htmlFor="studio-name">
            Studio name
          </label>
          <input id="studio-name" className="input mt-1" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
          <div className="label mt-4">Difficulty</div>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
                className={`min-h-[44px] rounded-lg border p-3 text-left transition-colors ${difficulty === d ? 'border-gold bg-gold/10' : 'border-line bg-ink hover:border-gold/50'}`}
              >
                <div className="h-poster text-cream">{DIFFICULTY[d].label}</div>
                <div className="mt-1 text-xs text-cream-mute">{DIFFICULTY[d].blurb}</div>
                <div className="mt-2 font-cond text-sm text-gold">${DIFFICULTY[d].cash}M to start</div>
              </button>
            ))}
          </div>
          <label className="label mt-4 block" htmlFor="seed">
            World seed (optional, for replays)
          </label>
          <input id="seed" className="input mt-1" placeholder="random" value={seed} onChange={(e) => setSeed(e.target.value)} />
          <button className="btn-gold mt-5 w-full text-base" onClick={() => onStart(newGame({ studioName: name, difficulty, seed: seed.trim() || undefined }))}>
            Open the studio gates
          </button>
        </section>
        <section className="panel p-4 sm:p-5">
          <h2 className="h-poster text-lg text-gold">Continue</h2>
          <div className="mt-3 space-y-2">
            {([AUTOSAVE, ...SLOTS] as SlotId[]).map((slot) => {
              const m = saves[slot];
              return (
                <div key={slot} className="flex items-center gap-2 rounded-lg border border-line bg-ink p-2 pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="label">{slot === AUTOSAVE ? 'Autosave' : `Slot ${slot}`}</div>
                    <div className="truncate text-sm">{m ? `${m.studio} · S${m.season} W${m.week} · ${m.difficulty}` : 'Empty'}</div>
                  </div>
                  {m && (
                    <>
                      <button className="btn-ghost !px-3" onClick={() => load(slot)}>
                        Load
                      </button>
                      <button
                        aria-label={`Delete ${slot} save`}
                        className="btn-ghost !px-3 text-rouge-soft"
                        onClick={() => {
                          deleteSave(slot);
                          setSaves(listSaves());
                        }}
                      >
                        &times;
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {error && <p className="mt-3 text-sm text-rouge-soft">{error}</p>}
          <div className="mt-6 rounded-lg border border-line bg-ink p-3 text-sm text-cream-dim">
            <div className="label mb-1">How it works</div>
            One turn is one week; 52 weeks make a season. Greenlight films, cast your contract players, pick release dates and fight seven rival
            studios for the top of the chart. Keep the board happy and the bank off your back.
          </div>
        </section>
      </div>
      <footer className="mt-auto pt-8 text-center text-xs text-cream-mute">All studios, people, films and awards in Back Lot are fictional and procedurally generated.</footer>
    </div>
  );
}

function TitleMarquee() {
  return (
    <div className="relative w-full max-w-xl">
      <div className="marquee-bulbs h-3 w-full animate-bulbs rounded-t-lg opacity-80" />
      <div className="relative overflow-hidden border-x-4 border-gold bg-ink-2 px-6 py-6">
        <div className="pointer-events-none absolute -inset-x-10 -top-24 h-48 rounded-full bg-gold/10 blur-3xl" />
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 200 100" className="h-20 w-40 sm:h-24 sm:w-48" aria-hidden>
            <g transform="translate(100 96)">
              <path d="M-96 0a96 96 0 0 1 192 0z" fill="#c2362b" />
              <path d="M-74 0a74 74 0 0 1 148 0z" fill="#e0682b" />
              <path d="M-52 0a52 52 0 0 1 104 0z" fill="#f2c14e" />
              <path d="M-30 0a30 30 0 0 1 60 0z" fill="#f4e7cf" />
            </g>
          </svg>
        </div>
        <h1 className="relative -mt-6 font-display text-6xl text-gold drop-shadow-[0_4px_0_#b84a1c] sm:text-7xl">Back Lot</h1>
        <div className="label mt-2 !text-xs !tracking-[0.5em] text-cream-dim">A film studio management game</div>
      </div>
      <div className="marquee-bulbs h-3 w-full animate-bulbs rounded-b-lg opacity-80" />
    </div>
  );
}

/* ---------------------------------- shell ---------------------------------- */

function Shell() {
  const { game, update, view, go, actorId, openActor, settings, setSettings, toastMsg, replace } = useGame();
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const me = playerStudio(game);
  const unread = game.inbox.filter((m) => !m.read).length;
  const pending = game.decisions.length;

  const onContinue = useCallback(() => {
    if (game.phase !== 'playing') return;
    if (game.decisions.length) {
      setDecisionOpen(true);
      return;
    }
    setBusy(true);
    // let the button state paint before the (fast) simulation step
    requestAnimationFrame(() => {
      update(advanceWeek);
      setBusy(false);
    });
  }, [game.phase, game.decisions.length, update]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onContinue();
      }
      const nav = NAV.find((n) => n.key === e.key);
      if (nav) go(nav.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue, go]);

  const continueLabel = pending ? `Respond (${pending})` : 'Continue';
  const report = game.reports[0];

  return (
    <div className="min-h-[100dvh] pb-24 md:pb-6">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 sm:px-4">
          <button onClick={() => go('office')} className="shrink-0" aria-label="Office">
            <span className="sm:hidden">
              <Logo size={36} wordmark={false} />
            </span>
            <span className="hidden sm:block">
              <Logo size={40} />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-poster text-sm uppercase tracking-wider text-cream">{me.name}</div>
            <div className="flex flex-wrap items-center gap-x-3 font-cond text-xs uppercase tracking-wider text-cream-mute">
              <span>
                Season {game.season} &middot; Week {game.week}
              </span>
              <span className="hidden sm:inline">{ordinal(playerPosition(game))} on the chart</span>
              <span className="sm:hidden">
                <Money value={me.cash} />
              </span>
            </div>
          </div>
          <div className="hidden items-center gap-5 sm:flex">
            <div className="text-right">
              <div className="label">Cash</div>
              <Money value={me.cash} className={`font-poster text-lg ${me.cash < 0 ? 'text-rouge-soft' : 'text-cream'}`} />
            </div>
            <div className="text-right">
              <div className="label">Reputation</div>
              <div className="tabular font-poster text-lg">{Math.round(me.reputation)}</div>
            </div>
          </div>
          <button aria-label="Game menu" className="btn-ghost hidden !px-3 md:inline-flex" onClick={() => setSaveOpen(true)}>
            <Icon name="save" />
          </button>
          <button className="btn-gold min-w-[120px]" onClick={onContinue} disabled={busy || game.phase !== 'playing'}>
            {continueLabel}
            <Icon name="play" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-4 px-3 pt-4 sm:px-4">
        {/* sidebar */}
        <nav aria-label="Main" className="sticky top-[72px] hidden h-fit w-48 shrink-0 flex-col gap-1 md:flex">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              aria-current={view === n.id ? 'page' : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-left font-poster text-sm uppercase tracking-[0.1em] transition-colors ${
                view === n.id ? 'bg-gold text-ink' : 'text-cream-dim hover:bg-ink-3 hover:text-cream'
              }`}
            >
              <Icon name={n.id} />
              <span className="flex-1">{n.label}</span>
              {n.id === 'inbox' && unread > 0 && <span className="rounded-full bg-rouge px-2 text-xs text-cream">{unread}</span>}
              <span className={`font-cond text-[10px] ${view === n.id ? 'text-ink/60' : 'text-cream-mute/60'}`}>{n.key}</span>
            </button>
          ))}
          <button className="btn-ghost mt-3 justify-start !px-3" onClick={() => setSaveOpen(true)}>
            <Icon name="save" /> Save / Load
          </button>
        </nav>

        <main className="min-w-0 flex-1" key={view}>
          {view === 'office' && <OfficeScreen onRespond={() => setDecisionOpen(true)} />}
          {view === 'inbox' && <InboxScreen onRespond={() => setDecisionOpen(true)} />}
          {view === 'squad' && <SquadScreen />}
          {view === 'talent' && <TalentScreen />}
          {view === 'training' && <TrainingScreen />}
          {view === 'films' && <FilmsScreen />}
          {view === 'chart' && <ChartScreen />}
          {view === 'finance' && <FinanceScreen />}
          {view === 'board' && <BoardScreen />}
        </main>
      </div>

      {/* mobile bottom nav */}
      <nav aria-label="Main mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((id) => {
            const n = NAV.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={view === id ? 'page' : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 font-cond text-[11px] font-bold uppercase tracking-wider ${view === id ? 'text-gold' : 'text-cream-mute'}`}
              >
                <Icon name={id} />
                {n.label}
              </button>
            );
          })}
          <button
            onClick={() => setMenuOpen(true)}
            className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 font-cond text-[11px] font-bold uppercase tracking-wider ${
              !MOBILE_NAV.includes(view) ? 'text-gold' : 'text-cream-mute'
            }`}
          >
            <Icon name="more" />
            More
            {unread > 0 && <span className="absolute right-4 top-2 h-2.5 w-2.5 rounded-full bg-rouge" />}
          </button>
        </div>
      </nav>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Studio menu">
        <div className="grid grid-cols-2 gap-2">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                go(n.id);
                setMenuOpen(false);
              }}
              className={`flex min-h-[56px] items-center gap-3 rounded-lg border px-3 font-poster text-sm uppercase tracking-wider ${
                view === n.id ? 'border-gold bg-gold/10 text-gold' : 'border-line bg-ink text-cream'
              }`}
            >
              <Icon name={n.id} />
              {n.label}
              {n.id === 'inbox' && unread > 0 && <span className="ml-auto rounded-full bg-rouge px-2 text-xs text-cream">{unread}</span>}
            </button>
          ))}
          <button
            className="col-span-2 flex min-h-[56px] items-center justify-center gap-3 rounded-lg border border-line bg-ink font-poster text-sm uppercase tracking-wider"
            onClick={() => {
              setMenuOpen(false);
              setSaveOpen(true);
            }}
          >
            <Icon name="save" /> Save / Load / New game
          </button>
        </div>
      </Modal>

      <SaveModal open={saveOpen} onClose={() => setSaveOpen(false)} />

      {actorId && <ActorProfile actorId={actorId} onClose={() => openActor(null)} />}
      <DecisionModal open={decisionOpen && pending > 0} onClose={() => setDecisionOpen(false)} />

      {report && game.phase !== 'gameover' && <ReleaseDay report={report} />}
      {!report && game.phase === 'awards' && <AwardsCeremony />}
      {!report && game.phase === 'review' && <SeasonReview />}
      {game.phase === 'gameover' && <GameOverScreen onNew={() => replace(null)} />}
      {!settings.tutorialDone && game.phase === 'playing' && !report && <Tutorial onDone={() => setSettings({ tutorialDone: true })} />}

      {toastMsg && (
        <div role="status" className="fixed inset-x-0 bottom-24 z-[70] mx-auto w-fit max-w-[90vw] animate-rise rounded-lg border border-gold/50 bg-ink-2 px-4 py-3 text-sm shadow-glow md:bottom-6">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function SaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { game, replace, toast, setSettings } = useGame();
  const [saves, setSaves] = useState(() => listSaves());
  const [confirmNew, setConfirmNew] = useState(false);
  const [tab, setTab] = useState<'save' | 'load'>('save');
  useEffect(() => {
    if (open) setSaves(listSaves());
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Save & load">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'save', label: 'Save' },
          { value: 'load', label: 'Load' },
        ]}
      />
      <div className="mt-3 space-y-2">
        {(tab === 'save' ? SLOTS : ([AUTOSAVE, ...SLOTS] as SlotId[])).map((slot) => {
          const m = saves[slot as SlotId];
          return (
            <div key={slot} className="flex items-center gap-2 rounded-lg border border-line bg-ink p-2 pl-3">
              <div className="min-w-0 flex-1">
                <div className="label">{slot === AUTOSAVE ? 'Autosave' : `Slot ${slot}`}</div>
                <div className="truncate text-sm">{m ? `${m.studio} · S${m.season} W${m.week} · ${new Date(m.savedAt).toLocaleString()}` : 'Empty'}</div>
              </div>
              {tab === 'save' ? (
                <button
                  className="btn-gold !px-4"
                  onClick={() => {
                    const res = saveGame(slot as SlotId, game);
                    toast(res.ok ? `Saved to slot ${slot}.` : res.error ?? 'Save failed.');
                    setSaves(listSaves());
                  }}
                >
                  Save
                </button>
              ) : (
                m && (
                  <button
                    className="btn-ghost !px-4"
                    onClick={() => {
                      const g = loadGame(slot as SlotId);
                      if (g) {
                        replace(g);
                        toast('Game loaded.');
                        onClose();
                      } else toast('That save could not be loaded.');
                    }}
                  >
                    Load
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <button className="btn-ghost" onClick={() => setSettings({ tutorialDone: false })}>
          Replay tutorial
        </button>
        {confirmNew ? (
          <button className="btn-danger" onClick={() => replace(null)}>
            Quit to title (unsaved progress since the last week is kept in the autosave)
          </button>
        ) : (
          <button className="btn-ghost" onClick={() => setConfirmNew(true)}>
            Quit to title
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-cream-mute">
        Seed {game.seed} &middot; {DIFFICULTY[game.difficulty].label} difficulty. The game autosaves every week.
      </p>
    </Modal>
  );
}
