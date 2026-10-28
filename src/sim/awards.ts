import { AWARDS_NAME } from './names';
import { fullName } from './people';
import type { Rng } from './rng';
import { pushInbox, pushNews, studioById } from './state';
import type { AwardCategory, Ceremony, Film, GameState, Nominee } from './types';
import { clamp } from './util';

export const CATEGORIES = ['Best Picture', 'Best Lead Performance', 'Best Supporting Performance', 'Best Director'] as const;

function recency(f: Film): number {
  const w = ((f.releaseAbs ?? 1) - 1) % 52 + 1;
  return w >= 40 ? 4 : w <= 12 ? -2 : 0;
}

function pickWinner(r: Rng, nominees: Nominee[]): number {
  // Highest score usually wins, but the voters can surprise.
  let best = 0;
  let bestV = -Infinity;
  nominees.forEach((n, i) => {
    const v = n.score + r.normal(0, 3.5);
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best;
}

export function buildCeremony(s: GameState, r: Rng): Ceremony {
  const films = Object.values(s.films).filter((f) => f.releaseSeason === s.season && f.critics !== null);
  const studioName = (id: string) => studioById(s, id)?.name ?? '?';
  const categories: AwardCategory[] = [];

  const picture = films
    .map<Nominee>((f) => ({
      filmId: f.id,
      filmTitle: f.title,
      studioId: f.studioId,
      studioName: studioName(f.studioId),
      personId: null,
      personName: null,
      score: f.critics! * 0.75 + f.audience! * 0.15 + recency(f) + (f.genre === 'Drama' ? 3 : f.genre === 'Horror' ? -4 : 0) + r.normal(0, 2.5),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  categories.push({ name: CATEGORIES[0], nominees: picture, winnerIndex: picture.length ? pickWinner(r, picture) : -1 });

  const perfNominees = (roles: string[]) => {
    const list: Nominee[] = [];
    for (const f of films) {
      for (const p of f.performances) {
        if (!roles.includes(p.role)) continue;
        const a = s.actors[p.actorId];
        if (!a) continue;
        list.push({
          filmId: f.id,
          filmTitle: f.title,
          studioId: f.studioId,
          studioName: studioName(f.studioId),
          personId: a.id,
          personName: fullName(a),
          score: p.score * 0.6 + f.critics! * 0.4 + recency(f) + r.normal(0, 2.5),
        });
      }
    }
    const seen = new Set<string>();
    return list
      .sort((a, b) => b.score - a.score)
      .filter((n) => (seen.has(n.personId!) ? false : (seen.add(n.personId!), true)))
      .slice(0, 5);
  };
  const lead = perfNominees(['lead', 'colead']);
  categories.push({ name: CATEGORIES[1], nominees: lead, winnerIndex: lead.length ? pickWinner(r, lead) : -1 });
  const support = perfNominees(['support']);
  categories.push({ name: CATEGORIES[2], nominees: support, winnerIndex: support.length ? pickWinner(r, support) : -1 });

  const seenD = new Set<string>();
  const dir = films
    .map<Nominee>((f) => {
      const d = s.directors[f.directorId];
      return {
        filmId: f.id,
        filmTitle: f.title,
        studioId: f.studioId,
        studioName: studioName(f.studioId),
        personId: d?.id ?? null,
        personName: d ? fullName(d) : null,
        score: f.directorScore * 0.5 + f.critics! * 0.5 + recency(f) + r.normal(0, 2.5),
      };
    })
    .sort((a, b) => b.score - a.score)
    .filter((n) => (n.personId && !seenD.has(n.personId) ? (seenD.add(n.personId), true) : false))
    .slice(0, 5);
  categories.push({ name: CATEGORIES[3], nominees: dir, winnerIndex: dir.length ? pickWinner(r, dir) : -1 });

  const ceremony: Ceremony = { season: s.season, name: `${AWARDS_NAME} — Season ${s.season}`, categories };
  applyAwards(s, ceremony);
  return ceremony;
}

function applyAwards(s: GameState, c: Ceremony): void {
  for (const cat of c.categories) {
    cat.nominees.forEach((n, i) => {
      const won = i === cat.winnerIndex;
      const st = studioById(s, n.studioId);
      if (st) {
        st.season.nominations += 1;
        if (won) st.season.wins += 1;
        st.reputation = clamp(st.reputation + (won ? 2 : 0.4), 0, 100);
      }
      const entry = { season: c.season, category: cat.name, title: n.filmTitle, won };
      if (cat.name === 'Best Director' && n.personId) {
        const d = s.directors[n.personId];
        if (d) {
          d.awards.push(entry);
          if (won) {
            d.skill = clamp(d.skill + 0.5, 1, 20);
            d.fee = Math.round(d.fee * 1.25 * 100) / 100;
          }
        }
      } else if (n.personId) {
        const a = s.actors[n.personId];
        if (a) {
          a.awards.push(entry);
          a.starPower = clamp(a.starPower + (won ? 2 : 0.6), 1, 20);
          a.morale = clamp(a.morale + (won ? 15 : 5), 0, 100);
          if (won) a.ego = clamp(a.ego + 1, 1, 20);
          const f = s.films[n.filmId];
          if (f) a.genreRep[f.genre] = clamp(a.genreRep[f.genre] + (won ? 12 : 4), 0, 100);
        }
      } else if (cat.name === 'Best Picture') {
        for (const slot of s.films[n.filmId]?.cast ?? []) {
          const a = s.actors[slot.actorId];
          if (!a) continue;
          a.awards.push(entry);
          if (won) a.starPower = clamp(a.starPower + 0.8, 1, 20);
        }
      }
    });
    const w = cat.nominees[cat.winnerIndex];
    if (w) pushNews(s, `${cat.name}: ${w.personName ? `${w.personName}, ` : ''}"${w.filmTitle}" (${w.studioName}).`, 'awards');
  }
  const mine = c.categories.flatMap((cat) => cat.nominees.map((n, i) => ({ cat: cat.name, n, won: i === cat.winnerIndex }))).filter((x) => x.n.studioId === s.playerId);
  pushInbox(s, {
    from: 'The Lantern Academy',
    subject: `${AWARDS_NAME}: ${mine.length} nomination${mine.length === 1 ? '' : 's'} for your studio`,
    body: mine.length
      ? mine.map((x) => `${x.won ? '★ WON' : '• Nominated'} — ${x.cat}: ${x.n.personName ? `${x.n.personName}, ` : ''}"${x.n.filmTitle}"`).join('\n')
      : 'Your studio was not recognised this year.',
    kind: 'awards',
  });
}
