import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { fmtMoney } from '../sim';

/* ---------------------------------- brand --------------------------------- */

export function Logo({ size = 40, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="12" fill="#16100d" stroke="#3a2b20" />
        <g transform="translate(32 40)">
          <path d="M-26 0a26 26 0 0 1 52 0z" fill="#c2362b" />
          <path d="M-20 0a20 20 0 0 1 40 0z" fill="#e0682b" />
          <path d="M-14 0a14 14 0 0 1 28 0z" fill="#f2c14e" />
          <path d="M-8 0a8 8 0 0 1 16 0z" fill="#f4e7cf" />
        </g>
        <rect x="6" y="44" width="52" height="8" rx="2" fill="#f2c14e" />
        <g fill="#16100d">
          {[10, 18, 26, 34, 42, 50].map((x) => (
            <rect key={x} x={x} y="46" width="4" height="4" rx="1" />
          ))}
        </g>
      </svg>
      {wordmark && (
        <div className="leading-none">
          <div className="font-display text-[22px] text-gold drop-shadow-[0_2px_0_#b84a1c]">Back Lot</div>
          <div className="label mt-0.5 !text-[9px] !tracking-[0.3em]">Studio Manager</div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- bits ----------------------------------- */

export function Money({ value, digits = 1, className = '', signed = false }: { value: number; digits?: number; className?: string; signed?: boolean }) {
  const cls = signed ? (value >= 0 ? 'text-leaf' : 'text-rouge-soft') : '';
  return <span className={`tabular ${cls} ${className}`}>{signed && value > 0 ? '+' : ''}{fmtMoney(value, digits)}</span>;
}

export function attrColor(v: number): string {
  if (v >= 16) return '#f2c14e';
  if (v >= 12) return '#8bc172';
  if (v >= 8) return '#e0a35a';
  return '#e0563f';
}

/** `invert` colours low values as good (used for Ego). */
export function AttrNum({ v, invert = false }: { v: number; invert?: boolean }) {
  return (
    <span className="tabular font-cond text-[15px] font-bold" style={{ color: attrColor(invert ? 21 - v : v) }}>
      {Math.round(v)}
    </span>
  );
}

export function Bar({ label, value, max = 20, hint, color }: { label: string; value: number; max?: number; hint?: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="grid grid-cols-[92px_1fr_28px] items-center gap-2" title={hint}>
      <span className="font-cond text-sm font-medium uppercase tracking-wider text-cream-dim">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-4">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color ?? attrColor((value / max) * 20) }} />
      </div>
      <span className="tabular text-right font-cond font-bold" style={{ color: color ?? attrColor((value / max) * 20) }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

export function Meter({ value, max = 100, color = '#f2c14e', className = '' }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-ink-4 ${className}`}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function moodColor(v: number): string {
  return v >= 70 ? '#8bc172' : v >= 45 ? '#f2c14e' : v >= 25 ? '#e0682b' : '#e0563f';
}

export function Mood({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: moodColor(value) }} />
      <span className="tabular font-cond">{Math.round(value)}</span>
    </span>
  );
}

export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  const full = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <span className="whitespace-nowrap text-gold" aria-label={`${full} of ${max} stars`}>
      {'★'.repeat(full)}
      <span className="text-cream-mute/40">{'★'.repeat(max - full)}</span>
    </span>
  );
}

export function StudioDot({ color, size = 10 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color, boxShadow: `0 0 8px ${color}66` }} />;
}

export function Stat({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="label truncate">{label}</div>
      <div className="truncate font-poster text-xl text-cream">{children}</div>
    </div>
  );
}

export function Panel({ title, action, children, className = '', bodyClass = 'p-4' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`panel animate-rise ${className}`}>
      {title !== undefined && (
        <header className="panel-head">
          <h2 className="h-poster truncate text-[15px] text-gold">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-cream-mute">{children}</div>;
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className = '',
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" className={`flex flex-wrap gap-1 rounded-lg border border-line bg-ink p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-[40px] flex-1 rounded-md px-3 font-cond font-bold uppercase tracking-wider transition-colors ${size === 'sm' ? 'text-xs' : 'text-sm'} ${
            o.value === value ? 'bg-gold text-ink' : 'text-cream-dim hover:bg-ink-3'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { id: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          onClick={() => onChange(t.id)}
          className={`min-h-[44px] shrink-0 rounded-lg border px-4 font-poster text-sm uppercase tracking-[0.1em] transition-colors ${
            t.id === value ? 'border-gold bg-gold/15 text-gold' : 'border-line bg-ink-2 text-cream-dim hover:border-gold/50'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- modal ---------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  footer,
  closable = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
  closable?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, closable]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => closable && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        className={`panel flex max-h-[92dvh] w-full animate-rise flex-col !rounded-b-none sm:!rounded-xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || closable) && (
          <header className="panel-head shrink-0">
            <h2 className="h-poster min-w-0 truncate text-base text-gold">{title}</h2>
            {closable && (
              <button aria-label="Close" onClick={onClose} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-cream-mute hover:bg-ink-3 hover:text-cream">
                &times;
              </button>
            )}
          </header>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line p-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------- data table ------------------------------- */

export interface Column<T> {
  key: string;
  label: ReactNode;
  title?: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => number | string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hide below this breakpoint to keep phones readable. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

const HIDE: Record<string, string> = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRow,
  initialSort,
  empty = 'Nothing here yet.',
  rowClass,
  dense = false,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string;
  onRow?: (r: T) => void;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  empty?: ReactNode;
  rowClass?: (r: T) => string;
  dense?: boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const f = col.sort;
    return rows.slice().sort((a, b) => {
      const va = f(a);
      const vb = f(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="scroll-thin overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-[1] bg-ink-3">
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  title={c.title}
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`whitespace-nowrap border-b border-line px-2 py-0 font-cond text-[11px] font-bold uppercase tracking-[0.12em] text-cream-mute ${c.hideBelow ? HIDE[c.hideBelow] : ''} ${
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {c.sort ? (
                    <button
                      className={`inline-flex min-h-[40px] items-center gap-1 uppercase hover:text-cream ${active ? 'text-gold' : ''}`}
                      onClick={() => setSort(active ? { key: c.key, dir: sort!.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'desc' })}
                    >
                      {c.label}
                      <span aria-hidden className="text-[9px]">{active ? (sort!.dir === 'asc' ? '▲' : '▼') : '◆'}</span>
                    </button>
                  ) : (
                    <span className="inline-flex min-h-[40px] items-center">{c.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRow ? () => onRow(r) : undefined}
              onKeyDown={onRow ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRow(r)) : undefined}
              tabIndex={onRow ? 0 : undefined}
              className={`border-b border-line-soft last:border-0 ${onRow ? 'cursor-pointer hover:bg-gold/[0.06] focus-visible:bg-gold/10' : ''} ${rowClass?.(r) ?? ''}`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`${dense ? 'py-1.5' : 'py-2'} h-11 whitespace-nowrap px-2 ${c.hideBelow ? HIDE[c.hideBelow] : ''} ${
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                  } ${c.className ?? ''}`}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- confetti -------------------------------- */

export function Confetti({ run, count = 90 }: { run: boolean; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || reduce) return;
    const w = (c.width = window.innerWidth);
    const h = (c.height = window.innerHeight);
    const colors = ['#f2c14e', '#e0682b', '#c2362b', '#f4e7cf', '#3fa7a0'];
    const parts = Array.from({ length: count }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      s: 5 + Math.random() * 7,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (frame++ < 200) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, count]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden />;
}

/* ---------------------------------- icons --------------------------------- */

const ICONS: Record<string, string> = {
  office: 'M3 21V8l9-5 9 5v13h-6v-7H9v7z',
  inbox: 'M3 5h18v14H3zM3 13h5l2 3h4l2-3h5',
  squad: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 21c0-4 3-7 7-7s7 3 7 7zm14 0c0-2-.6-3.8-1.7-5.2C14.6 14.6 15.3 14 16 14c3 0 6 2.4 6 7z',
  talent: 'M10 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm5.5 12.5L21 21',
  training: 'M4 10v4M20 10v4M7 7v10M17 7v10M7 12h10',
  films: 'M3 6h18v12H3zM3 9h18M3 15h18M7 6v3M12 6v3M17 6v3M7 15v3M12 15v3M17 15v3',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  finance: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  board: 'M4 4h16v12H4zM8 20h8M12 16v4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  save: 'M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7',
  play: 'M7 4l13 8-13 8z',
};

export function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof ICONS | string; className?: string }) {
  const fillIcons = ['office', 'squad', 'play'];
  const filled = fillIcons.includes(name);
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name] ?? ''} />
    </svg>
  );
}

/** Small count-up for big reveal numbers. */
export function useCountUp(target: number, run: boolean, ms = 900): number {
  const [v, setV] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) {
      setV(target);
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setV(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}
