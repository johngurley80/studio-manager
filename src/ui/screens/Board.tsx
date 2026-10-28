import { DIFFICULTY, fmtMoney, objectiveProgress, ordinal, playerStudio } from '../../sim';
import { useGame } from '../../state/GameContext';
import { Empty, Meter, Panel } from '../kit';

const VERDICT_COLOR = { delighted: '#f2c14e', satisfied: '#8bc172', warning: '#e0682b', sacked: '#e0563f' } as const;

export function BoardScreen() {
  const { game } = useGame();
  const me = playerStudio(game);
  const conf = game.board.confidence;
  const color = conf < 35 ? '#e0563f' : conf < 55 ? '#f2c14e' : '#8bc172';
  return (
    <div className="space-y-4">
      <h1 className="h-poster text-2xl text-gold">The board</h1>
      <Panel title="Confidence">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-5xl" style={{ color }}>
            {Math.round(conf)}%
          </span>
          <span className="text-cream-dim">
            {conf >= 70 ? 'The board is thrilled with you.' : conf >= 50 ? 'The board is content.' : conf >= 35 ? 'There are murmurs in the boardroom.' : 'Your job is in danger.'}
          </span>
        </div>
        <Meter className="mt-3 !h-3" value={conf} color={color} />
        <p className="mt-3 text-sm text-cream-mute">
          Meet at least two of three objectives each season. Fall short and you get a formal warning; fall short again before you recover and you are sacked.{' '}
          {game.board.warnings > 0 ? <b className="text-ember">You are currently on a warning.</b> : 'You have a clean record.'} Difficulty: {DIFFICULTY[game.difficulty].label}.
        </p>
      </Panel>
      <Panel title={`Season ${game.season} objectives`}>
        <ul className="space-y-3">
          {game.board.objectives.map((o, i) => {
            const p = objectiveProgress(game, o);
            return (
              <li key={i} className="flex items-center gap-3 rounded-lg border border-line bg-ink p-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${p.met ? 'bg-leaf text-ink' : 'border border-line text-cream-mute'}`}>{p.met ? '✓' : '•'}</span>
                <span className="flex-1">
                  {o.text}
                  <span className="block font-cond text-xs uppercase tracking-wider text-cream-mute">
                    Currently {o.kind === 'position' ? ordinal(p.value) : o.kind === 'profit' || o.kind === 'hit' ? fmtMoney(p.value) : p.value} &middot; {p.met ? 'on track' : 'not yet'}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Track record">
        {game.history.length === 0 ? (
          <Empty>No completed seasons yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {game.history.map((h) => (
              <li key={h.season} className="rounded-lg border border-line bg-ink p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-poster">Season {h.season}</span>
                  <span className="chip" style={{ color: VERDICT_COLOR[h.verdict] }}>
                    {h.verdict}
                  </span>
                  <span className="ml-auto font-cond text-sm text-cream-mute">
                    {ordinal(h.position)} &middot; {fmtMoney(h.gross)} &middot; {h.wins} wins
                  </span>
                </div>
                <ul className="mt-1 text-sm">
                  {h.objectives.map((o, i) => (
                    <li key={i} className={o.met ? 'text-leaf' : 'text-rouge-soft'}>
                      {o.met ? '✓' : '✗'} {o.text}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <p className="text-xs text-cream-mute">Studio reputation {Math.round(me.reputation)}. Reputation rises with good films and awards and drifts back towards the middle each season.</p>
    </div>
  );
}
