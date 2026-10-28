import { DAYS_LABEL, TRAINING_INFO } from './trainingInfo';
import { fullName, rosterOf, setTraining, toggleRest, type TrainingActivity } from '../../sim';
import { useGame } from '../../state/GameContext';
import { Face } from '../Face';
import { Meter, Mood, Panel, moodColor } from '../kit';

const ACTS: TrainingActivity[] = ['workshop', 'stunts', 'improv', 'rest'];

export function TrainingScreen() {
  const { game, update, openActor } = useGame();
  const sched = game.training.schedule;
  const workload = sched.filter((x) => x !== 'rest').length;
  const squad = rosterOf(game, game.playerId).sort((a, b) => a.last.localeCompare(b.last));
  const set = (day: number, act: TrainingActivity) => {
    const next = sched.slice();
    next[day] = act;
    update((s) => setTraining(s, next));
  };
  const verdict =
    workload >= 5
      ? { text: 'Punishing. Skills grow fastest but morale will sink and stunt injuries rise.', color: '#e0563f' }
      : workload === 4
        ? { text: 'Demanding. Good growth, morale slowly slips.', color: '#e0682b' }
        : workload === 3
          ? { text: 'Balanced. Steady growth, morale and form hold up.', color: '#8bc172' }
          : workload === 2
            ? { text: 'Light. Happy actors, but form is barely ticking over.', color: '#f2c14e' }
            : { text: 'Holiday camp. Morale up, form and skills going nowhere.', color: '#e0563f' };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-poster text-2xl text-gold">Development</h1>
        <p className="text-sm text-cream-mute">The weekly schedule for every actor who is not shooting a film. Young actors improve towards their potential; over-50s slowly lose their edge (but drama can deepen with age).</p>
      </div>
      <Panel title="Weekly schedule">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {sched.map((act, day) => (
            <div key={day} className="rounded-lg border border-line bg-ink p-2">
              <div className="label mb-2 text-center">{DAYS_LABEL[day]}</div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
                {ACTS.map((a) => (
                  <button
                    key={a}
                    aria-pressed={act === a}
                    onClick={() => set(day, a)}
                    className={`flex min-h-[44px] items-center gap-2 rounded-md px-2 text-left font-cond text-sm font-bold uppercase tracking-wider transition-colors ${
                      act === a ? 'text-ink' : 'text-cream-dim hover:bg-ink-3'
                    }`}
                    style={act === a ? { background: TRAINING_INFO[a].color } : undefined}
                  >
                    <span aria-hidden>{TRAINING_INFO[a].icon}</span>
                    {TRAINING_INFO[a].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between">
            <span className="label">Workload</span>
            <span className="font-cond text-sm" style={{ color: verdict.color }}>
              {workload}/5
            </span>
          </div>
          <Meter value={workload} max={5} color={verdict.color} />
          <p className="mt-2 text-sm" style={{ color: verdict.color }}>
            {verdict.text}
          </p>
          <ul className="mt-3 grid gap-1 text-sm text-cream-mute sm:grid-cols-2">
            {ACTS.map((a) => (
              <li key={a}>
                <b className="text-cream">{TRAINING_INFO[a].label}:</b> {TRAINING_INFO[a].blurb}
              </li>
            ))}
          </ul>
        </div>
      </Panel>
      <Panel title="Individual plans" bodyClass="p-2">
        <ul className="divide-y divide-line-soft">
          {squad.map((a) => {
            const resting = game.training.resting.includes(a.id);
            return (
              <li key={a.id} className="flex min-h-[56px] items-center gap-3 px-2 py-2">
                <button onClick={() => openActor(a.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Face face={a.face} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{fullName(a)}</span>
                    <span className="flex gap-3 font-cond text-xs uppercase tracking-wider text-cream-mute">
                      <span>{a.age} yrs</span>
                      <span>
                        Morale <Mood value={a.morale} />
                      </span>
                      <span className="hidden sm:inline" style={{ color: moodColor(a.form) }}>
                        Form {Math.round(a.form)}
                      </span>
                    </span>
                  </span>
                </button>
                {a.filmId ? (
                  <span className="chip text-teal-soft">On set</span>
                ) : a.injuredWeeks > 0 ? (
                  <span className="chip text-rouge-soft">Injured {a.injuredWeeks}w</span>
                ) : (
                  <button className={resting ? 'btn-gold !px-3 !text-xs' : 'btn-ghost !px-3 !text-xs'} onClick={() => update((s) => toggleRest(s, a.id))}>
                    {resting ? 'Resting' : 'Training'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
