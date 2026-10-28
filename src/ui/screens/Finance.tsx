import { useState } from 'react';
import {
  ANALYST_SALARY,
  ANALYST_UPGRADE,
  OVERHEAD_PER_WEEK,
  SCOUT_SALARY,
  debt,
  fmtMoney,
  fullName,
  loanTerms,
  payroll,
  playerStudio,
  predictionFuzz,
  repayLoan,
  rosterOf,
  seasonProfit,
  takeLoan,
  upgradeAnalysts,
  workInProgress,
} from '../../sim';
import { useGame } from '../../state/GameContext';
import { DataTable, Empty, Money, Panel, Stat } from '../kit';

export function Sparkline({ values, height = 80 }: { values: number[]; height?: number }) {
  if (values.length < 2) return <div className="h-20 rounded bg-ink" />;
  const w = 300;
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 8) - 4;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const zero = y(0);
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-20 w-full" preserveAspectRatio="none" role="img" aria-label={`Cash trend, now ${fmtMoney(last)}`}>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f2c14e" stopOpacity=".35" />
          <stop offset="1" stopColor="#f2c14e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={w} y1={zero} y2={zero} stroke="#e0563f" strokeDasharray="4 4" strokeWidth="1" opacity=".6" />
      <path d={`${d} L${w} ${height} L0 ${height} Z`} fill="url(#spark-fill)" />
      <path d={d} fill="none" stroke="#f2c14e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function FinanceScreen() {
  const { game, update, toast } = useGame();
  const me = playerStudio(game);
  const terms = loanTerms(game);
  const [amount, setAmount] = useState(Math.min(20, terms.max));
  const pay = payroll(game, me.id);
  const staff = game.scouts.length * SCOUT_SALARY + ANALYST_SALARY[game.staff.analystLevel];
  const loanWeekly = game.loans.reduce((s, l) => s + l.weeklyPayment, 0);
  const weeklyBurn = pay / 52 + OVERHEAD_PER_WEEK + staff / 52 + loanWeekly;
  const lvl = game.staff.analystLevel;
  const top = rosterOf(game, me.id)
    .sort((a, b) => b.salary - a.salary)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <h1 className="h-poster text-2xl text-gold">Finance</h1>
      <Panel title="Balance sheet">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Cash">
            <Money value={me.cash} className={me.cash < 0 ? 'text-rouge-soft' : ''} />
          </Stat>
          <Stat label="Debt">
            <Money value={debt(game)} />
          </Stat>
          <Stat label="Films in progress">
            <Money value={workInProgress(game, me.id)} />
          </Stat>
          <Stat label="Weekly fixed costs">
            <Money value={weeklyBurn} digits={2} />
          </Stat>
        </div>
        <div className="mt-4">
          <Sparkline values={game.cashHistory.slice(-104)} />
          <div className="font-cond text-xs uppercase tracking-wider text-cream-mute">Cash, last two seasons. Dashed line is zero; ten weeks below it (or a deep hole) and the bank closes you down.</div>
        </div>
      </Panel>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title={`Season ${game.season} P&L`}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-cream-mute">Income (rentals, streaming, sales, grants)</dt>
            <dd className="text-right">
              <Money value={me.season.income} />
            </dd>
            <dt className="text-cream-mute">Spending</dt>
            <dd className="text-right">
              <Money value={-me.season.expenses} />
            </dd>
            <dt className="text-cream-mute">Change in films in progress</dt>
            <dd className="text-right">
              <Money value={workInProgress(game, me.id) - me.season.wipStart} signed />
            </dd>
            <dt className="border-t border-line pt-2 font-semibold">Season result</dt>
            <dd className="border-t border-line pt-2 text-right font-poster text-lg">
              <Money value={seasonProfit(game, me)} signed />
            </dd>
          </dl>
          <p className="mt-3 text-xs text-cream-mute">
            Box office splits 50/50 with cinemas and arrives week by week as a film plays out. When a film leaves cinemas a streaming deal pays a lump sum.
          </p>
        </Panel>
        <Panel title="Loans">
          {game.loans.length === 0 ? (
            <Empty>No outstanding loans.</Empty>
          ) : (
            <ul className="space-y-2">
              {game.loans.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-lg border border-line bg-ink p-3 text-sm">
                  <span className="flex-1">
                    <Money value={l.remaining} /> left of <Money value={l.principal} /> &middot; {(l.rate * 100).toFixed(1)}% &middot; <Money value={l.weeklyPayment} digits={2} />
                    /wk
                  </span>
                  <button className="btn-ghost !min-h-[40px] !px-3 !text-xs" disabled={me.cash < l.remaining} onClick={() => update((s) => repayLoan(s, l.id))}>
                    Repay
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-lg border border-line bg-ink p-3">
            <div className="label">New loan &middot; {(terms.rate * 100).toFixed(1)}% over two seasons</div>
            {terms.max < 1 ? (
              <p className="mt-2 text-sm text-cream-mute">The bank won&rsquo;t lend you any more.</p>
            ) : (
              <>
                <input
                  type="range"
                  min={1}
                  max={terms.max}
                  value={Math.min(amount, terms.max)}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-3 h-11 w-full accent-[#f2c14e]"
                  aria-label="Loan amount"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-poster text-xl">{fmtMoney(Math.min(amount, terms.max), 0)}</span>
                  <button
                    className="btn-gold"
                    onClick={() => {
                      update((s) => takeLoan(s, Math.min(amount, terms.max)));
                      toast('Loan approved.');
                    }}
                  >
                    Borrow
                  </button>
                </div>
                <p className="text-xs text-cream-mute">Credit limit {fmtMoney(terms.max, 0)}. Better reputation means cheaper money.</p>
              </>
            )}
          </div>
        </Panel>
        <Panel title="Staff">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-line bg-ink p-3">
              <div className="flex-1">
                <div className="font-semibold">Analysts &middot; level {lvl}/5</div>
                <div className="text-sm text-cream-mute">
                  Forecasts are &plusmn;{predictionFuzz(lvl)} points. Salary {fmtMoney(ANALYST_SALARY[lvl])}/season.
                </div>
              </div>
              <button
                className="btn-gold !px-3 !text-xs"
                disabled={lvl >= 5 || me.cash < (ANALYST_UPGRADE[lvl + 1] ?? Infinity)}
                onClick={() => {
                  update(upgradeAnalysts);
                  toast('New analysts hired.');
                }}
              >
                {lvl >= 5 ? 'Maxed' : `Upgrade ${fmtMoney(ANALYST_UPGRADE[lvl + 1])}`}
              </button>
            </div>
            <div className="rounded-lg border border-line bg-ink p-3 text-sm">
              <div className="font-semibold">Scouts &middot; {game.scouts.length}</div>
              <div className="text-cream-mute">{fmtMoney(SCOUT_SALARY)}/season each. Manage them in Talent.</div>
            </div>
            <div className="rounded-lg border border-line bg-ink p-3 text-sm">
              <div className="font-semibold">Lot overheads</div>
              <div className="text-cream-mute">{fmtMoney(OVERHEAD_PER_WEEK * 52)}/season for stages, security and the canteen.</div>
            </div>
          </div>
        </Panel>
        <Panel title={`Payroll · ${fmtMoney(pay)}/season`} bodyClass="p-3">
          <DataTable
            rows={top}
            rowKey={(a) => a.id}
            dense
            columns={[
              { key: 'n', label: 'Highest paid', render: (a) => <span className="block max-w-[180px] truncate">{fullName(a)}</span> },
              { key: 'c', label: 'Until', align: 'right', render: (a) => `S${a.contractEnd}` },
              { key: 's', label: 'Salary', align: 'right', render: (a) => <Money value={a.salary} digits={2} /> },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
