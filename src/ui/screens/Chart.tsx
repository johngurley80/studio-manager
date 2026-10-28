import { useState } from 'react';
import { STRATEGIES, TIERS, absToSeasonWeek, absWeek, fmtMoney, seasonality, standings, type StandingRow } from '../../sim';
import { useGame } from '../../state/GameContext';
import { genreLabel, seasonPhase, weekLabel } from '../format';
import { DataTable, Empty, Money, Panel, StudioDot, Tabs } from '../kit';
import { FilmDetail, Score } from './Films';

type Tab = 'table' | 'calendar' | 'films' | 'history';

export function ChartScreen() {
  const { game } = useGame();
  const [tab, setTab] = useState<Tab>('table');
  const [detail, setDetail] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-poster text-2xl text-gold">Box office chart</h1>
        <p className="text-sm text-cream-mute">Season {game.season} league table, ranked by worldwide gross earned this season. Top spot wins a bonus; bottom spot gets its budget halved.</p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'table', label: 'League table' },
          { id: 'calendar', label: 'Release calendar' },
          { id: 'films', label: 'This season’s films' },
          { id: 'history', label: 'Past seasons' },
        ]}
      />
      {tab === 'table' && <LeagueTable rows={standings(game)} />}
      {tab === 'calendar' && <Calendar onDetail={setDetail} />}
      {tab === 'films' && <SeasonFilms onDetail={setDetail} />}
      {tab === 'history' && <History />}
      {detail && <FilmDetail filmId={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

export function LeagueTable({ rows, compact = false }: { rows: StandingRow[]; compact?: boolean }) {
  const { game } = useGame();
  const ranked = rows.map((r, i) => ({ ...r, pos: i + 1 }));
  return (
    <Panel bodyClass="p-3">
      <DataTable
        rows={ranked}
        rowKey={(r) => r.studioId}
        initialSort={{ key: 'pos', dir: 'asc' }}
        rowClass={(r) => (r.studioId === game.playerId ? 'bg-gold/10 text-gold' : r.pos === rows.length ? 'text-rouge-soft/90' : '')}
        columns={[
          { key: 'pos', label: '#', sort: (r) => r.pos, render: (r) => <span className="tabular font-cond font-bold">{r.pos}</span> },
          {
            key: 'name',
            label: 'Studio',
            sort: (r) => r.name,
            render: (r) => {
              const st = game.studios.find((s) => s.id === r.studioId);
              const info = st && !st.isPlayer ? STRATEGIES[st.strategy as keyof typeof STRATEGIES] : null;
              return (
                <span className="flex items-center gap-2">
                  <StudioDot color={r.color} />
                  <span className="min-w-0">
                    <span className="block max-w-[180px] truncate font-semibold">{r.name}</span>
                    {!compact && <span className="block font-cond text-[11px] uppercase tracking-wider text-cream-mute">{info ? info.label : 'You'}</span>}
                  </span>
                </span>
              );
            },
          },
          { key: 'rel', label: 'Films', sort: (r) => r.releases, align: 'right', render: (r) => r.releases },
          { key: 'crit', label: 'Critics', title: 'Average critics score', sort: (r) => r.avgCritics, align: 'right', render: (r) => (r.releases ? <Score v={Math.round(r.avgCritics)} /> : '—'), hideBelow: 'sm' },
          { key: 'hits', label: 'Hits', title: 'Films grossing 2x their cost', sort: (r) => r.hits, align: 'right', render: (r) => r.hits, hideBelow: 'sm' },
          { key: 'rep', label: 'Rep', sort: (r) => r.reputation, align: 'right', render: (r) => Math.round(r.reputation), hideBelow: 'md' },
          { key: 'profit', label: 'P&L', sort: (r) => r.profit, align: 'right', render: (r) => <Money value={r.profit} signed />, hideBelow: 'md' },
          { key: 'gross', label: 'Gross', sort: (r) => r.gross, align: 'right', render: (r) => <Money value={r.gross} className="font-bold" /> },
        ]}
      />
    </Panel>
  );
}

function Calendar({ onDetail }: { onDetail: (id: string) => void }) {
  const { game } = useGame();
  const abs = absWeek(game);
  const weeks = Array.from({ length: 12 }, (_, i) => abs + i);
  return (
    <Panel bodyClass="p-3">
      <ul className="space-y-2">
        {weeks.map((w) => {
          const films = Object.values(game.films).filter((f) => f.releaseAbs === w && (f.status === 'scheduled' || f.status === 'released' || f.status === 'finished'));
          const wk = absToSeasonWeek(w).week;
          return (
            <li key={w} className="grid grid-cols-[92px_1fr] gap-3 rounded-lg border border-line bg-ink p-2">
              <div>
                <div className="font-poster">{weekLabel(w)}</div>
                <div className="font-cond text-[11px] uppercase tracking-wider text-cream-mute">
                  {seasonPhase(wk)} &times;{seasonality(wk).toFixed(2)}
                </div>
              </div>
              <div className="min-w-0 space-y-1">
                {films.length === 0 ? (
                  <span className="text-sm text-cream-mute">No openings announced</span>
                ) : (
                  films.map((f) => {
                    const st = game.studios.find((s) => s.id === f.studioId)!;
                    return (
                      <button key={f.id} onClick={() => onDetail(f.id)} className={`flex min-h-[32px] w-full items-center gap-2 text-left text-sm ${st.isPlayer ? 'text-gold' : ''}`}>
                        <StudioDot color={st.color} size={8} />
                        <span className="truncate">{f.title}</span>
                        <span className="ml-auto shrink-0 font-cond text-[11px] uppercase tracking-wider text-cream-mute">
                          {TIERS[f.tier].label} {genreLabel(f.genre)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function SeasonFilms({ onDetail }: { onDetail: (id: string) => void }) {
  const { game } = useGame();
  const films = Object.values(game.films).filter((f) => f.releaseSeason === game.season && f.critics !== null);
  return (
    <Panel bodyClass="p-3">
      <DataTable
        rows={films}
        rowKey={(f) => f.id}
        onRow={(f) => onDetail(f.id)}
        initialSort={{ key: 'g', dir: 'desc' }}
        empty="No films have opened yet this season."
        rowClass={(f) => (f.studioId === game.playerId ? 'text-gold' : '')}
        columns={[
          { key: 't', label: 'Title', sort: (f) => f.title, render: (f) => <span className="block max-w-[200px] truncate font-semibold">{f.title}</span> },
          {
            key: 's',
            label: 'Studio',
            sort: (f) => f.studioId,
            render: (f) => {
              const st = game.studios.find((s) => s.id === f.studioId)!;
              return (
                <span className="flex items-center gap-1.5">
                  <StudioDot color={st.color} size={8} />
                  <span className="max-w-[120px] truncate">{st.short}</span>
                </span>
              );
            },
          },
          { key: 'ge', label: 'Genre', sort: (f) => f.genre, render: (f) => genreLabel(f.genre), hideBelow: 'sm' },
          { key: 'c', label: 'Critics', sort: (f) => f.critics ?? 0, align: 'right', render: (f) => <Score v={f.critics} /> },
          { key: 'a', label: 'Aud.', sort: (f) => f.audience ?? 0, align: 'right', render: (f) => <Score v={f.audience} />, hideBelow: 'sm' },
          { key: 'o', label: 'Opening', sort: (f) => f.openingWeekend, align: 'right', render: (f) => <Money value={f.openingWeekend} />, hideBelow: 'md' },
          { key: 'g', label: 'Gross', sort: (f) => f.gross, align: 'right', render: (f) => <Money value={f.gross} /> },
        ]}
      />
    </Panel>
  );
}

function History() {
  const { game } = useGame();
  if (!game.history.length) return <Empty>Your first season is still being written.</Empty>;
  return (
    <div className="space-y-4">
      {game.history
        .slice()
        .reverse()
        .map((h) => (
          <Panel key={h.season} title={`Season ${h.season} · champions: ${h.champion}`} bodyClass="p-3">
            <p className="mb-2 text-sm text-cream-dim">
              You finished <b className="text-gold">#{h.position}</b> with {fmtMoney(h.gross)} gross, {h.releases} releases and {h.wins} Lantern win{h.wins === 1 ? '' : 's'}.
            </p>
            <LeagueTable rows={h.table} compact />
          </Panel>
        ))}
    </div>
  );
}
