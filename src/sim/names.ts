import type { Rng } from './rng';
import type { Genre } from './types';

/**
 * All names in Back Lot are assembled from these invented word lists.
 * Surnames are built from syllables so the cast is never a real person.
 */
const FIRST = [
  'Ottilie', 'Caspian', 'Wren', 'Juno', 'Ezra', 'Linnea', 'Teodor', 'Marisol', 'Aurelio', 'Fenna',
  'Dashel', 'Imogen', 'Lucan', 'Saoirse', 'Bastian', 'Clementine', 'Orrin', 'Delphine', 'Rafferty', 'Thea',
  'Ignatius', 'Marlowe', 'Soren', 'Odalys', 'Pim', 'Rosalind', 'Calloway', 'Ines', 'Jasper', 'Kalinda',
  'Leander', 'Mireille', 'Niko', 'Oona', 'Peregrine', 'Quinta', 'Remy', 'Sabine', 'Tobiah', 'Ulla',
  'Valentin', 'Winifred', 'Xavi', 'Yara', 'Zephyr', 'Anouk', 'Benedek', 'Cosima', 'Desmond', 'Elodie',
  'Florian', 'Greer', 'Hollis', 'Isolde', 'Jory', 'Katalin', 'Lorcan', 'Maelle', 'Nestor', 'Ophira',
  'Priya', 'Ramsay', 'Sunniva', 'Tamsin', 'Umberto', 'Vesna', 'Wystan', 'Ximena', 'Yusuf', 'Zinnia',
  'Arlo', 'Bettina', 'Cyprian', 'Dagny', 'Emrys', 'Farrah', 'Gideon', 'Hattie', 'Idris', 'Jessamy',
  'Kit', 'Lavinia', 'Magnus', 'Nell', 'Ottavio', 'Philippa', 'Rune', 'Sorrel', 'Tycho', 'Verity',
];

const SUR_A = [
  'Ash', 'Bram', 'Cald', 'Dun', 'Ell', 'Fen', 'Garr', 'Hask', 'Ives', 'Kest', 'Lark', 'Marr',
  'Nock', 'Orr', 'Penn', 'Quill', 'Radd', 'Selk', 'Thorn', 'Vane', 'Wynd', 'Yarr', 'Brisk', 'Corv',
  'Drey', 'Esk', 'Frost', 'Gale', 'Holm', 'Jarr', 'Kell', 'Lumm', 'Mott', 'Nyle', 'Pell', 'Rook',
];

const SUR_B = [
  'ow', 'ick', 'aby', 'mere', 'ington', 'ley', 'ridge', 'well', 'croft', 'shaw', 'holt', 'dale',
  'worth', 'lock', 'ard', 'aven', 'brook', 'combe', 'hurst', 'ingham', 'stead', 'wood', 'more', 'ester',
];

export function personName(r: Rng): { first: string; last: string } {
  return { first: r.pick(FIRST), last: r.pick(SUR_A) + r.pick(SUR_B) };
}

const STUDIO_A = [
  'Copperline', 'Nightjar', 'Halcyon Reach', 'Saltmarsh', 'Ninefold', 'Bellwether', 'Quillfeather',
  'Ashgrove', 'Starling Row', 'Tidewater', 'Ironbark', 'Larkspur', 'Velvet Hour', 'Marrowgate', 'Oxbow',
  'Kestrel Point', 'Cinderhill', 'Brassmoor',
];
const STUDIO_B = ['Pictures', 'Studios', 'Films', 'Features', 'Motion Co.', 'Picture House'];

export function studioNames(r: Rng, count: number, exclude: string): string[] {
  const pool = r.shuffle(STUDIO_A).filter((n) => !exclude.toLowerCase().includes(n.toLowerCase()));
  return pool.slice(0, count).map((p) => `${p} ${r.pick(STUDIO_B)}`);
}

const ADJ: Record<Genre, string[]> = {
  Drama: ['Quiet', 'Paper', 'Borrowed', 'Winter', 'Salt', 'Unspoken', 'Long', 'Distant', 'Faded', 'Tender'],
  Comedy: ['Ridiculous', 'Accidental', 'Wobbly', 'Overdue', 'Unlikely', 'Spare', 'Fancy', 'Mismatched', 'Noisy', 'Second-Hand'],
  Action: ['Iron', 'Burning', 'Steel', 'Final', 'Rogue', 'Scorched', 'Crimson', 'Ballistic', 'Hollow', 'Thunder'],
  Thriller: ['Silent', 'Glass', 'Hidden', 'Cold', 'Narrow', 'Missing', 'Seventh', 'Pale', 'Crooked', 'Midnight'],
  Romance: ['Golden', 'Late', 'Summer', 'Sweet', 'Velvet', 'Lost', 'Blue', 'Tangled', 'Gentle', 'Painted'],
  Horror: ['Hungry', 'Rotten', 'Wailing', 'Bleak', 'Black', 'Crawling', 'Hollow', 'Drowned', 'Forgotten', 'Grinning'],
  SciFi: ['Orbital', 'Neon', 'Quantum', 'Distant', 'Synthetic', 'Ninth', 'Fractured', 'Chrome', 'Stellar', 'Silent'],
  Family: ['Magnificent', 'Little', 'Brave', 'Jolly', 'Marvellous', 'Clever', 'Merry', 'Tiny', 'Wandering', 'Lucky'],
};

const NOUN: Record<Genre, string[]> = {
  Drama: ['Orchard', 'Harbour', 'Letters', 'Inheritance', 'Tenement', 'Lighthouse', 'Ledger', 'Choir', 'Ferryman', 'Allotment'],
  Comedy: ['Wedding Planner', 'Caravan', 'Substitute', 'Neighbours', 'Landlord', 'Trombone', 'Reunion', 'Goat', 'Lottery', 'Bake-Off'],
  Action: ['Protocol', 'Vendetta', 'Convoy', 'Breach', 'Payload', 'Siege', 'Courier', 'Fault Line', 'Uprising', 'Gauntlet'],
  Thriller: ['Witness', 'Floor', 'Alibi', 'Frequency', 'Ledger', 'Tenant', 'Signal', 'Passenger', 'Verdict', 'Room'],
  Romance: ['Hour', 'Postcard', 'Season', 'Waltz', 'Promise', 'Harbour', 'Balcony', 'Telegram', 'Sonnet', 'Weekend'],
  Horror: ['Cellar', 'Hymn', 'Thing', 'Marsh', 'Doll', 'Chapel', 'Hollow', 'Tide', 'Nursery', 'Barn'],
  SciFi: ['Drift', 'Colony', 'Signal', 'Frontier', 'Engine', 'Horizon', 'Array', 'Exodus', 'Lattice', 'Meridian'],
  Family: ['Adventure', 'Balloon', 'Dragon Club', 'Treehouse', 'Expedition', 'Robot', 'Circus', 'Snowglobe', 'Kite', 'Parade'],
};

const PLACES = ['Marrowvale', 'Port Esker', 'Low Hennick', 'Saltreach', 'Thistledown', 'Carrow Bay', 'Ninebarrow', 'Orsk', 'Vellum Street', 'the Mire'];

export function filmTitle(r: Rng, genre: Genre): string {
  const adj = r.pick(ADJ[genre]);
  const noun = r.pick(NOUN[genre]);
  const n = personName(r);
  switch (r.int(0, 6)) {
    case 0:
      return `The ${adj} ${noun}`;
    case 1:
      return `${noun} of ${r.pick(PLACES)}`;
    case 2:
      return `${n.first}'s ${noun}`;
    case 3:
      return `${adj} ${noun}`;
    case 4:
      return `Last ${noun} in ${r.pick(PLACES)}`;
    case 5:
      return `The ${noun} at ${r.pick(PLACES)}`;
    default:
      return `${/^[AEIOU]/.test(adj) ? 'An' : 'A'} ${adj} ${noun}`;
  }
}

const LOGLINE: Record<Genre, string[]> = {
  Drama: [
    'Three estranged siblings return to sell the family orchard.',
    'A night-shift nurse keeps a dying patient’s last secret.',
    'A small-town choir enters the national finals against all odds.',
    'A ferryman’s daughter fights to keep the crossing open.',
  ],
  Comedy: [
    'Two rival wedding planners book the same venue on the same day.',
    'A disgraced chef becomes a primary-school dinner lady.',
    'A family reunion collapses when grandma reveals her lottery win.',
    'A substitute teacher accidentally leads the school to a robotics title.',
  ],
  Action: [
    'A retired courier is forced back for one last impossible delivery.',
    'A bridge engineer must stop a convoy before it reaches the capital.',
    'A disgraced bodyguard protects the witness who ruined her career.',
    'An off-grid mechanic holds a mountain pass against a mercenary army.',
  ],
  Thriller: [
    'A court stenographer realises the defendant is innocent.',
    'A radio host takes a call from a listener who knows too much.',
    'A night porter discovers a guest who checked in twice.',
    'A juror goes missing on the eve of the verdict.',
  ],
  Romance: [
    'Two translators fall for each other through the margins of a novel.',
    'A florist and a funeral director keep meeting at the worst moments.',
    'Pen pals agree to meet after twenty years — on the same balcony.',
    'A wedding band’s singer falls for every couple’s best man.',
  ],
  Horror: [
    'A choir hears a hymn no one remembers writing.',
    'New tenants find a nursery that wasn’t on the floor plan.',
    'A marsh village keeps one tradition the outsiders shouldn’t see.',
    'A restorer uncovers a painting that changes when no one is looking.',
  ],
  SciFi: [
    'The last crew of a drifting colony ship wakes up a century late.',
    'An archivist receives a signal from her own future.',
    'A lattice of satellites starts making decisions for the city.',
    'Two engineers race to restart a dead star’s engine.',
  ],
  Family: [
    'A girl and her grandad build a balloon to cross the bay.',
    'A school’s lost-property robot sets out to find its owner.',
    'A travelling circus is saved by its youngest clown.',
    'Four kids form a club to protect the last snow dragon.',
  ],
};

export function logline(r: Rng, genre: Genre): string {
  return r.pick(LOGLINE[genre]);
}

export const AWARDS_NAME = 'The Lantern Awards';
export const AWARD_VENUE = 'the Orpheum Vale Ballroom';
