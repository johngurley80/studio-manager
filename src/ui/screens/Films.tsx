import { useMemo, useState } from 'react';
import {
  GENRES,
  MARKETING,
  MAX_PRODUCTIONS,
  ROLE_LABEL,
  STYLES,
  SUPPORT_SLOTS,
  TIERS,
  TIER_ORDER,
  absToSeasonWeek,
  absWeek,
  autoCast,
  availableDirectors,
  availableRoster,
  bankruptcyLine,
  bestReleaseWeek,
  blendDemands,
  castPairs,
  competitionFactor,
  crowding,
  directorScore,
  estimateGross,
  evaluateExisting,
  filmChemistry,
  filmHype,
  fmtMoney,
  fullName,
  genreFit,
  greenlight,
  greenlightError,
  hashString,
  hypeScore,
  playerStudio,
  predictionFuzz,
  previewFilm,
  rolePerformance,
  seasonality,
  setRelease,
  upfrontCost,
  type BudgetTier,
  type CastSlot,
  type Film,
  type Genre,
  type Role,
  type Script,
} from '../../sim';
import { useGame } from '../../state/GameContext';
import { Face } from '../Face';
import { genreLabel, seasonPhase, weekLabel } from '../format';
import { AttrNum, DataTable, Empty, Meter, Modal, Money, Panel, Segmented, Stars, StudioDot, Tabs, moodColor } from '../kit';
import { Poster } from '../Poster';

type Tab = 'slate' | 'new' | 'catalogue';

export function FilmsScreen() {
  const { game } = useGame();
  const [tab, setTab] = useState<Tab>('slate');
  const [detail, setDetail] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const me = playerStudio(game);
  const mine = Object.values(game.films).filter((f) => f.studioId === me.id);
  const active = mine.filter((f) => f.status === 'production').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="h-poster text-2xl text-gold">Films</h1>
          <p className="text-sm text-cream-mute">
            {active}/{MAX_PRODUCTIONS} sound stages in use. Greenlight a picture, shoot it, then choose its opening weekend.
          </p>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'slate', label: 'Slate' },
          { id: 'new', label: '+ Greenlight' },
          { id: 'catalogue', label: `Back catalogue (${mine.filter((f) => f.status === 'finished').length})` },
        ]}
      />
      {tab === 'slate' && <Slate films={mine} onDetail={setDetail} onSchedule={setScheduling} onNew={() => setTab('new')} />}
      {tab === 'new' &&
        (active >= MAX_PRODUCTIONS ? (
          <Empty>All three sound stages are busy. Wait for a shoot to wrap.</Empty>
        ) : (
          <Greenlight onDone={() => setTab('slate')} />
        ))}
      {tab === 'catalogue' && <Catalogue films={mine.filter((f) => f.status === 'finished')} onDetail={setDetail} />}
      {detail && <FilmDetail filmId={detail} onClose={() => setDetail(null)} />}
      {scheduling && <ReleasePlanner filmId={scheduling} onClose={() => setScheduling(null)} />}
    </div>
  );
}

function Slate({ films, onDetail, onSchedule, onNew }: { films: Film[]; onDetail: (id: string) => void; onSchedule: (id: string) => void; onNew: () => void }) {
  const { game } = useGame();
  const abs = absWeek(game);
  const ready = films.filter((f) => f.status === 'post');
  const shooting = films.filter((f) => f.status === 'production');
  const scheduled = films.filter((f) => f.status === 'scheduled').sort((a, b) => a.releaseAbs! - b.releaseAbs!);
  const showing = films.filter((f) => f.status === 'released');
  if (!ready.length && !shooting.length && !scheduled.length && !showing.length)
    return (
      <Empty>
        Nothing on the slate.{' '}
        <button className="btn-gold ml-2" onClick={onNew}>
          Greenlight a film
        </button>
      </Empty>
    );
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {ready.length > 0 && (
        <Panel title="Ready to release" className="border-gold/60 lg:col-span-2">
          <ul className="space-y-2">
            {ready.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-ink p-3">
                <Poster title={f.title} genre={f.genre} width={44} />
                <button className="min-w-0 flex-1 text-left" onClick={() => onDetail(f.id)}>
                  <div className="truncate font-poster uppercase tracking-wide">{f.title}</div>
                  <div className="font-cond text-xs uppercase tracking-wider text-cream-mute">
                    {TIERS[f.tier].label} {genreLabel(f.genre)} &middot; wrapped
                  </div>
                </button>
                <button className="btn-gold" onClick={() => onSchedule(f.id)}>
                  Pick release date
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel title="Shooting">
        {shooting.length === 0 ? (
          <Empty>No cameras rolling.</Empty>
        ) : (
          <ul className="space-y-3">
            {shooting.map((f) => (
              <li key={f.id}>
                <button className="w-full rounded-lg border border-line bg-ink p-3 text-left hover:border-gold/50" onClick={() => onDetail(f.id)}>
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-poster uppercase tracking-wide">{f.title}</span>
                    <span className="font-cond text-sm text-cream-mute">{f.weeksLeft}w left</span>
                  </div>
                  <Meter className="mt-2" value={f.productionWeeks - f.weeksLeft} max={f.productionWeeks} color="#3fa7a0" />
                  <div className="mt-1 truncate text-xs text-cream-mute">{f.log[f.log.length - 1]}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Release schedule">
        {scheduled.length === 0 ? (
          <Empty>No dates set.</Empty>
        ) : (
          <ul className="space-y-2">
            {scheduled.map((f) => (
              <li key={f.id}>
                <button className="flex w-full items-center gap-3 rounded-lg border border-line bg-ink p-3 text-left hover:border-gold/50" onClick={() => onDetail(f.id)}>
                  <span className="min-w-0 flex-1 truncate font-poster uppercase tracking-wide">{f.title}</span>
                  <span className="chip text-teal-soft">{weekLabel(f.releaseAbs!)}</span>
                  <span className="font-cond text-sm text-cream-mute">{f.releaseAbs! - abs > 0 ? `in ${f.releaseAbs! - abs}w` : "this week"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="In cinemas" className="lg:col-span-2" bodyClass="p-3">
        <DataTable
          rows={showing}
          rowKey={(f) => f.id}
          onRow={(f) => onDetail(f.id)}
          empty="Nothing in cinemas right now."
          columns={[
            { key: 't', label: 'Title', sort: (f) => f.title, render: (f) => <span className="block max-w-[200px] truncate font-semibold">{f.title}</span> },
            { key: 'w', label: 'Week', sort: (f) => f.weeksInRelease, align: 'right', render: (f) => f.weeksInRelease },
            { key: 'c', label: 'Critics', sort: (f) => f.critics ?? 0, align: 'right', render: (f) => <Score v={f.critics} /> },
            { key: 'a', label: 'Audience', sort: (f) => f.audience ?? 0, align: 'right', render: (f) => <Score v={f.audience} /> },
            { key: 'l', label: 'Last week', sort: (f) => f.lastWeekGross, align: 'right', render: (f) => <Money value={f.lastWeekGross} /> },
            { key: 'g', label: 'Total', sort: (f) => f.gross, align: 'right', render: (f) => <Money value={f.gross} /> },
          ]}
        />
      </Panel>
    </div>
  );
}

export function Score({ v }: { v: number | null }) {
  if (v === null) return <span className="text-cream-mute">&mdash;</span>;
  return (
    <span className="tabular font-cond font-bold" style={{ color: v >= 75 ? '#f2c14e' : v >= 60 ? '#8bc172' : v >= 45 ? '#e0a35a' : '#e0563f' }}>
      {v}
    </span>
  );
}

function Catalogue({ films, onDetail }: { films: Film[]; onDetail: (id: string) => void }) {
  return (
    <Panel bodyClass="p-3">
      <DataTable
        rows={films}
        rowKey={(f) => f.id}
        onRow={(f) => onDetail(f.id)}
        initialSort={{ key: 's', dir: 'desc' }}
        empty="No finished films yet."
        columns={[
          { key: 's', label: 'Season', sort: (f) => f.releaseAbs ?? 0, render: (f) => (f.releaseAbs ? weekLabel(f.releaseAbs) : '') },
          { key: 't', label: 'Title', sort: (f) => f.title, render: (f) => <span className="block max-w-[200px] truncate font-semibold">{f.title}</span> },
          { key: 'g', label: 'Genre', sort: (f) => f.genre, render: (f) => genreLabel(f.genre), hideBelow: 'sm' },
          { key: 'b', label: 'Budget', sort: (f) => f.budget, align: 'right', render: (f) => <Money value={f.budget} />, hideBelow: 'sm' },
          { key: 'c', label: 'Critics', sort: (f) => f.critics ?? 0, align: 'right', render: (f) => <Score v={f.critics} /> },
          { key: 'a', label: 'Aud.', sort: (f) => f.audience ?? 0, align: 'right', render: (f) => <Score v={f.audience} /> },
          { key: 'r', label: 'Open', title: 'Opening weekend rank', sort: (f) => -f.weekendRank, align: 'right', render: (f) => `#${f.weekendRank}` },
          { key: 'gr', label: 'Gross', sort: (f) => f.gross, align: 'right', render: (f) => <Money value={f.gross} /> },
          {
            key: 'p',
            label: 'Profit',
            title: 'Rentals (50% of gross) + streaming - production and marketing',
            sort: (f) => f.gross * 0.5 + f.streaming - f.spent,
            align: 'right',
            render: (f) => <Money value={f.gross * 0.5 + f.streaming - f.spent} signed />,
          },
        ]}
      />
    </Panel>
  );
}

/* ------------------------------- greenlight ------------------------------- */

const STEPS = ['Script', 'Genre & budget', 'Director', 'Cast', 'Wrap up'] as const;

function Greenlight({ onDone }: { onDone: () => void }) {
  const { game, update, toast } = useGame();
  const me = playerStudio(game);
  const [step, setStep] = useState(0);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [genre, setGenre] = useState<Genre>('Drama');
  const [tier, setTier] = useState<BudgetTier>('low');
  const [directorId, setDirectorId] = useState<string | null>(null);
  const [cast, setCast] = useState<CastSlot[]>([]);
  const [title, setTitle] = useState('');
  const script = game.scripts.find((s) => s.id === scriptId) ?? null;
  const director = directorId ? game.directors[directorId] : null;

  const params = script && directorId ? { title: title || script.title, genre, tier, script, directorId, cast } : null;
  const err = params ? greenlightError(game, params) : 'Pick a script and a director.';

  const pickScript = (s: Script) => {
    setScriptId(s.id);
    setGenre(s.genre);
    setTitle(s.title);
    setStep(1);
  };

  const go = () => {
    if (!params || err) return;
    update((s) => greenlight(s, params));
    toast(`"${params.title}" is greenlit. Cameras roll next week.`);
    onDone();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-3">
        <ol className="scroll-thin flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                onClick={() => (i === 0 || script ? setStep(i) : null)}
                disabled={i > 0 && !script}
                aria-current={step === i ? 'step' : undefined}
                className={`flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-lg border px-3 font-cond text-sm font-bold uppercase tracking-wider ${
                  step === i ? 'border-gold bg-gold text-ink' : 'border-line bg-ink-2 text-cream-dim disabled:opacity-40'
                }`}
              >
                <span className="tabular">{i + 1}</span>
                {s}
              </button>
            </li>
          ))}
        </ol>
        {step === 0 && <ScriptStep selected={scriptId} onPick={pickScript} />}
        {step === 1 && script && <GenreStep script={script} genre={genre} tier={tier} setGenre={setGenre} setTier={setTier} onNext={() => setStep(2)} />}
        {step === 2 && (
          <DirectorStep
            genre={genre}
            tier={tier}
            selected={directorId}
            onPick={(id) => {
              setDirectorId(id);
              setStep(3);
            }}
          />
        )}
        {step === 3 && script && (
          <CastStep genre={genre} script={script} directorId={directorId} cast={cast} setCast={setCast} onNext={() => setStep(4)} />
        )}
        {step === 4 && script && (
          <Panel title="Wrap up">
            <label className="label" htmlFor="film-title">
              Release title
            </label>
            <input id="film-title" className="input mt-1" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-cream-mute">Production budget</dt>
              <dd className="text-right">
                <Money value={TIERS[tier].budget} />
              </dd>
              <dt className="text-cream-mute">Script rights</dt>
              <dd className="text-right">
                <Money value={script.price} digits={2} />
              </dd>
              <dt className="text-cream-mute">Director fee</dt>
              <dd className="text-right">{director ? <Money value={director.fee} digits={2} /> : '—'}</dd>
              <dt className="text-cream-mute">Due today</dt>
              <dd className="text-right font-bold text-gold">
                <Money value={upfrontCost({ tier, scriptPrice: script.price, directorFee: director?.fee ?? 0 })} />
              </dd>
              <dt className="text-cream-mute">Shoot</dt>
              <dd className="text-right">
                {TIERS[tier].weeks[0]}&ndash;{TIERS[tier].weeks[1]} weeks
              </dd>
              <dt className="text-cream-mute">Cash after shoot (approx.)</dt>
              <dd className="text-right">
                <Money value={me.cash - TIERS[tier].budget - script.price - (director?.fee ?? 0)} signed />
              </dd>
            </dl>
            <p className="mt-3 text-xs text-cream-mute">20% of the budget is paid today, the rest week by week while shooting. Marketing is paid when you set a release date.</p>
            {me.cash - TIERS[tier].budget - script.price - (director?.fee ?? 0) < 0 && (
              <p className="mt-3 rounded-lg border border-ember/70 bg-ember/10 p-2 text-sm text-ember">
                This shoot will put the studio in the red before the film earns anything. The bank closes you down at {fmtMoney(bankruptcyLine(game))}, or after ten
                weeks overdrawn. Check the films already shooting, or take a loan first.
              </p>
            )}
            {err && <p className="mt-3 rounded-lg border border-rouge/60 bg-rouge/10 p-2 text-sm text-rouge-soft">{err}</p>}
            <button className="btn-gold mt-4 w-full text-base" disabled={!!err} onClick={go}>
              Greenlight &ldquo;{title || script.title}&rdquo;
            </button>
          </Panel>
        )}
      </div>
      <Prediction genre={genre} tier={tier} script={script} directorId={directorId} cast={cast} />
    </div>
  );
}

function ScriptStep({ selected, onPick }: { selected: string | null; onPick: (s: Script) => void }) {
  const { game } = useGame();
  const abs = absWeek(game);
  const [g, setG] = useState<'all' | Genre>('all');
  const list = game.scripts.filter((s) => g === 'all' || s.genre === g).sort((a, b) => b.quality - a.quality);
  return (
    <Panel title="Spec scripts on the market" bodyClass="p-3 space-y-3">
      <select className="input" value={g} onChange={(e) => setG(e.target.value as Genre | 'all')} aria-label="Filter scripts by genre">
        <option value="all">All genres</option>
        {GENRES.map((x) => (
          <option key={x} value={x}>
            {genreLabel(x)}
          </option>
        ))}
      </select>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {list.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => onPick(s)}
              className={`flex h-full w-full flex-col rounded-lg border p-3 text-left transition-colors hover:border-gold ${selected === s.id ? 'border-gold bg-gold/10' : 'border-line bg-ink'}`}
            >
              <div className="flex w-full items-start gap-2">
                <span className="min-w-0 flex-1 font-poster uppercase leading-tight tracking-wide">{s.title}</span>
                <span className="chip shrink-0">{genreLabel(s.genre)}</span>
              </div>
              <p className="mt-1 text-sm text-cream-dim">{s.logline}</p>
              <div className="mt-auto flex w-full items-center gap-2 pt-2 font-cond text-sm">
                <Stars value={s.quality / 20} />
                <span className="tabular text-cream-mute">{s.quality}</span>
                <span className="ml-auto">
                  <Money value={s.price} digits={2} />
                </span>
              </div>
              <div className="font-cond text-[11px] uppercase tracking-wider text-cream-mute">
                by {s.writer} &middot; off the market in {s.expiresAbs - abs}w
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function GenreStep({
  script,
  genre,
  tier,
  setGenre,
  setTier,
  onNext,
}: {
  script: Script;
  genre: Genre;
  tier: BudgetTier;
  setGenre: (g: Genre) => void;
  setTier: (t: BudgetTier) => void;
  onNext: () => void;
}) {
  const { game } = useGame();
  const me = playerStudio(game);
  return (
    <Panel title="Genre & budget">
      <div className="label">Pitch it as&hellip;</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GENRES.map((g) => {
          const fit = Math.round(genreFit(script.genre, g) * 100);
          return (
            <button
              key={g}
              onClick={() => setGenre(g)}
              aria-pressed={genre === g}
              className={`min-h-[52px] rounded-lg border px-2 py-1.5 text-left ${genre === g ? 'border-gold bg-gold/10' : 'border-line bg-ink hover:border-gold/50'}`}
            >
              <div className="font-poster text-sm uppercase">{genreLabel(g)}</div>
              <div className="font-cond text-xs uppercase tracking-wider" style={{ color: fit === 100 ? '#8bc172' : fit > 70 ? '#f2c14e' : '#e0563f' }}>
                Script fit {fit}%
              </div>
            </button>
          );
        })}
      </div>
      <div className="label mt-5">Budget tier</div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
        {TIER_ORDER.map((t) => {
          const info = TIERS[t];
          const up = upfrontCost({ tier: t, scriptPrice: script.price, directorFee: 0 });
          const afford = me.cash >= up;
          return (
            <button
              key={t}
              onClick={() => setTier(t)}
              aria-pressed={tier === t}
              className={`min-h-[52px] rounded-lg border p-2 text-left ${tier === t ? 'border-gold bg-gold/10' : 'border-line bg-ink hover:border-gold/50'} ${afford ? '' : 'opacity-50'}`}
            >
              <div className="font-poster uppercase">{info.label}</div>
              <div className="font-cond text-lg text-gold">{fmtMoney(info.budget, 0)}</div>
              <div className="font-cond text-[11px] uppercase tracking-wider text-cream-mute">
                {info.weeks[0]}&ndash;{info.weeks[1]} wks &middot; polish {info.production}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-cream-mute">
        Bigger budgets buy production polish and a wider release, but need bigger audiences to pay off. Horror looks fine on a shoestring.
      </p>
      <button className="btn-gold mt-4" onClick={onNext}>
        Next: director
      </button>
    </Panel>
  );
}

function DirectorStep({ genre, tier, selected, onPick }: { genre: Genre; tier: BudgetTier; selected: string | null; onPick: (id: string) => void }) {
  const { game } = useGame();
  const dirs = availableDirectors(game);
  return (
    <Panel title={`Directors available (${dirs.length})`} bodyClass="p-3">
      <DataTable
        rows={dirs}
        rowKey={(d) => d.id}
        onRow={(d) => onPick(d.id)}
        initialSort={{ key: 'fit', dir: 'desc' }}
        rowClass={(d) => (d.id === selected ? 'bg-gold/10' : '')}
        columns={[
          {
            key: 'n',
            label: 'Director',
            sort: (d) => d.last,
            render: (d) => (
              <span className="flex items-center gap-2">
                <Face face={d.face} size={30} />
                <span className="max-w-[140px] truncate font-semibold">{fullName(d)}</span>
              </span>
            ),
          },
          {
            key: 'st',
            label: 'Style',
            sort: (d) => d.style,
            render: (d) => (
              <span title={STYLES[d.style].blurb} className="font-cond uppercase tracking-wider text-cream-dim">
                {d.style}
              </span>
            ),
          },
          { key: 'sk', label: 'Skill', sort: (d) => d.skill, align: 'right', render: (d) => <AttrNum v={d.skill} /> },
          { key: 'rel', label: 'Rel', title: 'Reliability: fewer overruns', sort: (d) => d.reliability, align: 'right', render: (d) => <AttrNum v={d.reliability} />, hideBelow: 'sm' },
          { key: 'sp', label: 'Specialties', render: (d) => <span className="text-cream-dim">{d.specialties.map(genreLabel).join(', ')}</span>, hideBelow: 'md' },
          {
            key: 'fit',
            label: 'Fit',
            title: `How well they suit a ${genreLabel(genre)}`,
            sort: (d) => directorScore(d, genre),
            align: 'right',
            render: (d) => <Score v={Math.round(directorScore(d, genre))} />,
          },
          {
            key: 'fee',
            label: 'Fee',
            sort: (d) => d.fee,
            align: 'right',
            render: (d) => <Money value={d.fee} digits={2} className={d.fee > TIERS[tier].budget * 0.15 ? 'text-ember' : ''} />,
          },
        ]}
      />
    </Panel>
  );
}

const SLOT_ROLES: Role[] = ['lead', 'colead', ...Array.from({ length: SUPPORT_SLOTS }, () => 'support' as Role)];

function CastStep({
  genre,
  script,
  directorId,
  cast,
  setCast,
  onNext,
}: {
  genre: Genre;
  script: Script;
  directorId: string | null;
  cast: CastSlot[];
  setCast: (c: CastSlot[]) => void;
  onNext: () => void;
}) {
  const { game } = useGame();
  const director = directorId ? game.directors[directorId] : null;
  const demands = blendDemands(script.demands, genre);
  const [picking, setPicking] = useState<number | null>(null);
  // slot index -> actor
  const slots = SLOT_ROLES.map((role, i) => {
    const sameRole = cast.filter((c) => c.role === role);
    const idx = role === 'support' ? i - 2 : 0;
    return sameRole[idx] ?? null;
  });
  const setSlot = (i: number, actorId: string | null) => {
    const next: (CastSlot | null)[] = slots.slice();
    next[i] = actorId ? { actorId, role: SLOT_ROLES[i] } : null;
    // an actor can only fill one slot
    if (actorId) next.forEach((s, j) => j !== i && s?.actorId === actorId && (next[j] = null));
    setCast(next.filter((s): s is CastSlot => s !== null));
  };
  const pairs = useMemo(() => castPairs(cast, game.actors).sort((a, b) => b.weight - a.weight || a.value - b.value), [cast, game.actors]);
  const chem = cast.length > 1 ? filmChemistry(cast, game.actors) : null;
  const pool = availableRoster(game, game.playerId);

  return (
    <Panel
      title="Casting"
      action={
        <div className="flex gap-2">
          <button className="btn-ghost !min-h-[36px] !px-3 !text-xs" onClick={() => setCast([])}>
            Clear
          </button>
          <button className="btn-gold !min-h-[36px] !px-3 !text-xs" onClick={() => setCast(autoCast(game, game.playerId, genre, demands, director, { chemistry: true }))}>
            Auto-cast
          </button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-cream-mute">
        This part needs{' '}
        <b className="text-cream">
          {Math.round(demands.drama * 100)}% drama, {Math.round(demands.comedy * 100)}% comedy, {Math.round(demands.action * 100)}% action
        </b>
        . {pool.length} actors are free to cast.
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SLOT_ROLES.map((role, i) => {
          const slot = slots[i];
          const a = slot ? game.actors[slot.actorId] : null;
          const fit = a ? rolePerformance(a, demands, genre, director) : null;
          return (
            <li key={i}>
              <button
                onClick={() => setPicking(i)}
                className={`flex min-h-[60px] w-full items-center gap-3 rounded-lg border p-2 text-left hover:border-gold ${a ? 'border-line bg-ink' : 'border-dashed border-line bg-transparent'}`}
              >
                {a ? <Face face={a.face} size={40} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-line text-cream-mute">+</span>}
                <span className="min-w-0 flex-1">
                  <span className="label block">
                    {ROLE_LABEL[role]}
                    {role === 'support' ? ` ${i - 1}` : ''}
                  </span>
                  <span className="block truncate">{a ? fullName(a) : <span className="text-cream-mute">{role === 'support' ? 'Optional' : 'Required'}</span>}</span>
                </span>
                {fit !== null && (
                  <span className="text-right">
                    <span className="label block">Fit</span>
                    <AttrNum v={fit} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="label">Chemistry</span>
          {chem !== null && (
            <span className="font-poster text-lg" style={{ color: moodColor(chem) }}>
              {Math.round(chem)}
            </span>
          )}
        </div>
        {chem !== null && <Meter value={chem} color={moodColor(chem)} className="mt-1 !h-3" />}
        {pairs.length === 0 ? (
          <p className="mt-2 text-sm text-cream-mute">Cast two or more actors to see how they get on.</p>
        ) : (
          <ul className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {pairs.slice(0, 10).map((p) => (
              <li key={p.a + p.b}>
                <div className="flex justify-between gap-2 text-xs">
                  <span className="truncate">
                    {game.actors[p.a].last} &times; {game.actors[p.b].last}
                    {p.weight >= 3 && <span className="ml-1 text-gold">(leads)</span>}
                  </span>
                  <span className="tabular font-cond" style={{ color: moodColor(p.value) }}>
                    {p.value}
                  </span>
                </div>
                <Meter value={p.value} color={moodColor(p.value)} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="btn-gold mt-5" onClick={onNext} disabled={!slots[0] || !slots[1]}>
        Next: wrap up
      </button>

      <Modal open={picking !== null} onClose={() => setPicking(null)} title={picking !== null ? `Cast the ${ROLE_LABEL[SLOT_ROLES[picking]].toLowerCase()}` : ''} wide>
        {picking !== null && (
          <>
            {slots[picking] && (
              <button
                className="btn-ghost mb-3"
                onClick={() => {
                  setSlot(picking, null);
                  setPicking(null);
                }}
              >
                Leave this role empty
              </button>
            )}
            <DataTable
              rows={pool}
              rowKey={(a) => a.id}
              initialSort={{ key: 'fit', dir: 'desc' }}
              onRow={(a) => {
                setSlot(picking, a.id);
                setPicking(null);
              }}
              rowClass={(a) => (cast.some((c) => c.actorId === a.id) ? 'opacity-60' : '')}
              columns={[
                {
                  key: 'n',
                  label: 'Actor',
                  sort: (a) => a.last,
                  render: (a) => (
                    <span className="flex items-center gap-2">
                      <Face face={a.face} size={30} />
                      <span className="max-w-[150px] truncate font-semibold">
                        {fullName(a)}
                        {cast.some((c) => c.actorId === a.id) && <span className="ml-1 text-xs text-gold">(cast)</span>}
                      </span>
                    </span>
                  ),
                },
                { key: 'fit', label: 'Fit', sort: (a) => rolePerformance(a, demands, genre, director), align: 'right', render: (a) => <AttrNum v={rolePerformance(a, demands, genre, director)} /> },
                { key: 'sp', label: 'Star', sort: (a) => a.starPower, align: 'right', render: (a) => <AttrNum v={a.starPower} /> },
                { key: 'ego', label: 'Ego', sort: (a) => a.ego, align: 'right', render: (a) => <AttrNum v={a.ego} invert /> },
                {
                  key: 'ch',
                  label: 'w/ lead',
                  title: 'Chemistry with your current lead',
                  sort: (a) => {
                    const lead = slots[0] ? game.actors[slots[0].actorId] : null;
                    return lead && lead.id !== a.id ? castPairs([{ actorId: lead.id, role: 'lead' }, { actorId: a.id, role: 'colead' }], game.actors)[0]?.value ?? 0 : 0;
                  },
                  align: 'right',
                  render: (a) => {
                    const lead = slots[0] ? game.actors[slots[0].actorId] : null;
                    if (!lead || lead.id === a.id) return <span className="text-cream-mute">&mdash;</span>;
                    const v = castPairs([{ actorId: lead.id, role: 'lead' }, { actorId: a.id, role: 'colead' }], game.actors)[0]?.value ?? 0;
                    return (
                      <span className="tabular font-cond" style={{ color: moodColor(v) }}>
                        {v}
                      </span>
                    );
                  },
                },
                { key: 'mor', label: 'Morale', sort: (a) => a.morale, align: 'right', render: (a) => <span style={{ color: moodColor(a.morale) }}>{Math.round(a.morale)}</span>, hideBelow: 'sm' },
                { key: 'gr', label: `${genreLabel(genre)} rep`, sort: (a) => a.genreRep[genre], align: 'right', render: (a) => Math.round(a.genreRep[genre]), hideBelow: 'sm' },
              ]}
            />
          </>
        )}
      </Modal>
    </Panel>
  );
}

function Prediction({ genre, tier, script, directorId, cast }: { genre: Genre; tier: BudgetTier; script: Script | null; directorId: string | null; cast: CastSlot[] }) {
  const { game } = useGame();
  const me = playerStudio(game);
  const q = previewFilm(game, { genre, tier, script, directorId, cast });
  const fuzz = predictionFuzz(game.staff.analystLevel);
  const key = `${script?.id ?? ''}|${directorId ?? ''}|${cast.map((c) => c.actorId).join(',')}`;
  const bias = fuzz ? ((hashString(key) % (fuzz + 1)) - fuzz / 2) * 0.8 : 0;
  const c = Math.round(q.critics + bias);
  const a = Math.round(q.audience + bias * 0.7);
  const hype = hypeScore({ starPower: q.starPower, marketingRatio: 0.35, reputation: me.reputation, genre, hypeMod: 0, director: directorId ? game.directors[directorId] : null });
  const gross = estimateGross(TIERS[tier].budget, genre, hype, c, a);
  const range = (v: number) => `${Math.max(0, v - fuzz)}–${Math.min(100, v + fuzz)}`;
  return (
    <aside className="lg:sticky lg:top-[84px] lg:self-start">
      <Panel title="Analyst forecast">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">Critics</div>
            <div className="font-poster text-2xl">{range(c)}</div>
          </div>
          <div>
            <div className="label">Audience</div>
            <div className="font-poster text-2xl">{range(a)}</div>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {(
            [
              ['Script', q.script],
              ['Acting', q.acting],
              ['Direction', q.direction],
              ['Chemistry', q.chemistry],
              ['Polish', q.production],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="grid grid-cols-[76px_1fr] items-center gap-2">
              <span className="font-cond text-xs uppercase tracking-wider text-cream-dim">{label}</span>
              <Meter value={v} color={moodColor(v)} />
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-line bg-ink p-2 text-sm">
          <span className="label">Est. worldwide gross</span>
          <div className="font-poster text-xl text-gold">
            {fmtMoney(gross * 0.75, 0)}&ndash;{fmtMoney(gross * 1.25, 0)}
          </div>
          <div className="text-xs text-cream-mute">with a standard campaign and a clear weekend</div>
        </div>
        <p className="mt-3 text-xs text-cream-mute">
          Analyst level {game.staff.analystLevel}/5: forecasts are &plusmn;{fuzz}. Hire better analysts in Finance for sharper numbers.
        </p>
      </Panel>
    </aside>
  );
}

/* ----------------------------- release planner ----------------------------- */

function ReleasePlanner({ filmId, onClose }: { filmId: string; onClose: () => void }) {
  const { game, update, toast } = useGame();
  const f = game.films[filmId];
  const abs = absWeek(game);
  const [mk, setMk] = useState(MARKETING[1].id);
  const [when, setWhen] = useState(() => (f ? bestReleaseWeek(game, f.genre, f.tier, abs + 1, abs + 8, f.id) : abs + 1));
  if (!f) return null;
  const plan = MARKETING.find((m) => m.id === mk)!;
  const q = evaluateExisting(game, f);
  const fuzz = predictionFuzz(game.staff.analystLevel);
  const bias = fuzz ? ((hashString(f.id) % (fuzz + 1)) - fuzz / 2) * 0.8 : 0;
  const crit = q.critics + bias;
  const aud = q.audience + bias * 0.7;
  const weeks = Array.from({ length: 12 }, (_, i) => abs + 1 + i);
  const hype = filmHype(game, f, plan.ratio);
  const est = (w: number) => estimateGross(f.budget, f.genre, hype, crit, aud, seasonality(absToSeasonWeek(w).week)) * competitionFactor(crowding(game, w, f.genre, f.id));
  const best = Math.max(...weeks.map(est));
  const me = playerStudio(game);
  const cost = f.budget * plan.ratio;

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`Release "${f.title}"`}
      footer={
        <>
          <span className="mr-auto self-center text-sm text-cream-mute">
            Marketing due now: <Money value={cost} /> (cash <Money value={me.cash} />)
          </span>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-gold"
            onClick={() => {
              update((s) => setRelease(s, f.id, when, plan.ratio));
              toast(`"${f.title}" opens ${weekLabel(when)}.`);
              onClose();
            }}
          >
            Confirm {weekLabel(when)}
          </button>
        </>
      }
    >
      <div className="label">Marketing campaign</div>
      <Segmented
        className="mt-1"
        value={mk}
        onChange={setMk}
        options={MARKETING.map((m) => ({ value: m.id, label: `${m.label} ${fmtMoney(f.budget * m.ratio, 0)}` }))}
      />
      <p className="mt-2 text-sm text-cream-mute">Hype with this campaign: <b className="text-cream">{Math.round(hype)}</b>. Bigger campaigns lift awareness, with diminishing returns.</p>
      <div className="label mt-4">Pick an opening weekend</div>
      <ul className="mt-2 grid gap-2">
        {weeks.map((w) => {
          const { week } = absToSeasonWeek(w);
          const rivals = Object.values(game.films).filter((x) => x.releaseAbs === w && x.id !== f.id && (x.status === 'scheduled' || x.status === 'released'));
          const e = est(w);
          return (
            <li key={w}>
              <button
                onClick={() => setWhen(w)}
                aria-pressed={when === w}
                className={`grid w-full grid-cols-[86px_1fr_auto] items-center gap-3 rounded-lg border p-2 text-left ${when === w ? 'border-gold bg-gold/10' : 'border-line bg-ink hover:border-gold/50'}`}
              >
                <span>
                  <span className="block font-poster">{weekLabel(w)}</span>
                  <span className="block font-cond text-[11px] uppercase tracking-wider text-cream-mute">
                    {seasonPhase(week)} {Math.round((seasonality(week) - 1) * 100) >= 0 ? '+' : ''}
                    {Math.round((seasonality(week) - 1) * 100)}%
                  </span>
                </span>
                <span className="min-w-0">
                  {rivals.length === 0 ? (
                    <span className="text-sm text-leaf">Clear weekend</span>
                  ) : (
                    rivals.map((x) => {
                      const st = game.studios.find((s) => s.id === x.studioId)!;
                      return (
                        <span key={x.id} className="flex items-center gap-1.5 truncate text-sm">
                          <StudioDot color={st.color} size={7} />
                          <span className="truncate">{x.title}</span>
                          <span className="shrink-0 font-cond text-[11px] uppercase text-cream-mute">
                            {TIERS[x.tier].label} {genreLabel(x.genre)}
                          </span>
                        </span>
                      );
                    })
                  )}
                </span>
                <span className="w-20 text-right">
                  <span className="block font-cond text-sm">{fmtMoney(e, 0)}</span>
                  <Meter value={e} max={best} color={e >= best * 0.95 ? '#f2c14e' : '#3fa7a0'} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-cream-mute">Estimates are rough and assume the analysts&rsquo; forecast is right. A press junket happens the week the film opens.</p>
    </Modal>
  );
}

/* ------------------------------- film detail ------------------------------- */

export function FilmDetail({ filmId, onClose }: { filmId: string; onClose: () => void }) {
  const { game, openActor } = useGame();
  const f = game.films[filmId];
  if (!f) return null;
  const st = game.studios.find((s) => s.id === f.studioId);
  const d = game.directors[f.directorId];
  return (
    <Modal open onClose={onClose} wide title={f.title}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[150px_1fr]">
        <div className="mx-auto">
          <Poster title={f.title} genre={f.genre} studio={st?.name} width={150} />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="chip">{genreLabel(f.genre)}</span>
            <span className="chip">{TIERS[f.tier].label} budget &middot; {fmtMoney(f.budget)}</span>
            <span className="chip text-gold">{f.status}</span>
            {f.releaseAbs && <span className="chip">Opens {weekLabel(f.releaseAbs)}</span>}
          </div>
          {f.critics !== null && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="label">Critics</div>
                <div className="font-poster text-2xl">
                  <Score v={f.critics} />
                </div>
              </div>
              <div>
                <div className="label">Audience</div>
                <div className="font-poster text-2xl">
                  <Score v={f.audience} />
                </div>
              </div>
              <div>
                <div className="label">Opening</div>
                <div className="font-poster text-2xl">
                  <Money value={f.openingWeekend} /> <span className="text-sm text-cream-mute">#{f.weekendRank}</span>
                </div>
              </div>
              <div>
                <div className="label">Gross</div>
                <div className="font-poster text-2xl text-gold">
                  <Money value={f.gross} />
                </div>
              </div>
            </div>
          )}
          <div>
            <div className="label mb-1">Cast &amp; crew</div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {d && (
                <li className="flex items-center gap-2 text-sm">
                  <Face face={d.face} size={28} />
                  <span className="truncate">{fullName(d)}</span>
                  <span className="ml-auto font-cond text-xs uppercase text-cream-mute">Director</span>
                </li>
              )}
              {f.cast.map((c) => {
                const a = game.actors[c.actorId];
                const perf = f.performances.find((p) => p.actorId === c.actorId);
                return (
                  <li key={c.actorId}>
                    <button className="flex min-h-[36px] w-full items-center gap-2 text-left text-sm hover:text-gold" onClick={() => a && openActor(a.id)} disabled={!a}>
                      {a && <Face face={a.face} size={28} />}
                      <span className="truncate">{a ? fullName(a) : 'Retired actor'}</span>
                      <span className="ml-auto font-cond text-xs uppercase text-cream-mute">{ROLE_LABEL[c.role]}</span>
                      {perf && <Score v={perf.score} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="label mb-1">Production diary</div>
            <ul className="space-y-1 text-sm text-cream-dim">
              {f.log.map((l, i) => (
                <li key={i}>&bull; {l}</li>
              ))}
            </ul>
          </div>
          {f.status === 'finished' && (
            <p className="text-sm text-cream-mute">
              Spent <Money value={f.spent} />. Rentals <Money value={f.gross * 0.5} />, streaming <Money value={f.streaming} />. Result{' '}
              <Money value={f.gross * 0.5 + f.streaming - f.spent} signed />.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

