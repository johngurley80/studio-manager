import { fmtMoney, playerStudio } from '../../sim';
import { useGame } from '../../state/GameContext';
import { Logo } from '../kit';
import { Lantern } from './Awards';

export function GameOverScreen({ onNew }: { onNew: () => void }) {
  const { game } = useGame();
  const me = playerStudio(game);
  const films = Object.values(game.films).filter((f) => f.studioId === me.id && f.critics !== null);
  const totalGross = films.reduce((s, f) => s + f.gross, 0);
  const best = films.slice().sort((a, b) => b.gross - a.gross)[0];
  const acclaimed = films.slice().sort((a, b) => (b.critics ?? 0) - (a.critics ?? 0))[0];
  const titles = game.history.filter((h) => h.position === 1).length;
  const wins = game.history.reduce((s, h) => s + h.wins, 0);
  const noms = game.history.reduce((s, h) => s + h.nominations, 0);
  const bankrupt = game.gameOver?.reason === 'bankrupt';
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink" role="dialog" aria-modal="true" aria-label="Career summary">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center px-4 py-8 text-center">
        <Logo size={44} />
        <div className="label mt-8 !text-rouge-soft">{bankrupt ? 'Bankrupt' : 'Sacked'}</div>
        <h1 className="font-display text-4xl text-cream sm:text-6xl">The End</h1>
        <p className="mt-3 max-w-xl text-cream-dim">
          {bankrupt
            ? `The bank has seized the lot. ${me.name} is in administration and the gates are padlocked.`
            : `The board has lost patience. Your office at ${me.name} is being cleared as we speak.`}
        </p>
        <section className="panel mt-8 w-full p-5 text-left">
          <h2 className="h-poster text-gold">Career summary</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="label">Seasons</dt>
              <dd className="font-poster text-2xl">{game.history.length + (game.week > 1 ? 1 : 0)}</dd>
            </div>
            <div>
              <dt className="label">Films released</dt>
              <dd className="font-poster text-2xl">{films.length}</dd>
            </div>
            <div>
              <dt className="label">Career gross</dt>
              <dd className="font-poster text-2xl">{fmtMoney(totalGross)}</dd>
            </div>
            <div>
              <dt className="label">Chart titles</dt>
              <dd className="font-poster text-2xl text-gold">{titles}</dd>
            </div>
            <div>
              <dt className="label">Lanterns</dt>
              <dd className="flex items-center gap-1 font-poster text-2xl">
                {wins} <span className="text-sm text-cream-mute">/ {noms} noms</span>
              </dd>
            </div>
            <div>
              <dt className="label">Final cash</dt>
              <dd className="font-poster text-2xl">{fmtMoney(me.cash)}</dd>
            </div>
          </dl>
          {best && (
            <p className="mt-4 text-sm text-cream-dim">
              Biggest hit: <b className="text-cream">&ldquo;{best.title}&rdquo;</b> ({fmtMoney(best.gross)}).{' '}
              {acclaimed && (
                <>
                  Best reviewed: <b className="text-cream">&ldquo;{acclaimed.title}&rdquo;</b> ({acclaimed.critics}).
                </>
              )}
            </p>
          )}
          {game.history.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {game.history.map((h) => (
                <li key={h.season} className="flex gap-3">
                  <span className="w-20 font-cond uppercase text-cream-mute">Season {h.season}</span>
                  <span>
                    #{h.position} &middot; {fmtMoney(h.gross)} &middot; {h.wins} Lantern{h.wins === 1 ? '' : 's'} &middot; {h.verdict}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {wins > 0 && (
          <div className="mt-6 flex gap-1">
            {Array.from({ length: Math.min(wins, 10) }, (_, i) => (
              <Lantern key={i} size={28} />
            ))}
          </div>
        )}
        <button className="btn-gold mt-8 text-base" onClick={onNew}>
          Back to the title screen
        </button>
      </div>
    </div>
  );
}
