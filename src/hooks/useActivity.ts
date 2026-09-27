import { useState, useEffect } from 'react';

export type ActivityType = 'swap' | 'add_liquidity' | 'remove_liquidity' | 'create_pool';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  txHash?: string;
  timestamp: number;
  chainId: number;
  explorerBase: string;
}

const MAX_ITEMS = 50;

let globalItems: ActivityItem[] = [];
const listeners = new Set<() => void>();

export function addActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
  const entry: ActivityItem = {
    ...item,
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
  };
  globalItems = [entry, ...globalItems].slice(0, MAX_ITEMS);
  listeners.forEach((fn) => fn());
}

export function useActivity() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const notify = () => setTick((t) => t + 1);
    listeners.add(notify);
    return () => { listeners.delete(notify); };
  }, []);

  return { items: globalItems };
}
