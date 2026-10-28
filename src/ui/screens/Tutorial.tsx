import { useState } from 'react';
import { Modal } from '../kit';

const STEPS = [
  {
    title: 'Welcome to the lot',
    body: 'You have just been handed the keys to a film studio. Your contracted actors are your squad, every film is a match, the box office chart is the league and awards season is the cup. One turn is one week; a season is 52 weeks.',
  },
  {
    title: 'The office and the Continue button',
    body: 'The Office shows your money, chart position, projects, inbox and the board’s objectives. Press Continue (or Space) to play a week. If something needs a decision, such as a press conference or a crisis on set, Continue opens it first.',
  },
  {
    title: 'Your squad',
    body: 'Actors have Drama, Comedy, Action, Charisma, Star Power, Reliability and Ego (1–20), plus morale, form and hidden potential. Young actors improve with training; the over-50s slowly fade, though their drama can deepen. Set the weekly schedule in Training.',
  },
  {
    title: 'Greenlight a film',
    body: 'In Films, pick a script, a genre and budget, a director, then cast a lead, a co-lead and up to four supporting players. Watch the chemistry meter and the analysts’ forecast. Shoots take 6–16 weeks and things will go wrong.',
  },
  {
    title: 'Release day',
    body: 'When a film wraps, choose its opening weekend and marketing campaign. Avoid big rival openings in your genre and aim for summer or the holidays. Then watch the weekend play out live.',
  },
  {
    title: 'Talent, money and the board',
    body: 'Scouts reveal potential and find new faces; sign free agents or poach stars from rivals in Talent. Keep cash above zero (loans help, at a price). Meet the board’s objectives or you will be warned, then sacked. Good luck!',
  },
];

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <Modal
      open
      onClose={onDone}
      title={`Studio orientation · ${i + 1}/${STEPS.length}`}
      footer={
        <>
          <button className="btn-ghost mr-auto" onClick={onDone}>
            Skip tutorial
          </button>
          {i > 0 && (
            <button className="btn-ghost" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button className="btn-gold" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? 'Start the season' : 'Next'}
          </button>
        </>
      }
    >
      <h3 className="font-display text-2xl text-gold">{s.title}</h3>
      <p className="mt-3 leading-relaxed text-cream-dim">{s.body}</p>
      <div className="mt-5 flex gap-1.5" aria-hidden>
        {STEPS.map((_, k) => (
          <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-gold' : 'bg-ink-4'}`} />
        ))}
      </div>
    </Modal>
  );
}
