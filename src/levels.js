// Level layout, derived from content/transcript.txt.
// The talk splits software work into two roles: user-focused "design engineers"
// and execution-focused "system-oriented engineers / architects". Each path walks
// through the disciplines the transcript folds into that role.

export const VIDEO_ID = 'pCh6lQ3-bgE';

export const COLORS = {
  center: '#39ff88',
  design: '#ff3df2',
  systems: '#2ef2ff',
  goal: '#ffd23f',
};

export const CENTER = {
  id: 'center',
  branch: 'center',
  label: 'Software Engineering',
  blurb: 'AI makes everyone more of a generalist. The old disciplines collapse into two roles. Pick a path.',
  pos: [0, 0, 0],
  size: 10,
  thickness: 2,
};

export const MASTER = {
  id: 'master',
  label: 'Master · CPO',
  blurb: 'Cross both domains, from the user all the way to the architecture. Rare, and AI is making it more common.',
};

// heading: direction from the previous platform in degrees (180 = -x, 270 = -z, toward the jumbotron).
// gap: edge-to-edge distance along that heading. rise: height gained.
const DESIGN_PATH = [
  { id: 'design-engineer', label: 'Design Engineer', size: 6, gap: 2.4, rise: 0.6, heading: 180,
    blurb: 'User-focused. Owns the user experience, from what the user needs all the way to the interface.' },
  { id: 'ux', label: 'User Experience', size: 5, gap: 2.6, rise: 0.8, heading: 194,
    blurb: 'Really understand the user, and translate their needs into an interface.' },
  { id: 'discovery', label: 'Discovery', size: 5, gap: 2.8, rise: 0.6, heading: 208,
    blurb: 'Work out what is worth building. Design still happens on its own while a concept takes shape.' },
  { id: 'pm', label: 'PM Work', size: 5, gap: 2.9, rise: 1.0, heading: 222,
    blurb: 'Product management folds in: specs get shaped live with the team and the agent, not handed down.' },
  { id: 'visual', label: 'Visual Design', size: 5, gap: 3.0, rise: 0.8, heading: 236,
    blurb: 'Visual taste is required. Implementing somebody else\'s mockups is no longer enough.' },
  { id: 'frontend', label: 'Front-End\nDevelopment', size: 5, gap: 3.1, rise: 1.0, heading: 250,
    blurb: 'Own the front-end decisions and architecture, and make sure it plugs cleanly into the system.' },
  { id: 'product-owner', label: 'Product Owner', size: 8, gap: 3.2, rise: 0.8, heading: 262, goal: true,
    blurb: 'Above the domain: think about the whole outcome. Users, product lines, the business.' },
];

const SYSTEMS_PATH = [
  { id: 'systems-engineer', label: 'System-Oriented\nEngineer', size: 6, gap: 2.4, rise: 0.6, heading: 180,
    blurb: 'Execution-focused: the architect. Glues together everything that lives behind the interface.' },
  { id: 'backend', label: 'Back-End', size: 5, gap: 2.6, rise: 0.8, heading: 194,
    blurb: 'The server side of the product, now owned by one execution-minded engineer instead of a team of specialists.' },
  { id: 'database', label: 'Database\nEngineering', size: 5, gap: 2.8, rise: 0.6, heading: 208,
    blurb: 'Structure the data so the design can actually be satisfied.' },
  { id: 'devops', label: 'DevOps', size: 5, gap: 2.9, rise: 1.0, heading: 222,
    blurb: 'How the application is built, deployed and kept running.' },
  { id: 'security', label: 'Security', size: 5, gap: 3.0, rise: 0.8, heading: 236,
    blurb: 'How secure the system is, and how secure its data is.' },
  { id: 'architecture', label: 'Architecture', size: 5, gap: 3.1, rise: 1.0, heading: 250,
    blurb: 'The big decisions: seeing how a change here ripples through everything else.' },
  { id: 'principal', label: 'Principal\nEngineer', size: 8, gap: 3.2, rise: 0.8, heading: 262, goal: true,
    blurb: 'Lead the team. Shape the spec with the agent, let mid-levels and juniors co-labor on the build, keep a human in the loop.' },
];

function layoutPath(nodes, branch, mirror) {
  const out = [];
  let prev = CENTER;
  for (const n of nodes) {
    const rad = (n.heading * Math.PI) / 180;
    const dx = Math.cos(rad) * mirror;
    const dz = Math.sin(rad);
    // Distance from a square's center to its edge along (dx, dz).
    const reach = (s) => s / 2 / Math.max(Math.abs(dx), Math.abs(dz));
    const dist = reach(prev.size) + n.gap + reach(n.size);
    const p = {
      ...n,
      branch,
      thickness: n.goal ? 1.6 : 1.2,
      pos: [prev.pos[0] + dx * dist, prev.pos[1] + n.rise, prev.pos[2] + dz * dist],
    };
    out.push(p);
    prev = p;
  }
  return out;
}

export const PATHS = {
  design: layoutPath(DESIGN_PATH, 'design', 1),
  systems: layoutPath(SYSTEMS_PATH, 'systems', -1),
};

export const PLATFORMS = [CENTER, ...PATHS.design, ...PATHS.systems];

// Dev check: warn if any consecutive jump is out of comfortable reach.
export function checkReach({ maxGap = 3.6, maxRise = 1.3 } = {}) {
  for (const path of Object.values(PATHS)) {
    let prev = CENTER;
    for (const p of path) {
      const ax = Math.max(0, Math.abs(p.pos[0] - prev.pos[0]) - (p.size + prev.size) / 2);
      const az = Math.max(0, Math.abs(p.pos[2] - prev.pos[2]) - (p.size + prev.size) / 2);
      const gap = Math.hypot(ax, az);
      const rise = p.pos[1] - prev.pos[1];
      if (gap > maxGap || rise > maxRise) {
        console.warn(`[levels] ${prev.id} -> ${p.id} may be unreachable (gap ${gap.toFixed(2)}, rise ${rise.toFixed(2)})`);
      }
      prev = p;
    }
  }
}
