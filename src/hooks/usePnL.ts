/**
 * usePnL — tracks LP position entry prices and computes unrealized PnL.
 *
 * When a user adds liquidity, we record:
 *   - the LP tokens minted
 *   - the token amounts deposited (entry principal)
 *   - the spot price at entry
 *
 * On the portfolio page, we compare their current claimable amount vs entry
 * to show unrealized PnL in both token and % terms.
 */

import { formatUnits } from 'viem';

export interface LPEntry {
  pairAddress: `0x${string}`;
  symbol0: string;
  symbol1: string;
  entryAmount0: string;    // human-readable token0 deposited
  entryAmount1: string;    // human-readable token1 deposited
  entryLpTokens: string;  // human-readable LP tokens received
  entrySpotPrice: string; // token1 per token0 at entry time
  timestamp: number;
}

const KEY = 'ecoswap-lp-entries';

function load(): LPEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LPEntry[]) : [];
  } catch { return []; }
}

function save(entries: LPEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

/** Call this when a user successfully adds liquidity. */
export function recordLPEntry(entry: Omit<LPEntry, 'timestamp'>) {
  const entries = load();
  entries.push({ ...entry, timestamp: Date.now() });
  save(entries);
}

/** Get all recorded entries for a given pair. */
export function getLPEntries(pairAddress: `0x${string}`): LPEntry[] {
  return load().filter((e) => e.pairAddress.toLowerCase() === pairAddress.toLowerCase());
}

/** Compute unrealized PnL for a position.
 *  currentClaimable0/1 are in token units (raw bigint).
 *  Returns { pnl0, pnl1, pnlPct, isProfit } where pnl is human-readable. */
export function computePnL(
  pairAddress: `0x${string}`,
  currentClaimable0: bigint,
  currentClaimable1: bigint,
  decimals0: number,
  decimals1: number,
): { pnl0: string; pnl1: string; pnlPct: string; isProfit: boolean } | null {
  const entries = getLPEntries(pairAddress);
  if (entries.length === 0) return null;

  // Sum all entries for this pair
  const totalEntry0 = entries.reduce((acc, e) => acc + parseFloat(e.entryAmount0), 0);
  const totalEntry1 = entries.reduce((acc, e) => acc + parseFloat(e.entryAmount1), 0);

  if (totalEntry0 === 0 && totalEntry1 === 0) return null;

  const current0 = parseFloat(formatUnits(currentClaimable0, decimals0));
  const current1 = parseFloat(formatUnits(currentClaimable1, decimals1));

  const pnl0 = current0 - totalEntry0;
  const pnl1 = current1 - totalEntry1;

  // PnL % based on total entry value (treat both tokens as equal value for simplicity)
  const totalEntryVal = totalEntry0 + totalEntry1;
  const totalCurrentVal = current0 + current1;
  const pnlPct = totalEntryVal > 0
    ? ((totalCurrentVal - totalEntryVal) / totalEntryVal * 100).toFixed(2)
    : '0.00';

  const isProfit = parseFloat(pnlPct) >= 0;

  return {
    pnl0: (pnl0 >= 0 ? '+' : '') + pnl0.toFixed(4),
    pnl1: (pnl1 >= 0 ? '+' : '') + pnl1.toFixed(4),
    pnlPct: (isProfit ? '+' : '') + pnlPct + '%',
    isProfit,
  };
}
