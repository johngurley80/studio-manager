import { dismissReview, fmtMoney, ordinal } from '../../sim';
import { useGame } from '../../state/GameContext';
import { Modal, StudioDot } from '../kit';

const VERDICT = {
  delighted: { title: 'The board is delighted', color: '#f2c14e' },
  satisfied: { title: 'The board is satisfied', color: '#8bc172' },
  warning: { title: 'Formal warning issued', color: '#e0682b' },
  sacked: { title: 'You have been dismissed', color: '#e0563f' },
} as const;

export function SeasonReview() {
  const { game, update } = useGame();
  const h = game.history[game.history.length - 1];
  if (!h) return null;
  const v = VERDICT[h.verdict];
  return (
    <Modal
      open
      closable={false}
      onClose={() => undefined}
      wide
      title={`Season ${h.season} review`}
      footer={
        <button className="btn-gold" onClick={() => update(dismissReview)}>
          Begin season {game.season}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <div className="rounded-xl border p-4 text-center" style={{ borderColor: v.color }}>
            <div className="label">Final position</div>
            <div className="font-display text-6xl" style={{ color: v.color }}>
              {ordinal(h.position)}
            </div>
            <div className="h-poster mt-1" style={{ color: v.color }}>
              {v.title}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-cream-mute">Season gross</dt>
            <dd className="text-right">{fmtMoney(h.gross)}</dd>
            <dt className="text-cream-mute">Season result</dt>
            <dd className={`text-right ${h.profit >= 0 ? 'text-leaf' : 'text-rouge-soft'}`}>{fmtMoney(h.profit)}</dd>
            <dt className="text-cream-mute">Releases</dt>
            <dd className="text-right">{h.releases}</dd>
            <dt className="text-cream-mute">Average critics</dt>
            <dd className="text-right">{h.releases ? Math.round(h.avgCritics) : '—'}</dd>
            <dt className="text-cream-mute">Lanterns</dt>
            <dd className="text-right">
              {h.wins} won / {h.nominations} nominated
            </dd>
          </dl>
          <div className="label mt-4">Board objectives</div>
          <ul className="mt-1 space-y-1 text-sm">
            {h.objectives.map((o, i) => (
              <li key={i} className={o.met ? 'text-leaf' : 'text-rouge-soft'}>
                {o.met ? '✓' : '✗'} {o.text}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="label mb-2">Final table &middot; champions {h.champion}</div>
          <ol className="space-y-1">
            {h.table.map((r, i) => (
              <li
                key={r.studioId}
                className={`flex min-h-[36px] items-center gap-2 rounded px-2 text-sm ${r.studioId === game.playerId ? 'bg-gold/15 text-gold' : i === h.table.length - 1 ? 'text-rouge-soft' : ''}`}
              >
                <span className="tabular w-5 font-cond font-bold">{i + 1}</span>
                <StudioDot color={r.color} size={8} />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="tabular font-cond">{fmtMoney(r.gross, 0)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-cream-mute">
            The champions bank a $25M bonus. The bottom studio loses reputation and has its season allocation halved. Contracts that ran out have ended,
            everyone is a year older, and a new crop of free agents has arrived.
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-line bg-ink p-3">
        <div className="label">New objectives for season {game.season}</div>
        <ul className="mt-1 text-sm">
          {game.board.objectives.map((o, i) => (
            <li key={i}>&bull; {o.text}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
