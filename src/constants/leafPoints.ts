// ─── Leaf Points Config ────────────────────────────────────────────────────
// Edit values here to tune the rewards system. All values are in "leaves".

export const LEAF_ACTIONS = {
  swap:             { base: 10, firstTime: 25, label: 'Swap'                    },
  add_liquidity:    { base: 15, firstTime: 30, label: 'Add Liquidity'           },
  remove_liquidity: { base:  5, firstTime: 10, label: 'Remove Liquidity'        },
  create_pool:      { base: 50, firstTime: 50, label: 'Create Pool'             },
  faucet_claim:     { base: 20, firstTime: 20, label: 'Faucet Claim'            },
  quest_complete:   { base:  0, firstTime:  0, label: 'Quest Completed'         }, // bonus set per quest
} as const;

export type LeafActionKey = keyof typeof LEAF_ACTIONS;

// ─── Levels ───────────────────────────────────────────────────────────────
export interface Level {
  id: number;
  name: string;
  minLeaves: number;
  emoji: string;         // used in tree illustration
  color: string;
}

export const LEVELS: Level[] = [
  { id: 0, name: 'Seed',    minLeaves:    0, emoji: '🌱', color: '#8FA8A0' },
  { id: 1, name: 'Sprout',  minLeaves:   50, emoji: '🌿', color: '#4ADE80' },
  { id: 2, name: 'Sapling', minLeaves:  150, emoji: '🌲', color: '#22C55E' },
  { id: 3, name: 'Tree',    minLeaves:  400, emoji: '🌳', color: '#16A34A' },
  { id: 4, name: 'Forest',  minLeaves: 1000, emoji: '🏕️', color: '#0F9D6B' },
];

export function getLevel(leaves: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (leaves >= LEVELS[i].minLeaves) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(leaves: number): Level | null {
  const cur = getLevel(leaves);
  return LEVELS.find((l) => l.id === cur.id + 1) ?? null;
}

export function getLevelProgress(leaves: number): number {
  const cur = getLevel(leaves);
  const next = getNextLevel(leaves);
  if (!next) return 100;
  const range = next.minLeaves - cur.minLeaves;
  const progress = leaves - cur.minLeaves;
  return Math.min(100, Math.round((progress / range) * 100));
}
