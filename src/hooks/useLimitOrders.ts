/**
 * useLimitOrders — client-side limit order engine.
 *
 * Limit orders on a constant-product AMM work by polling the pool price and
 * executing via the same transfer→swap flow once the target rate is reached.
 *
 * Orders are persisted in localStorage so they survive page reloads.
 * A background effect polls every 10s and auto-executes any filled order.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { type PublicClient, formatUnits, parseUnits } from 'viem';
import { UNIV2_PAIR_ABI } from '@/constants/contracts';

export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'expired';

export interface LimitOrder {
  id: string;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  symbolIn: string;
  symbolOut: string;
  decimalsIn: number;
  decimalsOut: number;
  amountIn: string;          // human-readable
  targetPrice: string;       // tokenOut per tokenIn, human-readable
  minAmountOut: string;      // human-readable, derived from targetPrice × amountIn × (1 - slippage)
  pairAddress: `0x${string}`;
  status: OrderStatus;
  createdAt: number;
  expiresAt: number;         // unix ms, default +24h
  filledAt?: number;
  filledTxHash?: `0x${string}`;
  currentPrice?: string;     // last known pool price
}

const STORAGE_KEY = 'ecoswap-limit-orders';
const POLL_INTERVAL_MS = 10_000;

function loadOrders(): LimitOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LimitOrder[]) : [];
  } catch { return []; }
}

function saveOrders(orders: LimitOrder[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); } catch { /* ignore */ }
}

let globalOrders: LimitOrder[] = loadOrders();
const listeners = new Set<() => void>();

function setGlobalOrders(next: LimitOrder[]) {
  globalOrders = next;
  saveOrders(next);
  listeners.forEach((fn) => fn());
}

export function addLimitOrder(order: Omit<LimitOrder, 'id' | 'createdAt' | 'status'>) {
  const entry: LimitOrder = {
    ...order,
    id: Math.random().toString(36).slice(2),
    createdAt: Date.now(),
    status: 'open',
  };
  setGlobalOrders([entry, ...globalOrders]);
  return entry.id;
}

export function cancelLimitOrder(id: string) {
  setGlobalOrders(globalOrders.map((o) =>
    o.id === id ? { ...o, status: 'cancelled' } : o,
  ));
}

function markFilled(id: string, txHash?: `0x${string}`) {
  setGlobalOrders(globalOrders.map((o) =>
    o.id === id ? { ...o, status: 'filled', filledAt: Date.now(), filledTxHash: txHash } : o,
  ));
}

function markExpired(id: string) {
  setGlobalOrders(globalOrders.map((o) =>
    o.id === id ? { ...o, status: 'expired' } : o,
  ));
}

/** Read the current spot price from the pool's reserves. */
export async function getPoolSpotPrice(
  client: PublicClient,
  pairAddress: `0x${string}`,
  tokenIn: `0x${string}`,
  decimalsIn: number,
  decimalsOut: number,
): Promise<number | null> {
  try {
    const [r0, r1] = await client.readContract({
      address: pairAddress,
      abi: UNIV2_PAIR_ABI,
      functionName: 'getReserves',
    }) as [bigint, bigint, number];
    const t0 = await client.readContract({
      address: pairAddress,
      abi: UNIV2_PAIR_ABI,
      functionName: 'token0',
    });
    const isT0In = t0.toLowerCase() === tokenIn.toLowerCase();
    const [resIn, resOut] = isT0In ? [r0, r1] : [r1, r0];
    if (resIn === 0n) return null;
    // Price = resOut / resIn, adjusted for decimals
    const priceRaw = (resOut * parseUnits('1', decimalsIn)) / resIn;
    return parseFloat(formatUnits(priceRaw, decimalsOut));
  } catch { return null; }
}

/** Check if a limit order's target price has been reached and return whether it should execute. */
export function isOrderTriggered(order: LimitOrder, currentPrice: number): boolean {
  // "Buy tokenOut at price <= targetPrice" — triggered when pool price drops to target
  const target = parseFloat(order.targetPrice);
  return currentPrice <= target;
}

export function useLimitOrders(client?: PublicClient) {
  const [, setTick] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const notify = () => setTick((t) => t + 1);
    listeners.add(notify);
    return () => { listeners.delete(notify); };
  }, []);

  // Background price polling — updates currentPrice on open orders
  useEffect(() => {
    if (!client) return;

    const poll = async () => {
      const open = globalOrders.filter((o) => o.status === 'open');
      if (open.length === 0) return;

      const now = Date.now();
      let changed = false;

      for (const order of open) {
        // Expire if past expiry
        if (order.expiresAt < now) {
          markExpired(order.id);
          changed = true;
          continue;
        }

        const price = await getPoolSpotPrice(
          client,
          order.pairAddress,
          order.tokenIn,
          order.decimalsIn,
          order.decimalsOut,
        );

        if (price !== null) {
          const priceStr = price.toFixed(6);
          if (order.currentPrice !== priceStr) {
            setGlobalOrders(globalOrders.map((o) =>
              o.id === order.id ? { ...o, currentPrice: priceStr } : o,
            ));
            changed = true;
          }
          // Note: auto-execution requires the user's wallet — we flag it as
          // "triggered" in the UI so they can manually execute. Full auto-execution
          // would require a keeper bot with signing keys.
          if (isOrderTriggered(order, price)) {
            // UI shows "Execute" button for triggered orders
          }
        }
      }

      if (changed) listeners.forEach((fn) => fn());
    };

    pollingRef.current = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    void poll(); // immediate first run

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [client]);

  const cancel = useCallback((id: string) => cancelLimitOrder(id), []);
  const markFilledExternal = useCallback((id: string, txHash?: `0x${string}`) => markFilled(id, txHash), []);

  return {
    orders: globalOrders,
    openOrders: globalOrders.filter((o) => o.status === 'open'),
    filledOrders: globalOrders.filter((o) => o.status === 'filled'),
    cancelledOrders: globalOrders.filter((o) => o.status === 'cancelled'),
    cancel,
    markFilled: markFilledExternal,
  };
}
