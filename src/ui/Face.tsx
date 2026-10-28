import { memo, useId } from 'react';
import type { FaceGenes } from '../sim';

const SKIN = ['#f6d7c3', '#eec1a1', '#e0a983', '#c98e66', '#a96f4b', '#8a5638', '#6b3f27', '#4e2c1c'];
const SKIN_SHADE = ['#e3b9a0', '#d9a382', '#c88c66', '#b0744f', '#8e5a3a', '#71452b', '#55301c', '#3b2014'];
const HAIR = ['#1d1512', '#3b2416', '#6b3d1f', '#a4652e', '#d9a85b', '#b5432a', '#b9b2a8', '#e8e4dc'];
const EYES = ['#3b2a1e', '#4f6b8a', '#4c7a4a', '#7a5a2e', '#2a2a2a'];
const BG = ['#f2c14e', '#e0682b', '#3fa7a0', '#c2362b', '#7b4d8f', '#8a8f3c'];

/** Back hair layer (drawn behind the head). */
function HairBack({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 2:
      return <path d="M22 50 Q20 20 50 16 Q80 20 78 50 L80 86 Q66 92 64 70 L36 70 Q34 92 20 86 Z" fill={color} />;
    case 5:
      return <path d="M24 46 Q22 18 50 15 Q78 18 76 46 L78 70 Q50 78 22 70 Z" fill={color} />;
    case 7:
      return <ellipse cx="50" cy="38" rx="34" ry="30" fill={color} />;
    case 9:
      return <path d="M25 48 Q22 18 50 15 Q78 18 75 48 L74 100 L26 100 Z" fill={color} />;
    default:
      return null;
  }
}

/** Front hair layer (fringe, crown). */
function HairFront({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0:
      return <path d="M28 40 Q28 20 50 19 Q72 20 72 40 Q64 30 50 31 Q36 30 28 40 Z" fill={color} />;
    case 1:
      return <path d="M27 42 Q26 18 52 18 Q74 20 73 38 Q60 26 44 30 Q34 33 27 42 Z" fill={color} />;
    case 2:
      return <path d="M27 44 Q28 19 50 18 Q72 19 73 44 Q66 28 50 27 Q34 28 27 44 Z" fill={color} />;
    case 3:
      return <path d="M30 34 Q34 20 50 20 Q66 20 70 34 Q60 28 50 28 Q40 28 30 34 Z" fill={color} opacity=".85" />;
    case 4:
      return (
        <g fill={color}>
          <circle cx="50" cy="22" r="13" />
          <circle cx="36" cy="27" r="10" />
          <circle cx="64" cy="27" r="10" />
          <circle cx="29" cy="37" r="7" />
          <circle cx="71" cy="37" r="7" />
        </g>
      );
    case 5:
      return <path d="M27 44 Q26 18 50 17 Q74 18 73 44 L70 36 Q60 24 40 30 L30 38 Z" fill={color} />;
    case 6:
      return <path d="M29 36 Q30 22 50 21 Q70 22 71 36 Q50 30 29 36 Z" fill={color} />;
    case 7:
      return (
        <g fill={color}>
          <circle cx="50" cy="20" r="14" />
          <circle cx="33" cy="28" r="12" />
          <circle cx="67" cy="28" r="12" />
          <circle cx="26" cy="42" r="9" />
          <circle cx="74" cy="42" r="9" />
        </g>
      );
    case 8:
      return <path d="M40 14 Q50 8 60 14 L58 30 L42 30 Z" fill={color} />;
    case 9:
      return <path d="M27 44 Q27 18 50 17 Q73 18 73 44 Q70 30 58 28 Q50 34 40 28 Q30 30 27 44 Z" fill={color} />;
    default:
      return null;
  }
}

function FaceSvg({ face, size = 48, className = '', title }: { face: FaceGenes; size?: number; className?: string; title?: string }) {
  const skin = SKIN[face.skin % SKIN.length];
  const shade = SKIN_SHADE[face.skin % SKIN.length];
  const hair = HAIR[face.hairColor % HAIR.length];
  const eye = EYES[face.eyeColor % EYES.length];
  const bg = BG[face.bg % BG.length];
  const jawW = [21, 23, 19, 22][face.jaw % 4];
  const jawH = [25, 24, 27, 26][face.jaw % 4];
  const eyeY = 46;
  const browTilt = [0, 2, -2, 1][face.brows % 4];
  const clip = `fc${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={title ?? 'Portrait'}>
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="100" fill={bg} />
        <path d="M0 74 L100 74 L100 100 L0 100 Z" fill="#000" opacity=".08" />
        <HairBack style={face.hair % 10} color={hair} />
        {/* shoulders and neck */}
        <path d="M14 104 Q16 80 50 78 Q84 80 86 104 Z" fill={['#1f1712', '#c2362b', '#3fa7a0', '#f4e7cf', '#2c4a6b'][face.bg % 5]} />
        <rect x="42" y="62" width="16" height="18" fill={shade} />
        {/* head */}
        <ellipse cx="50" cy="46" rx={jawW} ry={jawH} fill={skin} />
        <ellipse cx={50 - jawW} cy="48" rx="3.5" ry="5" fill={shade} />
        <ellipse cx={50 + jawW} cy="48" rx="3.5" ry="5" fill={shade} />
        {/* eyes */}
        {face.eyes % 4 === 3 ? (
          <g stroke="#1d1512" strokeWidth="1.8" fill="none" strokeLinecap="round">
            <path d={`M37 ${eyeY} q4 -3 8 0`} />
            <path d={`M55 ${eyeY} q4 -3 8 0`} />
          </g>
        ) : (
          <g>
            <ellipse cx="41" cy={eyeY} rx={face.eyes % 4 === 1 ? 3.6 : 3} ry={face.eyes % 4 === 2 ? 2 : 2.6} fill="#fff" />
            <ellipse cx="59" cy={eyeY} rx={face.eyes % 4 === 1 ? 3.6 : 3} ry={face.eyes % 4 === 2 ? 2 : 2.6} fill="#fff" />
            <circle cx="41.3" cy={eyeY} r="1.6" fill={eye} />
            <circle cx="59.3" cy={eyeY} r="1.6" fill={eye} />
          </g>
        )}
        {/* brows */}
        <g stroke={face.hairColor >= 6 ? '#8d857a' : hair} strokeWidth={face.brows % 4 === 1 ? 2.6 : 1.8} strokeLinecap="round">
          <line x1="36" y1={eyeY - 6 + browTilt} x2="45" y2={eyeY - 7} />
          <line x1="55" y1={eyeY - 7} x2="64" y2={eyeY - 6 + browTilt} />
        </g>
        {/* nose */}
        {
          [
            <path key="n0" d="M50 48 L47 56 L51 56" stroke={shade} strokeWidth="1.6" fill="none" strokeLinecap="round" />,
            <ellipse key="n1" cx="50" cy="55" rx="3.2" ry="2" fill={shade} />,
            <path key="n2" d="M49 47 Q46 55 50 57 Q53 56 52 55" stroke={shade} strokeWidth="1.6" fill="none" />,
            <path key="n3" d="M47 56 Q50 58 53 56" stroke={shade} strokeWidth="1.8" fill="none" strokeLinecap="round" />,
          ][face.nose % 4]
        }
        {/* mouth */}
        {
          [
            <path key="m0" d="M43 62 Q50 67 57 62" stroke="#7a2e22" strokeWidth="2" fill="none" strokeLinecap="round" />,
            <path key="m1" d="M44 62 L56 62" stroke="#7a2e22" strokeWidth="2" strokeLinecap="round" />,
            <path key="m2" d="M42 61 Q50 70 58 61 Z" fill="#7a2e22" />,
            <path key="m3" d="M44 63 Q50 60 56 63" stroke="#7a2e22" strokeWidth="2" fill="none" strokeLinecap="round" />,
            <ellipse key="m4" cx="50" cy="63" rx="4" ry="2.4" fill="#a8432f" />,
          ][face.mouth % 5]
        }
        <HairFront style={face.hair % 10} color={hair} />
        {/* extras */}
        {face.extra === 1 && (
          <g fill="none" stroke="#1d1512" strokeWidth="1.6">
            <circle cx="41" cy={eyeY} r="6" />
            <circle cx="59" cy={eyeY} r="6" />
            <line x1="47" y1={eyeY} x2="53" y2={eyeY} />
          </g>
        )}
        {face.extra === 2 && <path d="M41 59 Q50 55 59 59 Q50 61 41 59 Z" fill={hair} />}
        {face.extra === 3 && <path d={`M${50 - jawW + 3} 52 Q50 82 ${50 + jawW - 3} 52 Q58 66 50 66 Q42 66 ${50 - jawW + 3} 52 Z`} fill={hair} opacity=".95" />}
        {face.extra === 4 && <circle cx={50 + jawW + 1} cy="56" r="1.8" fill="#f2c14e" />}
        {face.extra === 5 && (
          <g fill={shade}>
            <circle cx="38" cy="53" r=".9" />
            <circle cx="41" cy="55" r=".9" />
            <circle cx="62" cy="53" r=".9" />
            <circle cx="59" cy="55" r=".9" />
          </g>
        )}
      </g>
    </svg>
  );
}

export const Face = memo(FaceSvg);
