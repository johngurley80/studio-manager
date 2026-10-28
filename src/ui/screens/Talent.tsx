import { useMemo, useState } from 'react';
import {
  MAX_SCOUTS,
  REGIONS,
  REGION_IDS,
  SCOUT_SALARY,
  STRATEGIES,
  assignScout,
  fireScout,
  freeAgents,
  fullName,
  hireScout,
  scoutWeeks,
  type RegionId,
} from '../../sim';
import { useGame } from '../../state/GameContext';
import { DataTable, Empty, Modal, Panel, Segmented, StudioDot, Tabs } from '../kit';
import { actorColumns } from './Squad';

type Tab = 'free' | 'rivals' | 'scouts';

export function TalentScreen() {
  const { game, openActor } = useGame();
  const [tab, setTab] = useState<Tab>('free');
  const [q, setQ] = useState('');
  const [age, setAge] = useState<'all' | 'young' | 'prime' | 'vet'>('all');
  const [scoutedOnly, setScoutedOnly] = useState(false);
  const rivals = game.studios.filter((s) => !s.isPlayer);
  const [rivalId, setRivalId] = useState<string>('all');

  const pool = useMemo(() => {
    const base =
      tab === 'free'
        ? freeAgents(game)
        : Object.values(game.actors).filter((a) => a.studioId && a.studioId !== game.playerId && (rivalId === 'all' || a.studioId === rivalId));
    return base.filter((a) => {
      if (q && !fullName(a).toLowerCase().includes(q.toLowerCase())) return false;
      if (age === 'young' && a.age > 25) return false;
      if (age === 'prime' && (a.age < 26 || a.age > 45)) return false;
      if (age === 'vet' && a.age < 46) return false;
      if (scoutedOnly && !a.scouted) return false;
      return true;
    });
  }, [game, tab, q, age, scoutedOnly, rivalId]);

  const cols = useMemo(() => actorColumns(game, { showStudio: tab === 'rivals' }), [game, tab]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-poster text-2xl text-gold">Talent</h1>
        <p className="text-sm text-cream-mute">Sign free agents, poach stars from rivals and send scouts out to find the next big thing.</p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'free', label: `Free agents (${freeAgents(game).length})` },
          { id: 'rivals', label: 'Rival rosters' },
          { id: 'scouts', label: `Scouts (${game.scouts.length})` },
        ]}
      />
      {tab === 'scouts' ? (
        <ScoutsPanel />
      ) : (
        <Panel bodyClass="p-3 space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
            <input className="input" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search talent" />
            <Segmented
              size="sm"
              value={age}
              onChange={setAge}
              options={[
                { value: 'all', label: 'Any age' },
                { value: 'young', label: '≤25' },
                { value: 'prime', label: '26–45' },
                { value: 'vet', label: '46+' },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tab === 'rivals' && (
              <select className="input !w-auto" value={rivalId} onChange={(e) => setRivalId(e.target.value)} aria-label="Rival studio">
                <option value="all">All rival studios</option>
                {rivals.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-line bg-ink px-3 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-[#f2c14e]" checked={scoutedOnly} onChange={(e) => setScoutedOnly(e.target.checked)} />
              Scouted only (potential known)
            </label>
          </div>
          <DataTable rows={pool} columns={cols} rowKey={(a) => a.id} onRow={(a) => openActor(a.id)} initialSort={{ key: 'ovr', dir: 'desc' }} empty="Nobody matches those filters." />
        </Panel>
      )}
    </div>
  );
}

function ScoutsPanel() {
  const { game, update } = useGame();
  const [assigning, setAssigning] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Panel
        title="Your scouts"
        action={
          <button className="btn-ghost !min-h-[36px] !px-3 !text-xs" disabled={game.scouts.length >= MAX_SCOUTS} onClick={() => update(hireScout)}>
            Hire scout (${SCOUT_SALARY}M/yr)
          </button>
        }
      >
        {game.scouts.length === 0 ? (
          <Empty>No scouts on staff.</Empty>
        ) : (
          <ul className="space-y-2">
            {game.scouts.map((sc) => {
              const target = sc.targetActorId ? game.actors[sc.targetActorId] : null;
              const busy = !!(sc.region || sc.targetActorId);
              return (
                <li key={sc.id} className="rounded-lg border border-line bg-ink p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{sc.name}</div>
                      <div className="font-cond text-xs uppercase tracking-wider text-cream-mute">
                        Judgement {'★'.repeat(sc.ability)}
                        {'☆'.repeat(5 - sc.ability)}
                      </div>
                    </div>
                    {busy ? (
                      <span className="chip text-teal-soft">
                        {sc.region ? REGIONS[sc.region].name : target ? fullName(target) : ''} &middot; {sc.weeksLeft}w
                      </span>
                    ) : (
                      <button className="btn-gold !min-h-[40px] !px-3 !text-xs" onClick={() => setAssigning(sc.id)}>
                        Send out
                      </button>
                    )}
                    <button className="btn-ghost !min-h-[40px] !px-3 !text-xs" onClick={() => update((s) => fireScout(s, sc.id))}>
                      Let go
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-cream-mute">
          A regional trip reveals the potential of everyone from that region and usually turns up one or two unknown youngsters. Better scouts are
          quicker and find more.
        </p>
      </Panel>
      <Panel title="Regions">
        <ul className="space-y-2">
          {REGION_IDS.map((r) => {
            const people = Object.values(game.actors).filter((a) => a.region === r && a.studioId !== game.playerId && !a.retired);
            const known = people.filter((a) => a.scouted).length;
            return (
              <li key={r} className="rounded-lg border border-line bg-ink p-3">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{REGIONS[r].name}</span>
                  <span className="font-cond text-xs uppercase tracking-wider text-cream-mute">
                    {known}/{people.length} scouted
                  </span>
                </div>
                <div className="text-sm text-cream-mute">{REGIONS[r].blurb}</div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Send scout to…">
        <div className="space-y-2">
          {REGION_IDS.map((r: RegionId) => (
            <button
              key={r}
              className="flex min-h-[52px] w-full flex-col items-start rounded-lg border border-line bg-ink px-3 py-2 text-left hover:border-gold"
              onClick={() => {
                update((s) => assignScout(s, assigning!, { region: r }));
                setAssigning(null);
              }}
            >
              <span>{REGIONS[r].name}</span>
              <span className="font-cond text-xs uppercase tracking-wider text-cream-mute">
                {scoutWeeks(game.scouts.find((x) => x.id === assigning)?.ability ?? 2, true)} weeks &middot; {REGIONS[r].blurb}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

/** Button used on profiles to send an idle scout after one actor. */
export function AssignScout({ actorId }: { actorId: string }) {
  const { game, update, toast } = useGame();
  const idle = game.scouts.find((s) => !s.region && !s.targetActorId);
  const already = game.scouts.some((s) => s.targetActorId === actorId);
  if (already) return <span className="chip self-center text-teal-soft">Scout assigned</span>;
  return (
    <button
      className="btn-ghost"
      disabled={!idle}
      title={idle ? 'Takes two weeks' : 'All scouts are busy'}
      onClick={() => {
        if (!idle) return;
        update((s) => assignScout(s, idle.id, { actorId }));
        toast(`${idle.name} will report back in two weeks.`);
      }}
    >
      Scout this actor
    </button>
  );
}

export function RivalStrategyBadge({ studioId }: { studioId: string }) {
  const { game } = useGame();
  const st = game.studios.find((s) => s.id === studioId);
  if (!st || st.isPlayer) return null;
  const info = STRATEGIES[st.strategy as keyof typeof STRATEGIES];
  return (
    <span className="inline-flex items-center gap-1.5" title={info?.blurb}>
      <StudioDot color={st.color} size={8} />
      <span className="font-cond text-xs uppercase tracking-wider text-cream-mute">{info?.label}</span>
    </span>
  );
}
