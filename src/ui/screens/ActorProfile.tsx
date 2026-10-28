import { useState } from 'react';
import {
  GENRES,
  REGIONS,
  ROLE_LABEL,
  absWeek,
  askingSalary,
  bestSkill,
  feeAsk,
  fmtMoney,
  fullName,
  interested,
  makeOffer,
  marketValue,
  overall,
  preferredYears,
  releaseActor,
  releaseCost,
  specialty,
  toggleRest,
  toggleTransferList,
  wantsTopBilling,
  type Actor,
  type OfferResult,
} from '../../sim';
import { useGame } from '../../state/GameContext';
import { Face } from '../Face';
import { SKILL_LABEL, STATUS_COLOR, actorStatus, genreLabel } from '../format';
import { Bar, DataTable, Meter, Modal, Money, Segmented, moodColor } from '../kit';
import { AssignScout } from './Talent';

export function ActorProfile({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const { game, update } = useGame();
  const a = game.actors[actorId];
  const [negotiate, setNegotiate] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [tab, setTab] = useState<'overview' | 'career'>('overview');
  if (!a) return null;
  const mine = a.studioId === game.playerId;
  const studio = game.studios.find((s) => s.id === a.studioId);
  const status = actorStatus(game, a);
  const resting = game.training.resting.includes(a.id);
  const potKnown = a.scouted;
  const blocked = a.blockedUntil > absWeek(game);

  return (
    <Modal open onClose={onClose} wide title={fullName(a)}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center text-center md:items-stretch md:text-left">
          <div className="mx-auto overflow-hidden rounded-xl border-4 border-gold/70 shadow-glow">
            <Face face={a.face} size={168} title={fullName(a)} />
          </div>
          <div className="mt-3 font-display text-2xl text-gold">{fullName(a)}</div>
          <div className="font-cond text-sm uppercase tracking-wider text-cream-mute">
            {a.age} yrs &middot; {SKILL_LABEL[specialty(a)]} specialist &middot; {REGIONS[a.region].name}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1 md:justify-start">
            <span className="chip" style={{ color: STATUS_COLOR[status] }}>
              {status}
            </span>
            <span className="chip">{studio ? studio.name : 'Free agent'}</span>
            {a.topBilling && <span className="chip text-gold">&#9733; Top billing</span>}
            {a.discovered && <span className="chip text-teal-soft">Scout find</span>}
          </div>
          <dl className="mt-4 grid w-full grid-cols-2 gap-x-3 gap-y-2 text-left text-sm">
            <dt className="label self-center">Overall</dt>
            <dd className="tabular font-poster text-lg">{overall(a).toFixed(1)}</dd>
            <dt className="label self-center">Potential</dt>
            <dd className="tabular font-poster text-lg text-gold">{potKnown ? Math.round(a.potential) : '?'}</dd>
            <dt className="label self-center">Salary</dt>
            <dd>{studio ? <Money value={a.salary} digits={2} /> : '—'}</dd>
            <dt className="label self-center">Contract</dt>
            <dd>{studio ? `to end of S${a.contractEnd}` : '—'}</dd>
            <dt className="label self-center">Value</dt>
            <dd>
              <Money value={marketValue(a, game.season)} />
            </dd>
          </dl>
        </div>

        <div className="min-w-0">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'overview', label: 'Attributes' },
              { value: 'career', label: `Career (${a.history.length})` },
            ]}
          />
          {tab === 'overview' ? (
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="label">Acting</div>
                <Bar label="Drama" value={a.drama} />
                <Bar label="Comedy" value={a.comedy} />
                <Bar label="Action" value={a.action} />
                <Bar label="Charisma" value={a.charisma} />
                <div className="label pt-2">Personality</div>
                <Bar label="Star power" value={a.starPower} />
                <Bar label="Reliability" value={a.reliability} />
                <Bar label="Ego" value={a.ego} color={a.ego >= 14 ? '#e0563f' : a.ego >= 10 ? '#e0a35a' : '#8bc172'} hint="High ego clashes with co-stars." />
                {potKnown && (
                  <p className="pt-1 font-cond text-xs uppercase tracking-wider text-cream-mute">
                    Ceiling {Math.round(a.potential)} &middot; {a.potential - bestSkill(a) > 3 && a.age < 28 ? 'plenty of room to grow' : 'near their peak'}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="label">Morale</span>
                    <span className="tabular font-cond" style={{ color: moodColor(a.morale) }}>
                      {Math.round(a.morale)}
                    </span>
                  </div>
                  <Meter value={a.morale} color={moodColor(a.morale)} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="label">Form</span>
                    <span className="tabular font-cond" style={{ color: moodColor(a.form) }}>
                      {Math.round(a.form)}
                    </span>
                  </div>
                  <Meter value={a.form} color={moodColor(a.form)} />
                </div>
                <div className="label pt-1">Genre reputation</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {GENRES.map((g) => (
                    <div key={g}>
                      <div className="flex justify-between font-cond text-xs uppercase tracking-wider text-cream-dim">
                        <span>{genreLabel(g)}</span>
                        <span className="tabular">{Math.round(a.genreRep[g])}</span>
                      </div>
                      <Meter value={a.genreRep[g]} color="#3fa7a0" />
                    </div>
                  ))}
                </div>
                {a.awards.length > 0 && (
                  <div>
                    <div className="label pt-1">Lantern record</div>
                    <ul className="mt-1 space-y-1 text-sm">
                      {a.awards.slice(-6).map((w, i) => (
                        <li key={i} className={w.won ? 'text-gold' : 'text-cream-dim'}>
                          {w.won ? '★ Won' : '• Nominated'} {w.category}, S{w.season} &ldquo;{w.title}&rdquo;
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <DataTable
                rows={a.history.slice().reverse()}
                rowKey={(h) => h.filmId + h.role}
                empty="No credits yet."
                dense
                columns={[
                  { key: 's', label: 'Season', sort: (h) => h.season, render: (h) => `S${h.season}` },
                  { key: 't', label: 'Film', sort: (h) => h.title, render: (h) => <span className="block max-w-[180px] truncate">{h.title}</span> },
                  { key: 'r', label: 'Role', render: (h) => ROLE_LABEL[h.role] },
                  { key: 'st', label: 'Studio', render: (h) => <span className="block max-w-[120px] truncate">{h.studioName}</span>, hideBelow: 'sm' },
                  { key: 'c', label: 'Critics', align: 'right', sort: (h) => h.critics, render: (h) => h.critics },
                  { key: 'g', label: 'Gross', align: 'right', sort: (h) => h.gross, render: (h) => <Money value={h.gross} /> },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        {mine ? (
          <>
            <button className="btn-gold" onClick={() => setNegotiate(true)} disabled={a.wantsToLeave}>
              Renew contract
            </button>
            <button className="btn-ghost" onClick={() => update((s) => toggleRest(s, a.id))} disabled={!!a.filmId}>
              {resting ? 'Back to training' : 'Excuse from training'}
            </button>
            <button className="btn-ghost" onClick={() => update((s) => toggleTransferList(s, a.id))}>
              {a.transferListed ? 'Remove from transfer list' : 'Transfer list'}
            </button>
            {confirmRelease ? (
              <button
                className="btn-danger"
                onClick={() => {
                  update((s) => releaseActor(s, a.id));
                  onClose();
                }}
              >
                Confirm release ({fmtMoney(releaseCost(game, a))} payoff)
              </button>
            ) : (
              <button className="btn-danger" disabled={!!a.filmId} onClick={() => setConfirmRelease(true)}>
                Release
              </button>
            )}
          </>
        ) : (
          <>
            <button className="btn-gold" disabled={blocked || !!(a.filmId && a.studioId)} onClick={() => setNegotiate(true)}>
              {studio ? 'Make a bid' : 'Offer contract'}
            </button>
            {blocked && <span className="self-center text-sm text-cream-mute">Not talking to you until {Math.ceil(a.blockedUntil - absWeek(game))} more week(s) pass.</span>}
            {!interested(game, a) && !blocked && <span className="self-center text-sm text-ember">Thinks your studio is too small for them.</span>}
          </>
        )}
        {!a.scouted && <AssignScout actorId={a.id} />}
      </div>
      {negotiate && <Negotiation actor={a} onClose={() => setNegotiate(false)} />}
    </Modal>
  );
}

function Negotiation({ actor: a, onClose }: { actor: Actor; onClose: () => void }) {
  const { game, update, toast } = useGame();
  const mine = a.studioId === game.playerId;
  const poach = !!a.studioId && !mine;
  const [years, setYears] = useState(preferredYears(a));
  const [billing, setBilling] = useState(wantsTopBilling(a));
  const [salary, setSalary] = useState(() => Math.round(askingSalary(game, a, preferredYears(a), wantsTopBilling(a)) * 0.9 * 20) / 20);
  const [fee, setFee] = useState(() => (poach ? Math.round(feeAsk(game, a) * 0.9 * 10) / 10 : 0));
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<OfferResult | null>(null);
  const done = result?.outcome === 'accepted' || (result?.outcome === 'rejected' && result.walkAway);
  const owner = game.studios.find((s) => s.id === a.studioId);

  const submit = () => {
    const offer = { actorId: a.id, salary, years, topBilling: billing, fee };
    const res = makeOffer(game, offer, round);
    setResult(res.result);
    if (res.result.outcome === 'counter') {
      if (res.result.counterSalary) setSalary(res.result.counterSalary);
      if (res.result.counterFee) setFee(res.result.counterFee);
      setRound((r) => r + 1);
    } else {
      update(() => res.state);
      if (res.result.outcome === 'accepted') toast(res.result.message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${mine ? 'Renew' : poach ? 'Bid for' : 'Sign'} ${fullName(a)}`}
      footer={
        done ? (
          <button className="btn-gold" onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button className="btn-ghost" onClick={onClose}>
              Walk away
            </button>
            <button className="btn-gold" onClick={submit}>
              {round ? 'Revised offer' : 'Submit offer'}
            </button>
          </>
        )
      }
    >
      <div className="flex items-center gap-3">
        <Face face={a.face} size={56} />
        <div className="text-sm text-cream-dim">
          {a.age} yrs &middot; overall {overall(a).toFixed(1)} &middot; star power {Math.round(a.starPower)}
          <br />
          Prefers {preferredYears(a)}-season deals{wantsTopBilling(a) ? ' and expects top billing' : ''}.
        </div>
      </div>
      {poach && owner && (
        <div className="mt-4">
          <div className="label">Buyout fee to {owner.name}</div>
          <Stepper value={fee} onChange={setFee} step={0.5} format={(v) => fmtMoney(v)} min={0} />
          <p className="mt-1 text-xs text-cream-mute">You have {fmtMoney(game.studios.find((s) => s.isPlayer)!.cash)} available.</p>
        </div>
      )}
      <div className="mt-4">
        <div className="label">Salary per season</div>
        <Stepper value={salary} onChange={setSalary} step={salary >= 2 ? 0.25 : 0.05} format={(v) => fmtMoney(v, 2)} min={0.05} />
      </div>
      <div className="mt-4">
        <div className="label">Contract length</div>
        <Segmented
          className="mt-1"
          value={years}
          onChange={setYears}
          options={[1, 2, 3, 4, 5].map((y) => ({ value: y, label: `${y} yr` }))}
        />
      </div>
      <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-line bg-ink px-3">
        <input type="checkbox" className="h-5 w-5 accent-[#f2c14e]" checked={billing} onChange={(e) => setBilling(e.target.checked)} />
        <span>
          Top billing <span className="text-xs text-cream-mute">(cheaper for big egos, but raises Ego by 2)</span>
        </span>
      </label>
      {result && (
        <div
          role="status"
          className={`mt-4 rounded-lg border p-3 ${
            result.outcome === 'accepted' ? 'border-leaf bg-leaf/10 text-leaf' : result.outcome === 'counter' ? 'border-gold bg-gold/10 text-gold' : 'border-rouge bg-rouge/10 text-rouge-soft'
          }`}
        >
          <div className="h-poster text-sm">{result.outcome === 'counter' ? 'Counter-offer' : result.outcome}</div>
          <p className="mt-1 text-sm text-cream">{result.message}</p>
          {result.outcome === 'counter' && <p className="mt-1 text-xs text-cream-mute">The terms above now show their demand. Round {round} of 3.</p>}
        </div>
      )}
      {!result && <p className="mt-4 text-xs text-cream-mute">Agents counter up to three times. Lowball too hard and they walk away for two months.</p>}
    </Modal>
  );
}

function Stepper({ value, onChange, step, format, min = 0 }: { value: number; onChange: (v: number) => void; step: number; format: (v: number) => string; min?: number }) {
  const set = (v: number) => onChange(Math.max(min, Math.round(v * 100) / 100));
  return (
    <div className="mt-1 flex items-center gap-2">
      <button className="btn-ghost w-12 !px-0 text-lg" aria-label="Less" onClick={() => set(value - step * 4)}>
        &laquo;
      </button>
      <button className="btn-ghost w-12 !px-0 text-lg" aria-label="Decrease" onClick={() => set(value - step)}>
        &minus;
      </button>
      <div className="tabular min-w-0 flex-1 rounded-lg border border-line bg-ink py-2 text-center font-poster text-xl">{format(value)}</div>
      <button className="btn-ghost w-12 !px-0 text-lg" aria-label="Increase" onClick={() => set(value + step)}>
        +
      </button>
      <button className="btn-ghost w-12 !px-0 text-lg" aria-label="More" onClick={() => set(value + step * 4)}>
        &raquo;
      </button>
    </div>
  );
}
