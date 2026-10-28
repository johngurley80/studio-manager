import { memo } from 'react';
import { hashString, type Genre } from '../sim';

const GENRE_PALETTE: Record<Genre, [string, string, string]> = {
  Drama: ['#2c4a6b', '#f2c14e', '#f4e7cf'],
  Comedy: ['#f2c14e', '#c2362b', '#16100d'],
  Action: ['#c2362b', '#f2c14e', '#16100d'],
  Thriller: ['#16100d', '#3fa7a0', '#f4e7cf'],
  Romance: ['#d97aa0', '#f4e7cf', '#7b2d4a'],
  Horror: ['#0b0807', '#c2362b', '#e8e4dc'],
  SciFi: ['#1b2a4a', '#5ccfb4', '#f2c14e'],
  Family: ['#3fa7a0', '#f2c14e', '#16100d'],
};

/** Procedural 1970s-style one-sheet. */
function PosterSvg({ title, genre, studio, width = 120 }: { title: string; genre: Genre; studio?: string; width?: number }) {
  const [bg, accent, ink] = GENRE_PALETTE[genre];
  const h = hashString(title);
  const motif = h % 4;
  const words = title.toUpperCase().split(' ');
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + w).length <= 11) lines[lines.length - 1] = last + ' ' + w;
    else lines.push(w);
  }
  const fs = lines.length > 3 ? 13 : lines.length > 2 ? 15 : 17;
  return (
    <svg viewBox="0 0 120 180" width={width} height={(width * 3) / 2} role="img" aria-label={`Poster for ${title}`} className="block rounded-md shadow-marquee">
      <rect width="120" height="180" fill={bg} />
      {motif === 0 && (
        <g transform="translate(60 92)">
          {[56, 44, 32, 20].map((r, i) => (
            <path key={r} d={`M${-r} 0a${r} ${r} 0 0 1 ${2 * r} 0z`} fill={i % 2 ? ink : accent} opacity={0.9 - i * 0.12} />
          ))}
        </g>
      )}
      {motif === 1 && (
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M60 70 L${60 + Math.cos((i / 12) * Math.PI * 2) * 120} ${70 + Math.sin((i / 12) * Math.PI * 2) * 120} L${60 + Math.cos(((i + 0.5) / 12) * Math.PI * 2) * 120} ${70 + Math.sin(((i + 0.5) / 12) * Math.PI * 2) * 120} Z`} fill={accent} opacity=".35" />
          ))}
          <circle cx="60" cy="70" r="22" fill={accent} />
        </g>
      )}
      {motif === 2 && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="0" y={40 + i * 14} width="120" height="7" fill={i % 2 ? ink : accent} opacity=".85" />
          ))}
        </g>
      )}
      {motif === 3 && (
        <g>
          <circle cx="60" cy="72" r="40" fill="none" stroke={accent} strokeWidth="6" />
          <circle cx="60" cy="72" r="26" fill="none" stroke={ink} strokeWidth="4" opacity=".6" />
          <circle cx="60" cy="72" r="12" fill={accent} />
        </g>
      )}
      <rect y="112" width="120" height="68" fill={ink} opacity=".82" />
      {lines.slice(0, 4).map((l, i) => (
        <text key={i} x="60" y={130 + i * (fs + 1)} textAnchor="middle" fontFamily="Oswald, Impact, sans-serif" fontWeight="700" fontSize={fs} fill={accent} letterSpacing=".5">
          {l}
        </text>
      ))}
      {studio && (
        <text x="60" y="174" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontSize="7" fill="#f4e7cf" opacity=".8" letterSpacing="1.2">
          {studio.toUpperCase()}
        </text>
      )}
      <rect x="2" y="2" width="116" height="176" fill="none" stroke="#f4e7cf" strokeOpacity=".25" />
    </svg>
  );
}

export const Poster = memo(PosterSvg);
