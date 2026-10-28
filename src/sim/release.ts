import { GENRE_APPEAL, GENRE_FAMILY, STYLES, TIERS, seasonality } from './data';
import { appeal, awareness, evaluateFilm, filmChemistry, hypeScore, legsFor, reach } from './film';
import { fullName } from './people';
import type { Rng } from './rng';
import { absToSeasonWeek, absWeek, earn, pushInbox, pushNews, spend, studioById } from './state';
import type { Film, GameState, Genre, ReleaseReport, ReleaseTick, Studio, TickRival } from './types';
import { clamp, fmtMoney } from './util';

export function overlap(a: Genre, b: Genre): number {
  if (a === b) return 1;
  return GENRE_FAMILY[a].includes(b) ? 0.6 : 0.3;
}

/** Films opening on a given absolute week. */
export function openingsOn(s: GameState, abs: number): Film[] {
  return Object.values(s.films).filter((f) => f.releaseAbs === abs && (f.status === 'scheduled' || f.status === 'released' || f.status === 'finished'));
}

/** How crowded a weekend is for a film of a given genre (0 = empty). */
export function crowding(s: GameState, abs: number, genre: Genre, excludeId?: string): number {
  let c = 0;
  for (const f of Object.values(s.films)) {
    if (f.id === excludeId || f.releaseAbs === null) continue;
    if (f.status !== 'scheduled' && f.status !== 'released') continue;
    if (f.releaseAbs === abs) c += overlap(genre, f.genre) * TIERS[f.tier].size;
    else if (f.releaseAbs === abs - 1) c += overlap(genre, f.genre) * TIERS[f.tier].size * 0.5;
  }
  return c;
}

export function competitionFactor(c: number): number {
  return clamp(1 / (1 + 0.16 * c), 0.5, 1);
}

export function scheduleRelease(s: GameState, f: Film, abs: number, marketingRatio: number): void {
  const st = studioById(s, f.studioId)!;
  f.marketing = Math.round(f.budget * marketingRatio * 10) / 10;
  spend(st, f.marketing);
  f.spent += f.marketing;
  f.releaseAbs = abs;
  f.releaseSeason = absToSeasonWeek(abs).season;
  f.status = 'scheduled';
}

function filmStarPower(s: GameState, f: Film): number {
  const sp = (role: string) =>
    f.cast
      .filter((c) => c.role === role)
      .map((c) => s.actors[c.actorId]?.starPower ?? 0);
  return (sp('lead')[0] ?? 0) * 0.5 + (sp('colead')[0] ?? 0) * 0.3 + Math.max(0, ...sp('support')) * 0.2;
}

export function filmHype(s: GameState, f: Film, marketingRatio?: number): number {
  const st = studioById(s, f.studioId)!;
  return hypeScore({
    starPower: filmStarPower(s, f),
    marketingRatio: marketingRatio ?? f.marketing / f.budget,
    reputation: st.reputation,
    genre: f.genre,
    hypeMod: f.hypeMod,
    director: s.directors[f.directorId] ?? null,
  });
}

interface Opener {
  film: Film;
  studio: Studio;
  hype: number;
  potential: number;
  weekend: number;
  front: number;
}

const HEADLINE_SLOTS = ['Thursday previews', 'Friday matinee', 'Friday night', 'Saturday matinee', 'Saturday night', 'Sunday matinee', 'Sunday close'];
const BASE_CURVE = [0.08, 0.22, 0.4, 0.58, 0.75, 0.88, 1];

function curve(front: number): number[] {
  // front > 0 means the audience turned up early (hype) and fell off (weak word of mouth)
  return BASE_CURVE.map((v, i) => (i === BASE_CURVE.length - 1 ? 1 : Math.pow(v, 1 - front * 0.28)));
}

/** Processes all openings this week (every studio). Returns player release reports. */
export function processReleases(s: GameState, r: Rng): ReleaseReport[] {
  const abs = absWeek(s);
  const week = s.week;
  const openers: Opener[] = [];
  for (const f of Object.values(s.films)) {
    if (f.status !== 'scheduled' || f.releaseAbs !== abs) continue;
    const studio = studioById(s, f.studioId)!;
    const director = s.directors[f.directorId] ?? null;
    const q = evaluateFilm(
      {
        genre: f.genre,
        tier: f.tier,
        scriptQuality: f.scriptQuality,
        genreFit: f.genreFit,
        demands: f.demands,
        director,
        cast: f.cast,
        criticsMod: f.criticsMod,
        audienceMod: f.audienceMod,
        chemistryMod: f.chemistryMod,
      },
      s.actors,
    );
    const variance = director ? STYLES[director.style].variance : 1;
    f.critics = Math.round(clamp(q.critics + r.normal(0, 5.5 * variance), 3, 99));
    f.audience = Math.round(clamp(q.audience + r.normal(0, 5.5 * variance), 3, 99));
    f.performances = q.performances.map((p) => ({ ...p, score: Math.round(clamp(p.score * 5 + r.normal(0, 4), 1, 100)) }));
    f.directorScore = Math.round(q.direction);
    const hype = filmHype(s, f);
    const luck = Math.exp(r.normal(0, 0.16));
    const potential =
      reach(f.budget) * awareness(hype) * appeal(f.audience) * GENRE_APPEAL[f.genre] * seasonality(week) * luck;
    openers.push({ film: f, studio, hype, potential, weekend: 0, front: clamp((hype - f.audience) / 40, -1, 1) });
  }
  const holdovers = Object.values(s.films).filter((f) => f.status === 'released' && f.releaseAbs === abs - 1);
  for (const o of openers) {
    let c = 0;
    for (const other of openers) if (other !== o) c += overlap(o.film.genre, other.film.genre) * TIERS[other.film.tier].size;
    for (const h of holdovers) c += overlap(o.film.genre, h.genre) * TIERS[h.tier].size * 0.5;
    const first = o.potential * competitionFactor(c);
    o.film.firstWeek = first;
    o.film.legs = legsFor(o.film.critics!, o.film.audience!);
    o.weekend = first / 1.5;
    o.film.openingWeekend = o.weekend;
    o.film.status = 'released';
    o.film.weeksInRelease = 0;
    o.studio.season.releases += 1;
    o.studio.season.criticsSum += o.film.critics!;
    const repDelta = ((o.film.critics! + o.film.audience!) / 2 - 62) / 30;
    o.studio.reputation = clamp(o.studio.reputation + (repDelta > 0 ? repDelta * (1 - o.studio.reputation / 110) : repDelta), 0, 100);
  }
  const holdWeekends = holdovers.map((h) => ({ film: h, weekend: (h.lastWeekGross * (1 - 1 / h.legs)) / 1.5 }));
  const board = [...openers.map((o) => ({ film: o.film, weekend: o.weekend })), ...holdWeekends].sort((a, b) => b.weekend - a.weekend);
  board.forEach((b, i) => {
    if (b.film.status === 'released' && b.film.weeksInRelease === 0) b.film.weekendRank = i + 1;
  });

  for (const o of openers) recordCareer(s, o.film);
  const top = board[0];
  if (top) {
    const st = studioById(s, top.film.studioId)!;
    pushNews(s, `"${top.film.title}" (${st.name}) tops the weekend chart with ${fmtMoney(top.weekend)}.`, 'release');
  }

  const reports: ReleaseReport[] = [];
  for (const o of openers) {
    if (o.film.studioId !== s.playerId) continue;
    reports.push(buildReport(s, o, openers, holdWeekends, board.length, r));
  }
  return reports;
}

function recordCareer(s: GameState, f: Film): void {
  const studio = studioById(s, f.studioId)!;
  for (const c of f.cast) {
    const a = s.actors[c.actorId];
    if (!a) continue;
    a.history.push({ season: s.season, filmId: f.id, title: f.title, role: c.role, studioName: studio.name, critics: f.critics!, gross: 0 });
    const quality = (f.critics! + f.audience!) / 2;
    a.morale = clamp(a.morale + (quality >= 70 ? 8 : quality < 45 ? -6 : 1), 0, 100);
    a.genreRep[f.genre] = clamp(a.genreRep[f.genre] + (quality - 50) / 6 + (c.role === 'support' ? 0 : 3), 0, 100);
    const starDelta = c.role === 'support' ? (quality - 55) / 60 : (quality - 50) / 25 + (f.weekendRank === 1 ? 0.6 : 0);
    a.starPower = clamp(a.starPower + starDelta * (f.tier === 'micro' ? 0.4 : f.tier === 'tentpole' ? 1.4 : 1), 1, 20);
  }
}

function buildReport(
  s: GameState,
  me: Opener,
  openers: Opener[],
  holds: { film: Film; weekend: number }[],
  boardSize: number,
  r: Rng,
): ReleaseReport {
  const f = me.film;
  const rivalsSrc = [
    ...openers.filter((o) => o !== me).map((o) => ({ film: o.film, weekend: o.weekend, front: o.front })),
    ...holds.map((h) => ({ film: h.film, weekend: h.weekend, front: 0.3 })),
  ]
    .sort((a, b) => b.weekend - a.weekend)
    .slice(0, 4);
  const myCurve = curve(me.front);
  const rivalCurves = rivalsSrc.map((x) => curve(x.front));
  const headlines = makeHeadlines(s, me, (rivalsSrc.find((x) => x.film.studioId !== f.studioId) ?? rivalsSrc[0])?.film ?? null, r);
  const ticks: ReleaseTick[] = HEADLINE_SLOTS.map((label, i) => ({
    label,
    player: me.weekend * myCurve[i],
    rivals: rivalsSrc.map<TickRival>((x, j) => {
      const st = studioById(s, x.film.studioId)!;
      return { filmId: x.film.id, title: x.film.title, studioName: st.name, color: st.color, value: x.weekend * rivalCurves[j][i] };
    }),
    headline: headlines[i] ?? null,
  }));
  const projectedTotal = f.firstWeek * f.legs;
  const cost = f.budget + f.marketing;
  const ratio = (projectedTotal * 0.5 + f.budget * 0.25) / cost;
  const verdict =
    ratio >= 1.6
      ? 'SMASH HIT'
      : ratio >= 1.15
        ? 'SOLID HIT'
        : ratio >= 0.9
          ? 'BREAK-EVEN'
          : ratio >= 0.65
            ? 'DISAPPOINTMENT'
            : 'BOX OFFICE BOMB';
  pushInbox(s, {
    from: 'Distribution',
    subject: `Opening weekend: "${f.title}" ${fmtMoney(me.weekend)}`,
    body: `"${f.title}" opened at #${f.weekendRank} with ${fmtMoney(me.weekend)}. Critics ${f.critics}, audiences ${f.audience}. Projected total ${fmtMoney(projectedTotal)}. Verdict: ${verdict.toLowerCase()}.`,
    kind: 'studio',
  });
  return {
    filmId: f.id,
    title: f.title,
    genre: f.genre,
    weekend: me.weekend,
    critics: f.critics!,
    audience: f.audience!,
    rank: f.weekendRank,
    openers: boardSize,
    ticks,
    verdict,
    projectedTotal,
  };
}

function makeHeadlines(s: GameState, me: Opener, rival: Film | null, r: Rng): string[] {
  const f = me.film;
  const leadSlot = f.cast.find((c) => c.role === 'lead');
  const coSlot = f.cast.find((c) => c.role === 'colead');
  const lead = leadSlot ? s.actors[leadSlot.actorId] : null;
  const co = coSlot ? s.actors[coSlot.actorId] : null;
  const d = s.directors[f.directorId];
  const leadPerf = f.performances.find((p) => p.role === 'lead')?.score ?? 50;
  const out: string[] = [];
  out.push(
    me.hype > 75
      ? 'Lines around the block for Thursday previews'
      : me.hype > 50
        ? 'Healthy crowds for the first previews'
        : 'Previews are quiet — the marketing barely registered',
  );
  out.push(
    f.critics! >= 75
      ? r.pick(['Critics rave about the third act', 'Reviews are in: a modern classic?', 'Critics call it the best of the year so far'])
      : f.critics! >= 55
        ? r.pick(['Reviews are warm, if not ecstatic', 'Critics: "solid, crowd-pleasing work"'])
        : r.pick(['Reviewers pan a muddled script', 'Critics are sharpening their knives', '"A slog," says one prominent reviewer']),
  );
  if (lead) {
    out.push(
      leadPerf >= 70
        ? `${fullName(lead)} is magnetic in the lead`
        : leadPerf >= 50
          ? `${fullName(lead)} holds the film together`
          : `${fullName(lead)} looks miscast, say early viewers`,
    );
  }
  if (rival) {
    out.push(
      rival.openingWeekend > me.weekend
        ? `"${rival.title}" is eating into the Friday crowd`
        : `"${rival.title}" can't keep pace`,
    );
  } else {
    out.push('A clear weekend: no major competition in sight');
  }
  if (lead && co) {
    const chem = filmChemistry(f.cast, s.actors) + f.chemistryMod;
    out.push(
      chem >= 64
        ? `${lead.first} and ${co.first} light up the screen together`
        : chem < 42
          ? `Audiences notice zero spark between ${lead.first} and ${co.first}`
          : `Saturday crowds are steady for ${lead.first} and ${co.first}`,
    );
  }
  out.push(
    f.audience! >= 70
      ? 'Strong word of mouth heading into Sunday'
      : f.audience! >= 50
        ? 'Word of mouth is mixed'
        : 'Word of mouth is slowing',
  );
  if (d) {
    out.push(
      f.directorScore >= 70
        ? `${fullName(d)}'s confident direction wins over the doubters`
        : `Final estimates are in for ${fullName(d)}'s film`,
    );
  }
  return out;
}

/** Weekly theatrical income for every film on release. */
export function boxOfficeWeek(s: GameState): void {
  const seasonal = seasonality(s.week);
  for (const f of Object.values(s.films)) {
    if (f.status !== 'released') continue;
    const st = studioById(s, f.studioId);
    if (!st) continue;
    let g: number;
    if (f.weeksInRelease === 0) g = f.firstWeek;
    else g = f.lastWeekGross * (1 - 1 / f.legs) * (0.92 + seasonal * 0.08);
    f.weeksInRelease += 1;
    f.lastWeekGross = g;
    f.gross += g;
    f.seasonGross[s.season] = (f.seasonGross[s.season] ?? 0) + g;
    st.season.gross += g;
    earn(st, g * 0.5);
    for (const c of f.cast) {
      const h = s.actors[c.actorId]?.history.find((x) => x.filmId === f.id);
      if (h) h.gross = f.gross;
    }
    if (g < 0.3 || f.weeksInRelease >= 16) finishRun(s, f, st);
  }
}

function finishRun(s: GameState, f: Film, st: Studio): void {
  f.status = 'finished';
  const q = ((f.critics ?? 50) + (f.audience ?? 50)) / 200;
  f.streaming = Math.round((f.budget * (0.15 + q * 0.35) + f.gross * 0.05) * 10) / 10;
  earn(st, f.streaming);
  if (f.gross >= 2 * (f.budget + f.marketing)) st.season.hits += 1;
  if (st.id === s.playerId) {
    pushInbox(s, {
      from: 'Distribution',
      subject: `"${f.title}" leaves cinemas`,
      body: `"${f.title}" finished its run with ${fmtMoney(f.gross)} worldwide. A streaming deal adds ${fmtMoney(f.streaming)}.`,
      kind: 'finance',
    });
  }
}
