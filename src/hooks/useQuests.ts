/**
 * Quest definitions and completion detection.
 * Completion is derived from the activity log + leaf point store
 * (which records first-time actions). On-chain quests are detected
 * from confirmed activity items, not from pending/failed ones.
 */

import { useMemo } from 'react';
import { useActivity } from './useActivity';

export interface Quest {
  id: string;
  icon: string;
  title: string;
  description: string;
  leafReward: number;
  /** How to detect completion — 'manual' means user-triggered (e.g. theme toggle) */
  detectFn: (ctx: QuestContext) => boolean;
  category: 'onboarding' | 'trading' | 'liquidity' | 'social' | 'exploration';
}

export interface QuestContext {
  isConnected: boolean;
  activityItems: ReturnType<typeof useActivity>['items'];
  theme: string;
  faucetClaimed: boolean;
  completedQuestIds: string[];
}

export const QUESTS: Quest[] = [
  {
    id: 'connect_wallet',
    icon: '🔗',
    title: 'Connect Your Wallet',
    description: 'Connect a wallet to start using EcoSwap.',
    leafReward: 10,
    category: 'onboarding',
    detectFn: (ctx) => ctx.isConnected,
  },
  {
    id: 'claim_faucet',
    icon: '💧',
    title: 'Claim from the Faucet',
    description: 'Visit the faucet page and get testnet USDC or EURC.',
    leafReward: 20,
    category: 'onboarding',
    detectFn: (ctx) => ctx.faucetClaimed,
  },
  {
    id: 'first_swap',
    icon: '🔄',
    title: 'Make Your First Swap',
    description: 'Swap any two tokens on EcoSwap.',
    leafReward: 25,
    category: 'trading',
    detectFn: (ctx) => ctx.activityItems.some((i) => i.type === 'swap'),
  },
  {
    id: 'stablecoin_swap',
    icon: '💵',
    title: 'Swap a Stablecoin Pair',
    description: 'Swap between USDC and EURC.',
    leafReward: 30,
    category: 'trading',
    detectFn: (ctx) =>
      ctx.activityItems.some(
        (i) => i.type === 'swap' &&
          (i.description.includes('USDC') || i.description.includes('EURC')) &&
          (i.description.includes('USDC') || i.description.includes('EURC')),
      ),
  },
  {
    id: 'swap_three_times',
    icon: '🔁',
    title: 'Swap Three Times',
    description: 'Complete three successful swaps in total.',
    leafReward: 40,
    category: 'trading',
    detectFn: (ctx) => ctx.activityItems.filter((i) => i.type === 'swap').length >= 3,
  },
  {
    id: 'add_liquidity',
    icon: '💧',
    title: 'Add Liquidity',
    description: 'Deposit tokens into a liquidity pool and earn LP tokens.',
    leafReward: 35,
    category: 'liquidity',
    detectFn: (ctx) => ctx.activityItems.some((i) => i.type === 'add_liquidity'),
  },
  {
    id: 'remove_liquidity',
    icon: '📤',
    title: 'Remove Liquidity',
    description: 'Withdraw your tokens from a pool.',
    leafReward: 20,
    category: 'liquidity',
    detectFn: (ctx) => ctx.activityItems.some((i) => i.type === 'remove_liquidity'),
  },
  {
    id: 'create_pool',
    icon: '🌊',
    title: 'Create a Pool',
    description: 'Deploy a brand new liquidity pool for any token pair.',
    leafReward: 50,
    category: 'liquidity',
    detectFn: (ctx) => ctx.activityItems.some((i) => i.type === 'create_pool'),
  },
  {
    id: 'try_other_theme',
    icon: '🎨',
    title: 'Try the Other Theme',
    description: 'Toggle between light and dark mode.',
    leafReward: 5,
    category: 'exploration',
    detectFn: (ctx) => ctx.completedQuestIds.includes('try_other_theme'),
  },
  {
    id: 'share_swap',
    icon: '🐦',
    title: 'Share Your Swap on X',
    description: 'Post about your swap on X (Twitter).',
    leafReward: 15,
    category: 'social',
    detectFn: (ctx) => ctx.completedQuestIds.includes('share_swap'),
  },
];

const QUEST_STORAGE_KEY = 'ecoswap-completed-quests';

export function getCompletedQuestIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(QUEST_STORAGE_KEY) ?? '[]') as string[];
  } catch { return []; }
}

export function markQuestComplete(id: string) {
  const ids = getCompletedQuestIds();
  if (!ids.includes(id)) {
    localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify([...ids, id]));
  }
}

export type QuestStatus = 'not_started' | 'completed';

export interface QuestWithStatus extends Quest {
  status: QuestStatus;
}

export function useQuests(ctx: Omit<QuestContext, 'completedQuestIds'>) {
  const completedIds = getCompletedQuestIds();
  const fullCtx: QuestContext = { ...ctx, completedQuestIds: completedIds };

  return useMemo(() => {
    return QUESTS.map((q): QuestWithStatus => ({
      ...q,
      status: (completedIds.includes(q.id) || q.detectFn(fullCtx)) ? 'completed' : 'not_started',
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.isConnected, ctx.activityItems, ctx.theme, ctx.faucetClaimed, completedIds.join(',')]);
}
