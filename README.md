# Back Lot

**Football Manager, but you run a film studio.** Your contracted actors are the squad, every film is a match, the box office chart is the league table and awards season is the cup.

Back Lot is a single-page browser game built with Vite, React, TypeScript and Tailwind. There is no backend: the game saves to your browser's local storage.

Every actor, director, studio, film title and award in the game is invented and procedurally generated.

## Quick start

```bash
npm install
npm run dev        # play at http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Typecheck and build a static site into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest suite for the simulation |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run sim` | Headless balance run: 50 careers x 5 seasons for three AI strategies |

`npm run sim -- --careers 20 --seasons 3 --difficulty mogul --strategies smart` narrows the run.

## How to play

One turn is one week. A season is 52 weeks, followed by awards night and the board's season review.

1. **Office.** Your home screen: cash, reputation, chart position, current projects, inbox, trade news and the board's three objectives for the season.
2. **Squad.** 25-30 contracted actors. Each has Drama, Comedy, Action, Charisma, Star Power, Reliability and Ego (1-20), plus age, morale, form, salary, contract and genre reputation. Potential stays hidden until a scout has seen them. Young actors grow towards their potential; actors over 50 slowly lose their edge, but their Drama can still deepen.
3. **Training.** Set a five-day schedule of acting workshops, stunt training, comedy improv and rest. Four or five working days grow skills faster but wear morale down; too much rest lets form slip. You can excuse individual actors.
4. **Talent.** Send scouts to a region for a few weeks to reveal potential and turn up unknown youngsters. Sign free agents or bid for actors at rival studios. Negotiate salary, contract length and top billing (cheaper for big egos, but it raises Ego). Agents counter up to three times, and push too hard and they stop taking your calls. Rivals bid for your stars and unhappy actors ask to leave.
5. **Films.** Greenlight a picture: pick a script (quality and genre fit), a genre and budget tier, a director (style, skill, specialties) and a cast of one lead, one co-lead and up to four supporting players. The chemistry meter shows how every pair gets on and the analysts forecast critic and audience scores. The forecast is fuzzy until you hire better analysts.
6. **Production.** Shoots take 6-16 weeks. Expect stunt injuries, on-set feuds, budget overruns, reshoots and leaks, and every one is a choice with a trade-off.
7. **Release day.** When a film wraps, pick its opening weekend and a marketing campaign. Holidays and summer bring bigger crowds; rival openings in your genre take a share. Then watch the weekend play out live: box office ticking up against the competition, headlines on the trade wire, and the critic and audience verdicts.
8. **Chart.** Eight studios compete on season gross. Each rival plays its own way (blockbusters, prestige drama, cheap horror and so on). The champion banks a bonus; the bottom studio loses reputation and has its budget halved.
9. **Awards.** At season end the Lantern Awards name nominees for Best Picture, Best Lead Performance, Best Supporting Performance and Best Director, then open the envelopes one by one. Winners gain star power and the studio gains reputation.
10. **Finance and the board.** Box office splits 50/50 with cinemas and arrives week by week as a film plays out; a streaming deal pays when it leaves cinemas. Salaries and overheads go out every week. Loans help, with interest. If you stay overdrawn for ten weeks, or fall too deep into the red, you go bankrupt. Miss the board's objectives once and you get a warning; miss them again and you're sacked.

Difficulty: **Indie** (more money, patient board), **Studio** (intended) or **Mogul** (thin margins, demanding board). An optional world seed lets you replay the same world.

### Tips

- Cast to the part: the fit number on the casting screen weighs the script's demands against each actor's skills, form, morale and genre reputation.
- Watch egos. Two big egos in the lead roles kill chemistry.
- A clear weekend matters more than a slightly better one: check the release planner.
- Scout early. Cheap 19-year-olds with high potential cost little now and carry your films a couple of seasons later.

## Controls

Everything works with a mouse or touch (all tap targets are at least 44px). On a phone, the main sections are in the bottom bar and the rest are under **More**.

| Key | Action |
| --- | --- |
| `Space` or `N` | Continue (play the week, or open pending decisions) |
| `1`-`9` | Office, Inbox, Squad, Talent, Training, Films, Chart, Finance, Board |
| `Esc` | Close the current dialog |
| `Enter` / `Space` on a table row | Open that row (actor profile, film details) |
| Click a column header | Sort the table; click again to reverse |

## Saving

The game autosaves every week. There are three manual save slots under **Save / Load** (the disk icon in the header, or **More** on a phone). Saves are compressed in `localStorage`, and every storage call is wrapped so the game still runs in private mode or with storage disabled.

## Project layout

```
src/sim/        Pure simulation: no React, no DOM. Seeded RNG, so a world can be replayed.
  engine.ts     New game, the weekly tick, season transitions and every player action
  film.ts       Performance, chemistry, film quality and box office maths
  release.ts    Opening weekends, the live ticker, weekly box office and streaming
  production.ts Greenlighting, casting helpers and on-set events
  transfers.ts  Negotiation, rival bids, transfer requests, scouting
  rivals.ts     Rival studio AI
  board.ts      League table, objectives and press conferences
  awards.ts     The Lantern Awards
  ai.ts         Scripted players used by the balance sim and tests
  sim.test.ts   Vitest suite
src/state/      React context and save/load
src/ui/         Screens, components, procedural faces and posters
scripts/sim.ts  Headless balance run (npm run sim)
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and the build on every push and pull request.
