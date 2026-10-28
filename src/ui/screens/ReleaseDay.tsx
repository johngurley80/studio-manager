import { useEffect, useMemo, useRef, useState } from 'react';
import { dismissReport, fmtMoney, playerStudio, type ReleaseReport } from '../../sim';
import { useGame } from '../../state/GameContext';
import { genreLabel } from '../format';
import { Confetti, useCountUp } from '../kit';
import { Poster } from '../Poster';

const TICK_MS = 1350;

export function ReleaseDay({ report }: { report: ReleaseReport }) {
  const { game, update } = useGame();
  const me = playerStudio(game);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const last = report.ticks.length - 1;
  const [tick, setTick] = useState(reduce ? last : -1);
  const done = tick >= last;
  const [revealed, setRevealed] = useState(!!reduce);
  const revealRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (revealed && !reduce) revealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [revealed, reduce]);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setRevealed(true), reduce ? 0 : 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTick((x) => x + 1), tick < 0 ? 900 : TICK_MS);
    return () => clearTimeout(t);
  }, [tick, done, reduce]);

  const current = report.ticks[Math.max(0, tick)];
  const max = useMemo(() => Math.max(report.weekend, ...report.ticks[last].rivals.map((r) => r.value), 0.1), [report, last]);
  const rows = useMemo(() => {
    const base = [
      { id: report.filmId, title: report.title, studio: me.name, color: '#f2c14e', value: tick < 0 ? 0 : current.player, mine: true },
      ...current.rivals.map((r) => ({
        id: r.filmId,
        title: r.title,
        studio: r.studioName === me.name ? `${r.studioName} (yours)` : r.studioName,
        color: r.studioName === me.name ? '#9a8669' : r.color,
        value: tick < 0 ? 0 : r.value,
        mine: false,
      })),
    ];
    return base.sort((a, b) => b.value - a.value);
  }, [current, tick, report, me.name]);
  const headlines = report.ticks.slice(0, tick + 1).map((t, i) => ({ i, label: t.label, text: t.headline })).filter((h) => h.text).reverse().slice(0, 4);

  const critics = useCountUp(report.critics, revealed);
  const audience = useCountUp(report.audience, revealed);
  const weekendNow = useCountUp(tick < 0 ? 0 : current.player, true, 700);
  const good = report.verdict === 'SMASH HIT' || report.verdict === 'SOLID HIT';
  const celebrate = revealed && (report.rank === 1 || report.verdict === 'SMASH HIT');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink" role="dialog" aria-modal="true" aria-label={`Opening weekend for ${report.title}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(242,193,78,.18),transparent_60%)]" />
      <Confetti run={celebrate} count={140} />
      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-4 py-5 sm:py-8">
        {/* marquee */}
        <div className="marquee-bulbs h-3 animate-bulbs rounded-t-lg opacity-80" />
        <div className="flex items-center gap-4 border-x-4 border-gold bg-ink-2 px-4 py-4 sm:px-6">
          <div className="hidden shrink-0 sm:block">
            <Poster title={report.title} genre={report.genre} studio={me.name} width={84} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="label !text-gold">Opening weekend &middot; {genreLabel(report.genre)}</div>
            <h1 className="truncate font-display text-3xl text-cream sm:text-5xl">{report.title}</h1>
            <div className="mt-1 font-cond text-sm uppercase tracking-[0.2em] text-cream-mute">{tick < 0 ? 'Doors open…' : current.label}</div>
          </div>
          <div className="text-right">
            <div className="label">Weekend</div>
            <div className="tabular font-poster text-2xl text-gold sm:text-4xl">{fmtMoney(weekendNow)}</div>
          </div>
        </div>
        <div className="marquee-bulbs h-3 animate-bulbs rounded-b-lg opacity-80" />

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
          {/* bar race */}
          <section className="panel p-4" aria-label="Live box office">
            <h2 className="h-poster mb-3 text-sm text-gold">Live box office</h2>
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="transition-all duration-500">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={`min-w-0 truncate ${r.mine ? 'font-poster uppercase tracking-wide text-gold' : 'text-cream-dim'}`}>
                      {r.title} <span className="font-cond text-[11px] uppercase text-cream-mute">{r.studio}</span>
                    </span>
                    <span className="tabular shrink-0 font-cond font-bold">{fmtMoney(r.value)}</span>
                  </div>
                  <div className="mt-1 h-4 overflow-hidden rounded-full bg-ink-4">
                    <div
                      className="h-full rounded-full transition-[width] duration-[1100ms] ease-out"
                      style={{ width: `${(r.value / max) * 100}%`, background: r.color, boxShadow: r.mine ? '0 0 16px #f2c14e88' : undefined }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {/* ticker */}
          <section className="panel flex min-h-[200px] flex-col p-4" aria-live="polite" aria-label="Headlines">
            <h2 className="h-poster mb-3 flex items-center gap-2 text-sm text-gold">
              <span className="h-2 w-2 animate-flicker rounded-full bg-rouge" /> Trade wire
            </h2>
            <ul className="space-y-2">
              {headlines.map((h) => (
                <li key={h.i} className="animate-rise rounded-lg border border-line bg-ink p-2">
                  <div className="font-cond text-[10px] uppercase tracking-[0.2em] text-cream-mute">{h.label}</div>
                  <div className="text-cream">{h.text}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* reveal */}
        <section ref={revealRef} className={`mt-5 grid gap-4 transition-opacity duration-500 sm:grid-cols-3 ${revealed ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden={!revealed}>
          <div className="panel p-4 text-center">
            <div className="label">Critics</div>
            <div className="tabular font-display text-6xl" style={{ color: scoreColor(report.critics) }}>
              {Math.round(critics)}
            </div>
          </div>
          <div className="panel p-4 text-center">
            <div className="label">Audience</div>
            <div className="tabular font-display text-6xl" style={{ color: scoreColor(report.audience) }}>
              {Math.round(audience)}
            </div>
          </div>
          <div className="panel relative flex flex-col items-center justify-center overflow-hidden p-4 text-center">
            <div className="label">Opened</div>
            <div className="font-display text-5xl text-gold">#{report.rank}</div>
            <div className="font-cond text-xs uppercase tracking-wider text-cream-mute">of {report.openers} films in cinemas</div>
          </div>
          {revealed && (
            <div className="flex flex-col items-center gap-3 sm:col-span-3">
              <div
                className={`animate-pop rounded-lg border-4 px-6 py-2 font-poster text-3xl tracking-[0.15em] sm:text-4xl ${
                  good ? 'border-gold text-gold' : report.verdict === 'BREAK-EVEN' ? 'border-cream-dim text-cream' : 'border-rouge-soft text-rouge-soft'
                }`}
              >
                {report.verdict}
              </div>
              <p className="text-center text-cream-dim">
                Projected worldwide total <b className="text-cream">{fmtMoney(report.projectedTotal)}</b>. Studios keep half of every ticket.
              </p>
            </div>
          )}
        </section>

        <div className="mt-auto flex justify-end gap-2 pt-6 pb-[env(safe-area-inset-bottom)]">
          {!revealed && (
            <button
              className="btn-ghost"
              onClick={() => {
                setTick(last);
                setRevealed(true);
              }}
            >
              Skip
            </button>
          )}
          <button className="btn-gold" disabled={!revealed} onClick={() => update((s) => dismissReport(s, report.filmId))}>
            Back to the office
          </button>
        </div>
      </div>
    </div>
  );
}

function scoreColor(v: number): string {
  return v >= 75 ? '#f2c14e' : v >= 60 ? '#8bc172' : v >= 45 ? '#e0a35a' : '#e0563f';
}
