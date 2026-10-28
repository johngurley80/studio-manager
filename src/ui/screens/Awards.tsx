import { useState } from 'react';
import { AWARD_VENUE, concludeSeason, type AwardCategory, type Nominee } from '../../sim';
import { useGame } from '../../state/GameContext';
import { Face } from '../Face';
import { Confetti } from '../kit';
import { Poster } from '../Poster';

export function Lantern({ size = 64, lit = true }: { size?: number; lit?: boolean }) {
  return (
    <svg viewBox="0 0 64 96" width={size} height={(size * 96) / 64} aria-hidden>
      {lit && <ellipse cx="32" cy="42" rx="30" ry="34" fill="#f2c14e" opacity=".18" />}
      <path d="M24 8 Q32 0 40 8" fill="none" stroke="#d99a28" strokeWidth="3" />
      <rect x="20" y="10" width="24" height="6" rx="2" fill="#d99a28" />
      <path d="M18 16 H46 L50 60 H14 Z" fill="#2a1f18" stroke="#f2c14e" strokeWidth="2.5" />
      <path d="M22 20 H42 L45 56 H19 Z" fill={lit ? '#f7d98f' : '#3a2b20'} />
      {lit && <path d="M32 28 Q38 38 32 50 Q26 38 32 28 Z" fill="#e0682b" />}
      <path d="M32 16 V60 M18 38 H46" stroke="#d99a28" strokeWidth="1.5" opacity=".7" />
      <rect x="12" y="60" width="40" height="8" rx="2" fill="#d99a28" />
      <rect x="18" y="68" width="28" height="20" rx="2" fill="#16100d" stroke="#d99a28" strokeWidth="2" />
      <rect x="22" y="74" width="20" height="3" fill="#d99a28" opacity=".7" />
    </svg>
  );
}

type Stage = 'nominees' | 'envelope' | 'winner';

export function AwardsCeremony() {
  const { game, update } = useGame();
  const c = game.ceremony;
  const [idx, setIdx] = useState(-1);
  const [stage, setStage] = useState<Stage>('nominees');
  if (!c) return null;
  const cat = idx >= 0 && idx < c.categories.length ? c.categories[idx] : null;
  const summary = idx >= c.categories.length;
  const winner = cat ? cat.nominees[cat.winnerIndex] : null;
  const playerWon = stage === 'winner' && winner?.studioId === game.playerId;

  const next = () => {
    setStage('nominees');
    setIdx((i) => i + 1);
  };
  const open = () => {
    setStage('envelope');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => setStage('winner'), reduce ? 0 : 2200);
  };

  const myWins = c.categories.filter((k) => k.nominees[k.winnerIndex]?.studioId === game.playerId);
  const myNoms = c.categories.reduce((n, k) => n + k.nominees.filter((x) => x.studioId === game.playerId).length, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0706]" role="dialog" aria-modal="true" aria-label="Awards ceremony">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(242,193,78,.2),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-full overflow-hidden">
        {stage === 'envelope' && <div className="absolute -top-1/4 left-0 h-[150%] w-40 animate-sweep bg-gradient-to-r from-transparent via-gold/25 to-transparent blur-xl" />}
      </div>
      <Confetti run={playerWon || (summary && myWins.length > 0)} count={160} />
      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center px-4 py-6 text-center sm:py-10">
        <Lantern size={idx < 0 ? 72 : 48} />
        <div className="label mt-2 !text-gold">Live from {AWARD_VENUE}</div>
        <h1 className="font-display text-3xl text-gold drop-shadow-[0_3px_0_#b84a1c] sm:text-5xl">{c.name}</h1>

        {idx < 0 && (
          <div className="mt-8 max-w-xl animate-rise">
            <p className="text-lg text-cream-dim">
              The red carpet is rolled out, the orchestra is tuning up and every studio in town is pretending not to care. Your studio has{' '}
              <b className="text-gold">{myNoms}</b> nomination{myNoms === 1 ? '' : 's'} tonight.
            </p>
            <button className="btn-gold mt-8 text-base" onClick={next}>
              Raise the curtain
            </button>
          </div>
        )}

        {cat && (
          <div key={cat.name} className="mt-6 w-full animate-rise">
            <div className="label">
              Category {idx + 1} of {c.categories.length}
            </div>
            <h2 className="h-poster mt-1 text-2xl text-cream sm:text-3xl">{cat.name}</h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {cat.nominees.map((n, i) => (
                <NomineeCard key={n.filmId + (n.personId ?? '')} n={n} cat={cat} state={stage !== 'winner' ? 'idle' : i === cat.winnerIndex ? 'won' : 'lost'} mine={n.studioId === game.playerId} />
              ))}
            </ul>
            <div className="mt-8 min-h-[80px]">
              {stage === 'nominees' && (
                <button className="btn-gold text-base" onClick={open}>
                  Open the envelope
                </button>
              )}
              {stage === 'envelope' && <p className="animate-flicker font-display text-2xl text-gold sm:text-3xl">And the Lantern goes to&hellip;</p>}
              {stage === 'winner' && winner && (
                <div className="animate-pop">
                  <p className="font-display text-2xl text-gold sm:text-4xl">{winner.personName ?? winner.filmTitle}</p>
                  <p className="text-cream-dim">
                    {winner.personName ? `"${winner.filmTitle}" · ` : ''}
                    {winner.studioName}
                  </p>
                  <button className="btn-gold mt-5 text-base" onClick={next}>
                    {idx + 1 < c.categories.length ? 'Next award' : 'See the results'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="mt-8 w-full max-w-2xl animate-rise">
            <h2 className="h-poster text-2xl text-cream">The winners</h2>
            <ul className="mt-4 space-y-2 text-left">
              {c.categories.map((k) => {
                const w = k.nominees[k.winnerIndex];
                return (
                  <li key={k.name} className={`flex items-center gap-3 rounded-lg border p-3 ${w?.studioId === game.playerId ? 'border-gold bg-gold/10' : 'border-line bg-ink-2'}`}>
                    <Lantern size={22} lit={w?.studioId === game.playerId} />
                    <span className="min-w-0 flex-1">
                      <span className="label block">{k.name}</span>
                      <span className="block truncate">{w ? `${w.personName ? `${w.personName}, ` : ''}"${w.filmTitle}"` : 'Not awarded'}</span>
                    </span>
                    <span className="shrink-0 font-cond text-xs uppercase text-cream-mute">{w?.studioName}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-cream-dim">
              {myWins.length ? `Your studio takes home ${myWins.length} Lantern${myWins.length > 1 ? 's' : ''}. Winners gain star power and the studio gains reputation.` : 'No Lanterns for your studio this year. There is always next season.'}
            </p>
            <button className="btn-gold mt-6 text-base" onClick={() => update(concludeSeason)}>
              On to the season review
            </button>
          </div>
        )}

        {idx >= 0 && !summary && (
          <button className="btn-ghost mt-auto" onClick={() => setIdx(c.categories.length)}>
            Skip to results
          </button>
        )}
      </div>
    </div>
  );
}

function NomineeCard({ n, cat, state, mine }: { n: Nominee; cat: AwardCategory; state: 'idle' | 'won' | 'lost'; mine: boolean }) {
  const { game } = useGame();
  const person = n.personId ? (cat.name === 'Best Director' ? game.directors[n.personId] : game.actors[n.personId]) : null;
  return (
    <li
      className={`flex flex-col items-center rounded-xl border p-3 transition-all duration-700 ${
        state === 'won' ? 'scale-105 border-gold bg-gold/15 shadow-glow' : state === 'lost' ? 'border-line bg-ink-2 opacity-40' : 'border-line bg-ink-2'
      } ${mine ? 'ring-1 ring-gold/60' : ''}`}
    >
      {person ? (
        <div className={`overflow-hidden rounded-full border-2 ${state === 'won' ? 'border-gold' : 'border-line'}`}>
          <Face face={person.face} size={72} />
        </div>
      ) : (
        <Poster title={n.filmTitle} genre={game.films[n.filmId]?.genre ?? 'Drama'} width={72} />
      )}
      <div className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">{n.personName ?? n.filmTitle}</div>
      {n.personName && <div className="line-clamp-1 text-xs text-cream-dim">&ldquo;{n.filmTitle}&rdquo;</div>}
      <div className={`mt-1 font-cond text-[11px] uppercase tracking-wider ${mine ? 'text-gold' : 'text-cream-mute'}`}>{n.studioName}</div>
    </li>
  );
}
