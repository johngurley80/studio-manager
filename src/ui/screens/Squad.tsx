import { useMemo, useState } from 'react';
import { SQUAD_MAX, fullName, overall, payroll, playerStudio, rosterOf, specialty, type Actor, type GameState, type Skill } from '../../sim';
import { useGame } from '../../state/GameContext';
import { Face } from '../Face';
import { SKILL_LABEL, STATUS_COLOR, actorStatus, potentialText } from '../format';
import { AttrNum, DataTable, Money, Mood, Panel, Segmented, type Column } from '../kit';

type StatusFilter = 'all' | 'available' | 'filming' | 'expiring' | 'unhappy';

export function actorColumns(game: GameState, opts: { showStudio?: boolean; showStatus?: boolean } = {}): Column<Actor>[] {
  const cols: Column<Actor>[] = [
    {
      key: 'name',
      label: 'Name',
      sort: (a) => a.last,
      render: (a) => (
        <span className="flex items-center gap-2">
          <Face face={a.face} size={32} title={fullName(a)} />
          <span className="min-w-0">
            <span className="block max-w-[150px] truncate font-semibold text-cream">{fullName(a)}</span>
            <span className="block font-cond text-[11px] uppercase tracking-wider text-cream-mute">
              {SKILL_LABEL[specialty(a)]}
              {a.topBilling ? ' · ★ billing' : ''}
            </span>
          </span>
        </span>
      ),
    },
    { key: 'age', label: 'Age', sort: (a) => a.age, align: 'right', render: (a) => <span className="tabular">{a.age}</span> },
    { key: 'ovr', label: 'Ovr', title: 'Overall ability', sort: (a) => overall(a), align: 'right', render: (a) => <AttrNum v={overall(a)} /> },
    { key: 'dr', label: 'Dra', title: 'Drama', sort: (a) => a.drama, align: 'right', render: (a) => <AttrNum v={a.drama} /> },
    { key: 'co', label: 'Com', title: 'Comedy', sort: (a) => a.comedy, align: 'right', render: (a) => <AttrNum v={a.comedy} /> },
    { key: 'ac', label: 'Act', title: 'Action', sort: (a) => a.action, align: 'right', render: (a) => <AttrNum v={a.action} /> },
    { key: 'ch', label: 'Cha', title: 'Charisma', sort: (a) => a.charisma, align: 'right', render: (a) => <AttrNum v={a.charisma} />, hideBelow: 'sm' },
    { key: 'sp', label: 'Star', title: 'Star power', sort: (a) => a.starPower, align: 'right', render: (a) => <AttrNum v={a.starPower} /> },
    { key: 'rel', label: 'Rel', title: 'Reliability', sort: (a) => a.reliability, align: 'right', render: (a) => <AttrNum v={a.reliability} />, hideBelow: 'md' },
    { key: 'ego', label: 'Ego', title: 'Ego (high is trouble)', sort: (a) => a.ego, align: 'right', render: (a) => <AttrNum v={a.ego} invert />, hideBelow: 'md' },
    {
      key: 'pot',
      label: 'Pot',
      title: 'Potential (scout to reveal)',
      sort: (a) => (a.scouted ? a.potential : -1),
      align: 'right',
      render: (a) => <span className="tabular font-cond font-bold text-gold">{potentialText(a, game.playerId)}</span>,
    },
    { key: 'mor', label: 'Morale', sort: (a) => a.morale, render: (a) => <Mood value={a.morale} />, hideBelow: 'sm' },
    { key: 'form', label: 'Form', sort: (a) => a.form, render: (a) => <Mood value={a.form} />, hideBelow: 'lg' },
    { key: 'sal', label: 'Salary', sort: (a) => a.salary, align: 'right', render: (a) => <Money value={a.salary} digits={2} /> },
    {
      key: 'con',
      label: 'Until',
      title: 'Contract runs to the end of this season',
      sort: (a) => a.contractEnd,
      align: 'right',
      render: (a) => (
        <span className={`tabular ${a.studioId === game.playerId && a.contractEnd <= game.season ? 'font-bold text-ember' : ''}`}>{a.studioId ? `S${a.contractEnd}` : '—'}</span>
      ),
      hideBelow: 'sm',
    },
  ];
  if (opts.showStatus) {
    cols.push({
      key: 'status',
      label: 'Status',
      sort: (a) => actorStatus(game, a),
      render: (a) => {
        const st = actorStatus(game, a);
        return (
          <span className="font-cond text-xs font-bold uppercase tracking-wider" style={{ color: STATUS_COLOR[st] }}>
            {st}
            {st === 'Injured' ? ` (${a.injuredWeeks}w)` : ''}
          </span>
        );
      },
    });
  }
  if (opts.showStudio) {
    cols.push({
      key: 'studio',
      label: 'Studio',
      sort: (a) => game.studios.find((s) => s.id === a.studioId)?.name ?? 'Free agent',
      render: (a) => <span className="block max-w-[140px] truncate text-cream-dim">{game.studios.find((s) => s.id === a.studioId)?.name ?? 'Free agent'}</span>,
    });
  }
  return cols;
}

export function SquadScreen() {
  const { game, openActor } = useGame();
  const me = playerStudio(game);
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState<'all' | Skill>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const squad = rosterOf(game, me.id);
  const rows = useMemo(
    () =>
      squad.filter((a) => {
        if (q && !fullName(a).toLowerCase().includes(q.toLowerCase())) return false;
        if (skill !== 'all' && specialty(a) !== skill) return false;
        if (status === 'available' && actorStatus(game, a) !== 'Available') return false;
        if (status === 'filming' && !a.filmId) return false;
        if (status === 'expiring' && a.contractEnd > game.season) return false;
        if (status === 'unhappy' && a.morale >= 40 && !a.wantsToLeave) return false;
        return true;
      }),
    [squad, q, skill, status, game],
  );
  const cols = useMemo(() => actorColumns(game, { showStatus: true }), [game]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-poster text-2xl text-gold">Squad</h1>
          <p className="font-cond text-sm uppercase tracking-wider text-cream-mute">
            {squad.length}/{SQUAD_MAX} contracted &middot; payroll <Money value={payroll(game, me.id)} />
            /season &middot; avg age {(squad.reduce((s, a) => s + a.age, 0) / Math.max(1, squad.length)).toFixed(1)}
          </p>
        </div>
      </div>
      <Panel bodyClass="p-3 space-y-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <input className="input" placeholder="Search actors…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search actors" />
          <Segmented
            size="sm"
            value={skill}
            onChange={setSkill}
            options={[
              { value: 'all', label: 'All' },
              { value: 'drama', label: 'Drama' },
              { value: 'comedy', label: 'Comedy' },
              { value: 'action', label: 'Action' },
            ]}
          />
        </div>
        <Segmented
          size="sm"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'available', label: 'Available' },
            { value: 'filming', label: 'Filming' },
            { value: 'expiring', label: 'Expiring' },
            { value: 'unhappy', label: 'Unhappy' },
          ]}
        />
        <DataTable rows={rows} columns={cols} rowKey={(a) => a.id} onRow={(a) => openActor(a.id)} initialSort={{ key: 'ovr', dir: 'desc' }} empty="No actors match those filters." />
        <p className="font-cond text-xs uppercase tracking-wider text-cream-mute">
          Tap a row for the full profile. Attributes run 1–20 (gold 16+, green 12+). Ego is coloured the other way round: red means a handful.
        </p>
      </Panel>
    </div>
  );
}
