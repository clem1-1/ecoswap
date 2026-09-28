/**
 * Leaf Points store — localStorage-backed (per wallet address).
 *
 * Storage strategy: LOCALSTORAGE (temporary fallback).
 * Points are stored under "ecoswap-leaves-{address}" so each wallet
 * has its own balance. A production version would persist this to a
 * lightweight backend (e.g. a Cloudflare Worker + KV, or a simple
 * Postgres table keyed by address + txHash) and verify on-chain that
 * the txHash is confirmed before awarding points.
 *
 * Rules enforced here:
 *  - Points are only awarded via `awardLeaves()`, which callers must
 *    invoke AFTER wagmi's `useWaitForTransactionReceipt` confirms success.
 *  - Each txHash is recorded so the same tx can never award twice.
 *  - First-time actions receive a bonus (tracked per action key).
 */

import { useState, useEffect, useCallback } from 'react';
import { LEAF_ACTIONS, type LeafActionKey } from '@/constants/leafPoints';

export interface LeafEntry {
  id: string;
  action: LeafActionKey | 'quest_reward';
  label: string;
  amount: number;
  txHash?: string;
  timestamp: number;
  bonus?: boolean;
}

export interface LeafStore {
  total: number;
  history: LeafEntry[];
  awardedTxHashes: string[];      // dedup guard
  firstTimeActions: LeafActionKey[]; // which actions already had first-time bonus
}

function storageKey(address: string) {
  return `ecoswap-leaves-${address.toLowerCase()}`;
}

function load(address: string): LeafStore {
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (raw) return JSON.parse(raw) as LeafStore;
  } catch { /* ignore */ }
  return { total: 0, history: [], awardedTxHashes: [], firstTimeActions: [] };
}

function save(address: string, store: LeafStore) {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(store));
  } catch { /* ignore */ }
}

// ─── Module-level pub/sub so multiple components react to changes ──────────
const listeners = new Set<() => void>();
function notify() { listeners.forEach((fn) => fn()); }

// ─── Public award function (call after tx confirmed) ──────────────────────
export function awardLeaves(
  address: string,
  action: LeafActionKey,
  txHash?: string,
  overrideLabel?: string,
  overrideAmount?: number,
) {
  const store = load(address);

  // Dedup by txHash
  if (txHash && store.awardedTxHashes.includes(txHash)) return;

  const cfg = LEAF_ACTIONS[action];
  const isFirst = !store.firstTimeActions.includes(action);
  const amount = overrideAmount ?? (cfg.base + (isFirst ? cfg.firstTime : 0));
  if (amount === 0) return;

  const entry: LeafEntry = {
    id: Math.random().toString(36).slice(2),
    action,
    label: overrideLabel ?? cfg.label + (isFirst ? ' (first time!)' : ''),
    amount,
    txHash,
    timestamp: Date.now(),
    bonus: isFirst && cfg.firstTime > 0,
  };

  const updated: LeafStore = {
    total: store.total + amount,
    history: [entry, ...store.history].slice(0, 200),
    awardedTxHashes: txHash ? [...store.awardedTxHashes, txHash].slice(-500) : store.awardedTxHashes,
    firstTimeActions: isFirst ? [...store.firstTimeActions, action] : store.firstTimeActions,
  };

  save(address, updated);
  notify();
}

// ─── Award for quests (no txHash, explicit amount) ────────────────────────
export function awardQuestLeaves(address: string, questId: string, label: string, amount: number) {
  const store = load(address);
  const dedupKey = `quest:${questId}`;
  if (store.awardedTxHashes.includes(dedupKey)) return;

  const entry: LeafEntry = {
    id: Math.random().toString(36).slice(2),
    action: 'quest_reward',
    label,
    amount,
    timestamp: Date.now(),
    bonus: true,
  };

  const updated: LeafStore = {
    total: store.total + amount,
    history: [entry, ...store.history].slice(0, 200),
    awardedTxHashes: [...store.awardedTxHashes, dedupKey],
    firstTimeActions: store.firstTimeActions,
  };

  save(address, updated);
  notify();
}

// ─── React hook ───────────────────────────────────────────────────────────
export function useLeafPoints(address?: string) {
  const [store, setStore] = useState<LeafStore>(() =>
    address ? load(address) : { total: 0, history: [], awardedTxHashes: [], firstTimeActions: [] },
  );

  const reload = useCallback(() => {
    if (address) setStore(load(address));
  }, [address]);

  useEffect(() => {
    listeners.add(reload);
    return () => { listeners.delete(reload); };
  }, [reload]);

  useEffect(() => {
    if (address) setStore(load(address));
  // setState on address change is intentional (syncing from localStorage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return store;
}

// ─── Leaderboard helpers ──────────────────────────────────────────────────
export function getLeaderboard(): { address: string; total: number }[] {
  const results: { address: string; total: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('ecoswap-leaves-0x')) continue;
    try {
      const store = JSON.parse(localStorage.getItem(key) ?? '{}') as LeafStore;
      const address = key.replace('ecoswap-leaves-', '');
      if (store.total > 0) results.push({ address, total: store.total });
    } catch { /* ignore */ }
  }
  return results.sort((a, b) => b.total - a.total).slice(0, 50);
}
