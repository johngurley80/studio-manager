import { useEffect, useState } from 'react';
import { resolveDecision } from '../../sim';
import { useGame } from '../../state/GameContext';
import { Modal } from '../kit';

const KIND_LABEL = { production: 'On set', rivalBid: 'Transfer bid', transferRequest: 'Agent', press: 'Press conference' } as const;

/** Works through pending decisions one at a time. */
export function DecisionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { game, update } = useGame();
  const d = game.decisions[0];
  const [answers, setAnswers] = useState<number[]>([]);
  useEffect(() => setAnswers([]), [d?.id]);
  if (!d) return null;
  const complete = d.questions.every((_, i) => answers[i] !== undefined);
  const submit = () => {
    update((s) => resolveDecision(s, d.id, answers));
    if (game.decisions.length <= 1) onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="chip border-gold text-gold">{KIND_LABEL[d.kind]}</span>
          <span className="truncate">{d.title}</span>
        </span>
      }
      footer={
        <>
          <span className="mr-auto self-center font-cond text-xs uppercase tracking-wider text-cream-mute">{game.decisions.length} pending</span>
          <button className="btn-ghost" onClick={onClose}>
            Later
          </button>
          <button className="btn-gold" disabled={!complete} onClick={submit}>
            Confirm
          </button>
        </>
      }
    >
      <p className="leading-relaxed text-cream-dim">{d.body}</p>
      {d.questions.map((q, qi) => (
        <fieldset key={qi} className="mt-4">
          <legend className="mb-2 font-poster text-sm uppercase tracking-wider text-cream">
            {d.questions.length > 1 && <span className="text-gold">Q{qi + 1}. </span>}
            {q.prompt}
          </legend>
          <div className="space-y-2">
            {q.options.map((o, oi) => {
              const on = answers[qi] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => setAnswers((a) => Object.assign([...a], { [qi]: oi }))}
                  aria-pressed={on}
                  className={`flex min-h-[52px] w-full flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                    on ? 'border-gold bg-gold/10' : 'border-line bg-ink hover:border-gold/50'
                  }`}
                >
                  <span className={on ? 'text-gold' : 'text-cream'}>{o.label}</span>
                  <span className="font-cond text-xs uppercase tracking-wider text-cream-mute">{o.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </Modal>
  );
}
