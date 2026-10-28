import { useMemo, useState } from 'react';
import { markRead, type InboxMessage } from '../../sim';
import { useGame } from '../../state/GameContext';
import { weekLabel } from '../format';
import { Empty, Panel, Segmented } from '../kit';

type Filter = 'all' | 'unread' | InboxMessage['kind'];

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'board', label: 'Board' },
  { value: 'agent', label: 'Agents' },
  { value: 'press', label: 'Press' },
  { value: 'scout', label: 'Scouts' },
  { value: 'studio', label: 'Studio' },
  { value: 'finance', label: 'Money' },
];

export function InboxScreen({ onRespond }: { onRespond: () => void }) {
  const { game, update, openActor } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useMemo(
    () => game.inbox.filter((m) => (filter === 'all' ? true : filter === 'unread' ? !m.read : m.kind === filter)),
    [game.inbox, filter],
  );
  const open = game.inbox.find((m) => m.id === openId) ?? null;
  const pendingIds = new Set(game.decisions.map((d) => d.id));

  const select = (m: InboxMessage) => {
    setOpenId(m.id);
    if (!m.read) update((s) => markRead(s, m.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="h-poster text-2xl text-gold">Inbox</h1>
        <button className="btn-ghost" onClick={() => update((s) => markRead(s, 'all'))}>
          Mark all read
        </button>
      </div>
      <Segmented size="sm" value={filter} onChange={setFilter} options={FILTERS} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Panel title={`${list.length} messages`} bodyClass="p-0">
          {list.length === 0 ? (
            <div className="p-4">
              <Empty>Nothing in this folder.</Empty>
            </div>
          ) : (
            <ul className="scroll-thin max-h-[65vh] divide-y divide-line-soft overflow-y-auto">
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => select(m)}
                    className={`flex min-h-[56px] w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gold/5 ${openId === m.id ? 'bg-gold/10' : ''}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.read ? 'bg-transparent' : 'bg-gold'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${m.read ? 'text-cream-dim' : 'font-semibold text-cream'}`}>{m.subject}</span>
                      <span className="flex gap-2 font-cond text-xs uppercase tracking-wider text-cream-mute">
                        <span className="truncate">{m.from}</span>
                        <span className="ml-auto shrink-0">{weekLabel(m.abs)}</span>
                      </span>
                    </span>
                    {m.decisionId && pendingIds.has(m.decisionId) && <span className="chip shrink-0 border-gold text-gold">Action</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={open ? open.subject : 'Message'}>
          {open ? (
            <article>
              <div className="font-cond text-sm uppercase tracking-wider text-cream-mute">
                From {open.from} &middot; {weekLabel(open.abs)}
              </div>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-cream-dim">{open.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {open.decisionId && pendingIds.has(open.decisionId) && (
                  <button className="btn-gold" onClick={onRespond}>
                    Respond
                  </button>
                )}
                {open.actorId && game.actors[open.actorId] && (
                  <button className="btn-ghost" onClick={() => openActor(open.actorId!)}>
                    View profile
                  </button>
                )}
              </div>
            </article>
          ) : (
            <Empty>Select a message to read it.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}
