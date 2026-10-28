import {
  absWeek,
  fmtMoney,
  objectiveProgress,
  ordinal,
  playerPosition,
  playerStudio,
  rosterOf,
  seasonProfit,
  standings,
  TIERS,
} from '../../sim';
import { useGame } from '../../state/GameContext';
import { genreLabel, seasonPhase, weekLabel } from '../format';
import { Empty, Meter, Money, Panel, Stat, StudioDot } from '../kit';
import { Sparkline } from './Finance';

export function OfficeScreen({ onRespond }: { onRespond: () => void }) {
  const { game, go } = useGame();
  const me = playerStudio(game);
  const abs = absWeek(game);
  const table = standings(game);
  const pos = playerPosition(game);
  const films = Object.values(game.films).filter((f) => f.studioId === me.id);
  const production = films.filter((f) => f.status === 'production');
  const ready = films.filter((f) => f.status === 'post');
  const upcoming = films.filter((f) => f.status === 'scheduled').sort((a, b) => (a.releaseAbs ?? 0) - (b.releaseAbs ?? 0));
  const showing = films.filter((f) => f.status === 'released');
  const unread = game.inbox.filter((m) => !m.read).slice(0, 5);
  const squad = rosterOf(game, me.id);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {game.decisions.length > 0 && (
        <button
          onClick={onRespond}
          className="panel flex min-h-[56px] items-center gap-3 border-gold/70 bg-gold/10 px-4 py-3 text-left lg:col-span-3"
        >
          <span className="flex h-9 w-9 shrink-0 animate-flicker items-center justify-center rounded-full bg-gold font-poster text-ink">{game.decisions.length}</span>
          <span className="flex-1">
            <span className="h-poster block text-gold">Decisions waiting</span>
            <span className="text-sm text-cream-dim">{game.decisions[0].title}</span>
          </span>
          <span className="btn-gold pointer-events-none">Respond</span>
        </button>
      )}

      <Panel title={`Season ${game.season} · Week ${game.week}`} className="lg:col-span-3" bodyClass="p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Cash">
            <Money value={me.cash} className={me.cash < 0 ? 'text-rouge-soft' : ''} />
          </Stat>
          <Stat label="Chart position">
            {ordinal(pos)} <span className="text-sm text-cream-mute">of {table.length}</span>
          </Stat>
          <Stat label="Season gross">
            <Money value={me.season.gross} />
          </Stat>
          <Stat label="Season P&amp;L">
            <Money value={seasonProfit(game, me)} signed />
          </Stat>
          <Stat label="Reputation">{Math.round(me.reputation)}</Stat>
          <Stat label="Board confidence">
            <span style={{ color: game.board.confidence < 35 ? '#e0563f' : game.board.confidence < 55 ? '#f2c14e' : '#8bc172' }}>
              {Math.round(game.board.confidence)}%
            </span>
          </Stat>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 font-cond text-xs uppercase tracking-wider text-cream-mute">
          <span className="chip">{seasonPhase(game.week)}</span>
          <span className="chip">
            {squad.length} contracted actors
          </span>
          <span className="chip">{production.length}/3 sound stages in use</span>
          {game.board.warnings > 0 && <span className="chip border-rouge text-rouge-soft">Board warning</span>}
        </div>
      </Panel>

      <Panel
        title="Current projects"
        className="lg:col-span-2"
        action={
          <button className="btn-ghost !min-h-[36px] !px-3 !text-xs" onClick={() => go('films')}>
            Films &rarr;
          </button>
        }
      >
        {production.length + ready.length + upcoming.length + showing.length === 0 ? (
          <Empty>
            No films on the go. Head to <b>Films</b> and greenlight your first picture.
          </Empty>
        ) : (
          <ul className="space-y-2">
            {ready.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-gold/60 bg-gold/5 p-3">
                <span className="chip border-gold text-gold">Ready</span>
                <span className="min-w-0 flex-1 truncate font-poster uppercase tracking-wide">{f.title}</span>
                <button className="btn-gold !min-h-[40px] !px-3 !text-xs" onClick={() => go('films')}>
                  Set release
                </button>
              </li>
            ))}
            {upcoming.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-line bg-ink p-3">
                <span className="chip text-teal-soft">Opens {weekLabel(f.releaseAbs!)}</span>
                <span className="min-w-0 flex-1 truncate font-poster uppercase tracking-wide">{f.title}</span>
                <span className="font-cond text-sm text-cream-mute">{f.releaseAbs! - abs > 0 ? `in ${f.releaseAbs! - abs}w` : "this week"}</span>
              </li>
            ))}
            {production.map((f) => (
              <li key={f.id} className="rounded-lg border border-line bg-ink p-3">
                <div className="flex items-center gap-3">
                  <span className="chip">Shooting</span>
                  <span className="min-w-0 flex-1 truncate font-poster uppercase tracking-wide">{f.title}</span>
                  <span className="font-cond text-sm text-cream-mute">{f.weeksLeft}w left</span>
                </div>
                <Meter className="mt-2" value={f.productionWeeks - f.weeksLeft} max={f.productionWeeks} color="#3fa7a0" />
                <div className="mt-1 font-cond text-xs uppercase tracking-wider text-cream-mute">
                  {TIERS[f.tier].label} {genreLabel(f.genre)} &middot; {fmtMoney(f.budget)}
                </div>
              </li>
            ))}
            {showing.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-line bg-ink p-3">
                <span className="chip text-leaf">In cinemas</span>
                <span className="min-w-0 flex-1 truncate font-poster uppercase tracking-wide">{f.title}</span>
                <span className="text-right font-cond text-sm">
                  <Money value={f.gross} /> <span className="text-cream-mute">wk {f.weeksInRelease}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Box office chart"
        action={
          <button className="btn-ghost !min-h-[36px] !px-3 !text-xs" onClick={() => go('chart')}>
            Full &rarr;
          </button>
        }
        bodyClass="p-2"
      >
        <ol>
          {table.map((r, i) => (
            <li key={r.studioId} className={`flex min-h-[36px] items-center gap-2 rounded px-2 text-sm ${r.studioId === me.id ? 'bg-gold/15 text-gold' : ''}`}>
              <span className="tabular w-5 font-cond font-bold text-cream-mute">{i + 1}</span>
              <StudioDot color={r.color} size={8} />
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <Money value={r.gross} digits={0} className="font-cond" />
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title="Inbox"
        className="lg:col-span-2"
        action={
          <button className="btn-ghost !min-h-[36px] !px-3 !text-xs" onClick={() => go('inbox')}>
            All &rarr;
          </button>
        }
      >
        {unread.length === 0 ? (
          <Empty>No unread messages.</Empty>
        ) : (
          <ul className="divide-y divide-line-soft">
            {unread.map((m) => (
              <li key={m.id}>
                <button className="flex min-h-[48px] w-full items-center gap-3 py-2 text-left" onClick={() => go('inbox')}>
                  <span className="label w-20 shrink-0">{m.kind}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-cream">{m.subject}</span>
                    <span className="block truncate text-xs text-cream-mute">{m.from}</span>
                  </span>
                  {m.decisionId && game.decisions.some((d) => d.id === m.decisionId) && <span className="chip border-gold text-gold">Action</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Board objectives" action={<span className="font-cond text-xs text-cream-mute">{game.board.warnings ? 'On a warning' : ''}</span>}>
        <ul className="space-y-3">
          {game.board.objectives.map((o, i) => {
            const p = objectiveProgress(game, o);
            return (
              <li key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${p.met ? 'bg-leaf text-ink' : 'border border-line text-cream-mute'}`}>
                  {p.met ? '✓' : i + 1}
                </span>
                <span className="text-sm">
                  {o.text}
                  <span className="block font-cond text-xs uppercase tracking-wider text-cream-mute">
                    Now: {o.kind === 'position' ? ordinal(p.value) : o.kind === 'profit' || o.kind === 'hit' ? fmtMoney(p.value) : p.value}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Trade news" className="lg:col-span-2">
        <ul className="space-y-2">
          {game.news.slice(0, 8).map((n) => (
            <li key={n.id} className="flex gap-3 text-sm">
              <span className="w-16 shrink-0 font-cond text-xs uppercase text-cream-mute">{weekLabel(n.abs)}</span>
              <span className="text-cream-dim">{n.text}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Cash flow">
        <Sparkline values={game.cashHistory.slice(-52)} />
        <div className="mt-2 flex justify-between font-cond text-xs uppercase tracking-wider text-cream-mute">
          <span>Last 52 weeks</span>
          <Money value={me.cash} />
        </div>
      </Panel>
    </div>
  );
}
