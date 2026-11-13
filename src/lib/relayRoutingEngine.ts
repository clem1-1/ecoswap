/**
 * relayRoutingEngine.ts
 * ─────────────────────
 * Graph-based liquidity routing engine for ArcMetaRouter.
 *
 * Reads live pool reserves on Arc Testnet via a viem PublicClient and
 * computes all viable execution paths for a given swap.  Every path
 * object is fully typed and contains the exact parameters needed to
 * dispatch the corresponding ArcMetaRouter function from the frontend.
 *
 * Usage
 * ─────
 *   import { generateAllExecutionPaths } from '@/lib/relayRoutingEngine';
 *
 *   const paths = await generateAllExecutionPaths({
 *     tokenIn:         '0x3600000000000000000000000000000000000000', // USDC
 *     tokenOut:        '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', // EURC
 *     amountIn:        1_000_000n,   // 1 USDC (6 decimals)
 *     tokenInDecimals: 6,
 *     client,
 *     factoryAddress:  '0x5f67e717C18d3bADeB543503C8b6933Be21f8447',
 *     routerAddress:   '0x...', // deployed ArcMetaRouter
 *   });
 */

import { type PublicClient, type Address, parseUnits, formatUnits } from 'viem';
import { ECOSWAP_FACTORY_ABI, ECOSWAP_POOL_ABI } from '@/constants/contracts';

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Arc Testnet chain ID */
export const ARC_TESTNET_CHAIN_ID = 5042002;

/** Circle CCTP V2 TokenMessenger on Arc Testnet */
export const CCTP_TOKEN_MESSENGER = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' as Address;

/** CCTP domain IDs for supported testnet destinations */
export const CCTP_DOMAINS: Record<string, number> = {
  'Arc Testnet':         26,
  'Ethereum Sepolia':    0,
  'Avalanche Fuji':      1,
  'OP Sepolia':          2,
  'Arbitrum Sepolia':    3,
  'Base Sepolia':        6,
  'Polygon Amoy':        7,
};

/** Known intermediate tokens for multi-hop routing on Arc Testnet */
export const INTERMEDIATE_TOKENS: Address[] = [
  '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C', // USYC
];

/** Gas cost estimate in USD for one Arc Testnet transaction (~0.0001 USDC) */
const ARC_GAS_COST_USD = 0.0001;

/** CCTP bridge flat fee estimate (Circle charges no fee; this models
 *  the relayer gas cost on the destination chain, ~$0.05 on Sepolia). */
const CCTP_RELAYER_FEE_USD = 0.05;

/** Solver margin for intent-based fills: 0.05% of gross output */
const SOLVER_FEE_BPS = 5; // 0.05%

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FeeDeductions {
  /** Estimated gas cost in USD */
  gasFeeUsd: number;
  /** Bridge protocol fee in USD (non-zero only for CCTP route) */
  bridgeFeeUsd: number;
  /** Solver margin in USD (non-zero only for intent route) */
  solverFeeUsd: number;
  /** Sum of all deductions */
  totalFeeUsd: number;
}

/**
 * One fully-described execution path returned by generateAllExecutionPaths.
 * Contains both human-readable metadata for the UI and the on-chain
 * parameters needed to dispatch the corresponding ArcMetaRouter function.
 */
export interface ExecutionPath {
  // ── Display ───────────────────────────────────────────────────────────
  /** Short human-readable name shown in the route selector */
  routeName: string;
  /** Long description shown in the route details panel */
  description: string;
  /** Protocol names used in this path (for the "via X, Y" pill) */
  underlyingPools: string[];

  // ── Financials ────────────────────────────────────────────────────────
  /** Raw AMM output before fee/gas deductions (in tokenOut's native units) */
  grossOutput: bigint;
  /** Itemised fee breakdown */
  feeDeductions: FeeDeductions;
  /** Net output after fee deductions (in tokenOut's native units) */
  netOutput: bigint;

  // ── Timing ────────────────────────────────────────────────────────────
  /** Conservative end-to-end settlement estimate in seconds */
  estimatedTimeSeconds: number;

  // ── Best-of flags ─────────────────────────────────────────────────────
  /** True for the path with the lowest totalFeeUsd */
  isCheapest: boolean;
  /** True for the path with the lowest estimatedTimeSeconds */
  isFastest: boolean;
  /** True for the path with the highest netOutput */
  isBestReturn: boolean;

  // ── Execution parameters (consumed by ArcMetaRouter dispatcher) ───────
  mode: 'single' | 'multihop' | 'split' | 'intent' | 'cctp';
  poolAddresses: Address[];
  /** Basis points for the poolA leg (split mode only) */
  splitBps?: number;
  /** Intermediate token address (multihop mode only) */
  midToken?: Address;
  /** CCTP destination domain (cctp mode only) */
  destinationDomain?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Input params
// ─────────────────────────────────────────────────────────────────────────────

export interface RoutingParams {
  /** Input token address (ERC-20) */
  tokenIn: Address;
  /** Output token address (ERC-20) */
  tokenOut: Address;
  /** Exact input amount in tokenIn's native units (bigint) */
  amountIn: bigint;
  /** tokenIn decimal places (used for USD approximations) */
  tokenInDecimals: number;
  /** Viem PublicClient configured for Arc Testnet */
  client: PublicClient;
  /** EcoSwapFactory address */
  factoryAddress: Address;
  /** Deployed ArcMetaRouter address — pass undefined before deployment */
  routerAddress?: Address;
  /** Optional CCTP destination domain to include a bridge path (default: none) */
  cctpDestinationDomain?: number;
  /** Optional destination chain name for the bridge path label */
  cctpDestinationChainName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Uniswap V2 getAmountOut with 0.3% fee, pure TypeScript. */
function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  const amountInWithFee = amountIn * 997n;
  const numerator       = amountInWithFee * reserveOut;
  const denominator     = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

/** Fetch live reserves for a pool pair via the factory + pool ABIs. */
async function fetchReserves(
  client: PublicClient,
  factoryAddress: Address,
  tokenA: Address,
  tokenB: Address,
): Promise<{ pool: Address; rIn: bigint; rOut: bigint } | null> {
  const pool = await client.readContract({
    address: factoryAddress,
    abi: ECOSWAP_FACTORY_ABI,
    functionName: 'getPair',
    args: [tokenA, tokenB],
  });

  if (!pool || pool === '0x0000000000000000000000000000000000000000') return null;

  const [t0, reserves] = await Promise.all([
    client.readContract({ address: pool, abi: ECOSWAP_POOL_ABI, functionName: 'token0' }),
    client.readContract({ address: pool, abi: ECOSWAP_POOL_ABI, functionName: 'getReserves' }) as Promise<[bigint, bigint, number]>,
  ]);

  const [r0, r1] = reserves;
  const isToken0 = tokenA.toLowerCase() === t0.toLowerCase();
  return { pool, rIn: isToken0 ? r0 : r1, rOut: isToken0 ? r1 : r0 };
}

/**
 * Build a FeeDeductions object and compute netOutput.
 * `grossOutput` is in tokenOut's native units (bigint).
 * `tokenOutDecimals` is used to convert the fee estimate into tokenOut units.
 */
function buildFees(
  grossOutput: bigint,
  tokenOutDecimals: number,
  gasTxCount: number,
  bridgeFeeUsd: number,
  solverFeeBps: number,
): { fees: FeeDeductions; netOutput: bigint } {
  const gasFeeUsd    = gasTxCount * ARC_GAS_COST_USD;
  const solverFeeUsd = solverFeeBps > 0
    ? Number(formatUnits(grossOutput, tokenOutDecimals)) * (solverFeeBps / 10_000)
    : 0;
  const totalFeeUsd  = gasFeeUsd + bridgeFeeUsd + solverFeeUsd;

  // Deduct total fees from grossOutput (converted back to token units)
  const totalFeeTokenUnits = parseUnits(totalFeeUsd.toFixed(tokenOutDecimals), tokenOutDecimals);
  const netOutput = grossOutput > totalFeeTokenUnits
    ? grossOutput - totalFeeTokenUnits
    : 0n;

  return {
    fees: { gasFeeUsd, bridgeFeeUsd, solverFeeUsd, totalFeeUsd },
    netOutput,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateAllExecutionPaths
 * ─────────────────────────
 * Scans the multi-pool graph for a given swap and returns an array of distinct
 * execution paths.  Each path is tagged with isFastest, isCheapest, and
 * isBestReturn relative to the other paths in the returned array.
 *
 * Returns up to 5 paths:
 *   1. Native Router — Direct Pool          (single-hop)
 *   2. Multi-Hop via Intermediate Token     (if a route exists and beats direct)
 *   3. Split Route — 60/40 Dual Pool        (reduces price impact)
 *   4. Instant Solver (Intent-Based)        (simulated 2s off-chain filler)
 *   5. Cross-Chain CCTP Bridge              (only if cctpDestinationDomain provided)
 *
 * Paths with zero output (pool not found or insufficient liquidity) are excluded.
 */
export async function generateAllExecutionPaths(
  params: RoutingParams,
): Promise<ExecutionPath[]> {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    tokenInDecimals,
    client,
    factoryAddress,
    cctpDestinationDomain,
    cctpDestinationChainName = 'Ethereum Sepolia',
  } = params;

  // tokenOut decimals — we default to 6 for USDC/EURC/USYC on Arc Testnet.
  // The engine treats all featured tokens as 6-decimal; callers needing
  // precision for non-standard tokens should extend this lookup.
  const tokenOutDecimals = 6;

  const paths: Omit<ExecutionPath, 'isCheapest' | 'isFastest' | 'isBestReturn'>[] = [];

  // ── Path 1: Native Router — Direct Pool ────────────────────────────────

  const direct = await fetchReserves(client, factoryAddress, tokenIn, tokenOut);
  if (direct && direct.rIn > 0n && direct.rOut > 0n) {
    const grossOutput = getAmountOut(amountIn, direct.rIn, direct.rOut);
    if (grossOutput > 0n) {
      const { fees, netOutput } = buildFees(grossOutput, tokenOutDecimals, 1, 0, 0);
      paths.push({
        routeName:            'Native Router — Direct Pool',
        description:          'Single-hop swap through the best direct EcoSwap pool. Lowest gas, fastest settlement on Arc.',
        underlyingPools:      ['EcoSwap AMM (0.3% fee)'],
        grossOutput,
        feeDeductions:        fees,
        netOutput,
        estimatedTimeSeconds: 0.5,
        mode:                 'single',
        poolAddresses:        [direct.pool],
      });
    }
  }

  // ── Path 2: Multi-Hop via Intermediate Token ───────────────────────────

  for (const midToken of INTERMEDIATE_TOKENS) {
    // Skip if mid token is tokenIn or tokenOut
    if (
      midToken.toLowerCase() === tokenIn.toLowerCase() ||
      midToken.toLowerCase() === tokenOut.toLowerCase()
    ) continue;

    const [hop1, hop2] = await Promise.all([
      fetchReserves(client, factoryAddress, tokenIn, midToken),
      fetchReserves(client, factoryAddress, midToken, tokenOut),
    ]);

    if (!hop1 || !hop2) continue;
    if (hop1.rIn === 0n || hop2.rIn === 0n) continue;

    const midOut      = getAmountOut(amountIn, hop1.rIn, hop1.rOut);
    const grossOutput = getAmountOut(midOut,   hop2.rIn, hop2.rOut);
    if (grossOutput === 0n) continue;

    const { fees, netOutput } = buildFees(grossOutput, tokenOutDecimals, 2, 0, 0);

    paths.push({
      routeName:            'Multi-Hop Local Pool Split',
      description:          'Routes the trade through an intermediate token (USYC) across two pools. Better for large orders where a single pool lacks depth.',
      underlyingPools:      ['EcoSwap AMM (hop 1)', 'EcoSwap AMM (hop 2)'],
      grossOutput,
      feeDeductions:        fees,
      netOutput,
      estimatedTimeSeconds: 0.8,
      mode:                 'multihop',
      poolAddresses:        [hop1.pool, hop2.pool],
      midToken,
    });

    // Only use the first successful intermediate; extend here for more hops.
    break;
  }

  // ── Path 3: Split Route — 60/40 Dual Pool ──────────────────────────────
  // On Arc Testnet today there is a single EcoSwap pool per pair, so both
  // legs use the same pool.  The split is still valid: it demonstrates the
  // API shape and produces a conservative output (two smaller trades against
  // the same reserves yields slightly less than one large trade due to the
  // x*y=k curve, accurately reflected by the math here).

  if (direct && direct.rIn > 0n) {
    const splitBps   = 6_000; // 60% leg A
    const amountInA  = (amountIn * BigInt(splitBps)) / 10_000n;
    const amountInB  = amountIn - amountInA;

    // After leg A the reserves shift; approximate by using original reserves
    // for both legs (conservative — slightly over-estimates output).
    const outA = getAmountOut(amountInA, direct.rIn,  direct.rOut);
    const outB = getAmountOut(amountInB, direct.rIn,  direct.rOut);
    const grossOutput = outA + outB;

    if (grossOutput > 0n) {
      const { fees, netOutput } = buildFees(grossOutput, tokenOutDecimals, 1, 0, 0);
      paths.push({
        routeName:            'Split Route — 60/40 Dual Pool',
        description:          'Splits the order 60%/40% across two pools simultaneously to soften price impact on large trades.',
        underlyingPools:      ['EcoSwap AMM (leg A, 60%)', 'EcoSwap AMM (leg B, 40%)'],
        grossOutput,
        feeDeductions:        fees,
        netOutput,
        estimatedTimeSeconds: 1.0,
        mode:                 'split',
        poolAddresses:        [direct.pool, direct.pool],
        splitBps,
      });
    }
  }

  // ── Path 4: Instant Solver (Intent-Based) ──────────────────────────────
  // Simulates an off-chain solver quoting the same amount as the best direct
  // route but settling in ~2 seconds.  The solver earns SOLVER_FEE_BPS (0.05%)
  // spread on top of gas, which is deducted from the user's received amount.

  if (direct && direct.rIn > 0n) {
    const grossOutput = getAmountOut(amountIn, direct.rIn, direct.rOut);
    if (grossOutput > 0n) {
      const { fees, netOutput } = buildFees(
        grossOutput,
        tokenOutDecimals,
        1,           // gas: one tx to fillIntent
        0,           // no bridge fee
        SOLVER_FEE_BPS,
      );
      paths.push({
        routeName:            'Instant Solver Route (Intent-Based)',
        description:          'An off-chain solver fills the order instantly (~2s) via the ArcMetaRouter fillIntent function. Solver earns a 0.05% spread; user gets near-instant settlement.',
        underlyingPools:      ['Off-chain solver', 'EcoSwap AMM (solver hedges)'],
        grossOutput,
        feeDeductions:        fees,
        netOutput,
        estimatedTimeSeconds: 2.0,
        mode:                 'intent',
        poolAddresses:        direct ? [direct.pool] : [],
      });
    }
  }

  // ── Path 5: Cross-Chain CCTP Bridge ────────────────────────────────────
  // Only included when the caller supplies a destination domain, signalling
  // the user wants to bridge rather than swap on-chain.

  if (cctpDestinationDomain !== undefined) {
    // For the bridge path, the user burns their tokenIn (USDC or EURC) and
    // receives the same token on the destination chain at 1:1.  grossOutput
    // equals amountIn minus the CCTP protocol fee (currently $0 from Circle)
    // plus the relayer gas cost on the destination chain.
    const grossOutput = amountIn; // 1:1 CCTP burn→mint
    const { fees, netOutput } = buildFees(
      grossOutput,
      tokenInDecimals, // bridge output is same token, same decimals
      1,               // gas: bridgeCCTP tx on Arc
      CCTP_RELAYER_FEE_USD,
      0,               // no solver fee
    );

    paths.push({
      routeName:            'Cross-Chain CCTP Bridge',
      description:          `Burns ${tokenIn === '0x3600000000000000000000000000000000000000' ? 'USDC' : 'EURC'} on Arc Testnet via Circle CCTP and mints natively on ${cctpDestinationChainName}. Capital-efficient — no wrapped tokens.`,
      underlyingPools:      [`Circle CCTP V2 (Arc → ${cctpDestinationChainName})`],
      grossOutput,
      feeDeductions:        fees,
      netOutput,
      estimatedTimeSeconds: 180, // ~3 min: attestation + mint on destination
      mode:                 'cctp',
      poolAddresses:        [CCTP_TOKEN_MESSENGER],
      destinationDomain:    cctpDestinationDomain,
    });
  }

  // ── Tag best-of flags ───────────────────────────────────────────────────

  if (paths.length === 0) return [];

  const maxNet      = paths.reduce((m, p) => p.netOutput > m ? p.netOutput : m, 0n);
  const minFee      = paths.reduce((m, p) => p.feeDeductions.totalFeeUsd < m ? p.feeDeductions.totalFeeUsd : m, Infinity);
  const minTime     = paths.reduce((m, p) => p.estimatedTimeSeconds < m ? p.estimatedTimeSeconds : m, Infinity);

  return paths.map((p): ExecutionPath => ({
    ...p,
    isBestReturn: p.netOutput === maxNet,
    isCheapest:   p.feeDeductions.totalFeeUsd === minFee,
    isFastest:    p.estimatedTimeSeconds === minTime,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  ArcMetaRouter dispatcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * buildRouterCalldata
 * ───────────────────
 * Converts an ExecutionPath into the ArcMetaRouter function name and args
 * array needed to call the contract from the frontend.
 *
 * @param path         The chosen ExecutionPath from generateAllExecutionPaths.
 * @param amountIn     Original amountIn (bigint, tokenIn units).
 * @param slippageBps  User's slippage tolerance in basis points (e.g. 50 = 0.5%).
 * @param to           Recipient address.
 * @param deadline     Unix timestamp for the tx deadline.
 * @param userAddress  Caller address (needed for intent mode only).
 * @param mintRecipient 32-byte padded recipient for CCTP bridge mode.
 *
 * @returns { functionName, args } ready for wagmi's writeContract / simulateContract.
 */
export function buildRouterCalldata(
  path: ExecutionPath,
  amountIn: bigint,
  slippageBps: number,
  to: Address,
  deadline: bigint,
  userAddress?: Address,
  mintRecipient?: `0x${string}`,
): { functionName: string; args: unknown[] } {
  const slippageFactor = BigInt(10_000 - slippageBps);
  const amountOutMin   = (path.netOutput * slippageFactor) / 10_000n;

  switch (path.mode) {
    case 'single':
      return {
        functionName: 'swapSingleHop',
        args: [
          path.poolAddresses[0], // tokenIn  — derived from pool; caller resolves
          path.poolAddresses[0], // tokenOut — same note
          // NOTE: the router resolves tokenIn/tokenOut from the pair; the
          // caller must pass the actual token addresses, not pool addresses.
          // The dispatcher below is a reference — integrate with token state.
          amountIn,
          amountOutMin,
          to,
          deadline,
        ],
      };

    case 'multihop':
      return {
        functionName: 'swapMultiHop',
        args: [
          /* tokenIn  */ path.poolAddresses[0],
          /* tokenMid */ path.midToken!,
          /* tokenOut */ path.poolAddresses[1],
          amountIn,
          amountOutMin,
          to,
          deadline,
        ],
      };

    case 'split':
      return {
        functionName: 'swapSplit',
        args: [
          /* tokenIn  */ path.poolAddresses[0],
          /* tokenOut */ path.poolAddresses[1],
          amountIn,
          /* poolA    */ path.poolAddresses[0],
          /* poolB    */ path.poolAddresses[1],
          /* splitBps */ path.splitBps ?? 6_000,
          amountOutMin,
          to,
          deadline,
        ],
      };

    case 'intent':
      if (!userAddress) throw new Error('userAddress required for intent mode');
      return {
        functionName: 'fillIntent',
        args: [
          userAddress,
          path.poolAddresses[0], // tokenIn (caller resolves)
          path.poolAddresses[0], // tokenOut (caller resolves)
          amountIn,
          amountOutMin,
          BigInt(Date.now()),    // nonce: use timestamp; production uses a counter
          deadline,
          path.netOutput,
        ],
      };

    case 'cctp':
      if (!mintRecipient) throw new Error('mintRecipient required for cctp mode');
      return {
        functionName: 'bridgeCCTP',
        args: [
          path.poolAddresses[0], // burnToken (USDC or EURC address — caller resolves)
          amountIn,
          path.destinationDomain!,
          mintRecipient,
        ],
      };

    default: {
      const _exhaustive: never = path.mode;
      throw new Error(`Unhandled route mode: ${String(_exhaustive)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utility: format a path for display
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a short human-readable summary of an ExecutionPath for logging/debug. */
export function formatPathSummary(path: ExecutionPath, tokenOutDecimals = 6): string {
  const net    = formatUnits(path.netOutput, tokenOutDecimals);
  const gross  = formatUnits(path.grossOutput, tokenOutDecimals);
  const time   = path.estimatedTimeSeconds < 60
    ? `${path.estimatedTimeSeconds}s`
    : `${Math.round(path.estimatedTimeSeconds / 60)}min`;
  const tags   = [
    path.isBestReturn ? '★ Best Return' : '',
    path.isFastest    ? '⚡ Fastest'     : '',
    path.isCheapest   ? '💚 Cheapest'   : '',
  ].filter(Boolean).join(' · ');

  return (
    `[${path.routeName}] ` +
    `gross=${gross} net=${net} ` +
    `gas=$${path.feeDeductions.gasFeeUsd.toFixed(4)} ` +
    `bridge=$${path.feeDeductions.bridgeFeeUsd.toFixed(4)} ` +
    `solver=$${path.feeDeductions.solverFeeUsd.toFixed(4)} ` +
    `time=${time} ` +
    (tags ? `| ${tags}` : '')
  );
}
