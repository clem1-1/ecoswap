// Deployed contract addresses — filled in after deploy
// These are placeholders; replaced in src/config/ecoswap.ts once deployed.
export const ECOSWAP_FACTORY_ADDRESS = '' as `0x${string}`;

export const ECOSWAP_FACTORY_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_feeToSetter', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'token0', type: 'address' },
      { indexed: true, internalType: 'address', name: 'token1', type: 'address' },
      { indexed: false, internalType: 'address', name: 'pair', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'allPairsLength', type: 'uint256' },
    ],
    name: 'PairCreated',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allPairs',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allPairsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
    ],
    name: 'createPair',
    outputs: [{ internalType: 'address', name: 'pair', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeTo',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeToSetter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'getPair',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_feeTo', type: 'address' }],
    name: 'setFeeTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_feeToSetter', type: 'address' }],
    name: 'setFeeToSetter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const ECOSWAP_POOL_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'spender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount1', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
    ],
    name: 'Burn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    name: 'Mint',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount0In', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount1In', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount0Out', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount1Out', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
    ],
    name: 'Swap',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint112', name: 'reserve0', type: 'uint112' },
      { indexed: false, internalType: 'uint112', name: 'reserve1', type: 'uint112' },
    ],
    name: 'Sync',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [],
    name: 'MINIMUM_LIQUIDITY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'to', type: 'address' }],
    name: 'burn',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'factory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '', type: 'uint112' },
      { internalType: 'uint112', name: '', type: 'uint112' },
      { internalType: 'uint32', name: '', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_token0', type: 'address' },
      { internalType: 'address', name: '_token1', type: 'address' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'kLast',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'to', type: 'address' }],
    name: 'mint',
    outputs: [{ internalType: 'uint256', name: 'liquidity', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'price0CumulativeLast',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'price1CumulativeLast',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'to', type: 'address' }],
    name: 'skim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amount0Out', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1Out', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'swap',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sync',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export type { Token } from './tokens';

// ─────────────────────────────────────────────────────────────────────────────
//  ArcMetaRouter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deployed ArcMetaRouter address on Arc Testnet.
 * Set VITE_ARC_META_ROUTER_ADDRESS in .env after deploying via Remix.
 * Constructor args:
 *   _factory:        0x5f67e717C18d3bADeB543503C8b6933Be21f8447
 *   _cctpMessenger:  0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA
 *   _synapse:        0x0000000000000000000000000000000000000000
 *   _lzOFT:          0x0000000000000000000000000000000000000000
 */
export const ARC_META_ROUTER_ADDRESS = (
  import.meta.env.VITE_ARC_META_ROUTER_ADDRESS ?? ''
) as `0x${string}`;

export const ARC_META_ROUTER_ABI = [
  // ── Constructor ────────────────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: '_factory',       type: 'address' },
      { internalType: 'address', name: '_cctpMessenger', type: 'address' },
      { internalType: 'address', name: '_synapse',       type: 'address' },
      { internalType: 'address', name: '_lzOFT',         type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  // ── Errors ─────────────────────────────────────────────────────────────
  { inputs: [],                                                                                                         name: 'DeadlineExpired',    type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'got', type: 'uint256' }, { internalType: 'uint256', name: 'minimum', type: 'uint256' }], name: 'SlippageExceeded',  type: 'error' },
  { inputs: [{ internalType: 'address', name: 'tokenA', type: 'address' }, { internalType: 'address', name: 'tokenB', type: 'address' }], name: 'PairNotFound',    type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'ratioBps', type: 'uint256' }],                                         name: 'InvalidSplitRatio',  type: 'error' },
  { inputs: [{ internalType: 'address', name: 'caller', type: 'address' }],                                           name: 'NotAFiller',         type: 'error' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }], name: 'NonceAlreadyUsed', type: 'error' },
  { inputs: [{ internalType: 'string',  name: 'protocol', type: 'string' }],                                         name: 'BridgeNotLive',      type: 'error' },
  { inputs: [],                                                                                                         name: 'ZeroAmount',         type: 'error' },
  { inputs: [],                                                                                                         name: 'ZeroAddress',        type: 'error' },
  // ── Events ─────────────────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: 'address', name: 'user',      type: 'address' },
      { indexed: true,  internalType: 'address', name: 'pool',      type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenIn',   type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenOut',  type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountIn',  type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amountOut', type: 'uint256' },
    ],
    name: 'SingleHopSwap',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: 'address', name: 'user',      type: 'address' },
      { indexed: false, internalType: 'address', name: 'pool0',     type: 'address' },
      { indexed: false, internalType: 'address', name: 'pool1',     type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenIn',   type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenMid',  type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenOut',  type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountIn',  type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amountOut', type: 'uint256' },
    ],
    name: 'MultiHopSwap',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: 'address', name: 'user',       type: 'address' },
      { indexed: false, internalType: 'address', name: 'poolA',      type: 'address' },
      { indexed: false, internalType: 'address', name: 'poolB',      type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenIn',    type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenOut',   type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountIn',   type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amountOutA', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amountOutB', type: 'uint256' },
    ],
    name: 'SplitSwap',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: 'address', name: 'user',      type: 'address' },
      { indexed: true,  internalType: 'address', name: 'filler',    type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'nonce',     type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'tokenIn',   type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenOut',  type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountIn',  type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amountOut', type: 'uint256' },
    ],
    name: 'IntentFilled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: 'address', name: 'user',               type: 'address' },
      { indexed: false, internalType: 'address', name: 'token',              type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount',             type: 'uint256' },
      { indexed: false, internalType: 'uint32',  name: 'destinationDomain',  type: 'uint32'  },
      { indexed: false, internalType: 'bytes32', name: 'mintRecipient',      type: 'bytes32' },
      { indexed: false, internalType: 'uint64',  name: 'cctpNonce',          type: 'uint64'  },
    ],
    name: 'CCTPBridgeInitiated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: 'address', name: 'filler', type: 'address' }, { indexed: false, internalType: 'bool', name: 'enabled', type: 'bool' }],
    name: 'FillerSet',
    type: 'event',
  },
  // ── Admin ──────────────────────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'filler',  type: 'address' },
      { internalType: 'bool',    name: 'enabled', type: 'bool'    },
    ],
    name: 'setFiller',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Mode 1: swapSingleHop ──────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn',      type: 'address' },
      { internalType: 'address', name: 'tokenOut',     type: 'address' },
      { internalType: 'uint256', name: 'amountIn',     type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address', name: 'to',           type: 'address' },
      { internalType: 'uint256', name: 'deadline',     type: 'uint256' },
    ],
    name: 'swapSingleHop',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Mode 2: swapMultiHop ──────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn',      type: 'address' },
      { internalType: 'address', name: 'tokenMid',     type: 'address' },
      { internalType: 'address', name: 'tokenOut',     type: 'address' },
      { internalType: 'uint256', name: 'amountIn',     type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address', name: 'to',           type: 'address' },
      { internalType: 'uint256', name: 'deadline',     type: 'uint256' },
    ],
    name: 'swapMultiHop',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Mode 3: swapSplit ──────────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn',      type: 'address' },
      { internalType: 'address', name: 'tokenOut',     type: 'address' },
      { internalType: 'uint256', name: 'amountIn',     type: 'uint256' },
      { internalType: 'address', name: 'poolA',        type: 'address' },
      { internalType: 'address', name: 'poolB',        type: 'address' },
      { internalType: 'uint256', name: 'splitBps',     type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address', name: 'to',           type: 'address' },
      { internalType: 'uint256', name: 'deadline',     type: 'uint256' },
    ],
    name: 'swapSplit',
    outputs: [{ internalType: 'uint256', name: 'totalOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Mode 4: fillIntent ────────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'user',         type: 'address' },
      { internalType: 'address', name: 'tokenIn',      type: 'address' },
      { internalType: 'address', name: 'tokenOut',     type: 'address' },
      { internalType: 'uint256', name: 'amountIn',     type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'uint256', name: 'nonce',        type: 'uint256' },
      { internalType: 'uint256', name: 'deadline',     type: 'uint256' },
      { internalType: 'uint256', name: 'amountOut',    type: 'uint256' },
    ],
    name: 'fillIntent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Mode 5: bridgeCCTP ────────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'burnToken',          type: 'address' },
      { internalType: 'uint256', name: 'amount',             type: 'uint256' },
      { internalType: 'uint32',  name: 'destinationDomain',  type: 'uint32'  },
      { internalType: 'bytes32', name: 'mintRecipient',      type: 'bytes32' },
    ],
    name: 'bridgeCCTP',
    outputs: [{ internalType: 'uint64', name: 'cctpNonce', type: 'uint64' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Mode 6: bridgeSynapse ─────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'token',              type: 'address' },
      { internalType: 'uint256', name: 'amount',             type: 'uint256' },
      { internalType: 'uint256', name: 'destinationChainId', type: 'uint256' },
      { internalType: 'address', name: 'recipient',          type: 'address' },
    ],
    name: 'bridgeSynapse',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Mode 7: bridgeLayerZero ───────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'token',      type: 'address' },
      { internalType: 'uint256', name: 'amount',     type: 'uint256' },
      { internalType: 'uint256', name: 'minAmount',  type: 'uint256' },
      { internalType: 'uint32',  name: 'dstEid',     type: 'uint32'  },
      { internalType: 'bytes32', name: 'recipient',  type: 'bytes32' },
      { internalType: 'uint256', name: 'nativeFee',  type: 'uint256' },
    ],
    name: 'bridgeLayerZero',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  // ── View: quoteSingleHop ──────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn',  type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
    ],
    name: 'quoteSingleHop',
    outputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'address', name: 'pool',      type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // ── View: quoteMultiHop ───────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn',  type: 'address' },
      { internalType: 'address', name: 'tokenMid', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
    ],
    name: 'quoteMultiHop',
    outputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'address', name: 'pool0',     type: 'address' },
      { internalType: 'address', name: 'pool1',     type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // ── View: immutables and state ────────────────────────────────────────
  {
    inputs: [],
    name: 'factory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cctpMessenger',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'isFiller',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'usedNonces',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ── Ownable ───────────────────────────────────────────────────────────
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
//  External DEX protocol addresses — Arc Testnet (chain ID 5042002)
//  All verified live via read_contract before inclusion.
// ─────────────────────────────────────────────────────────────────────────────

/** Uniswap V2 — deployed by osr21 on Arc Testnet. 615+ pairs. */
export const UNIV2_FACTORY  = '0x7483847d46db2920dd64efa676cf72dcf765814f' as const;
export const UNIV2_ROUTER   = '0xe27d5d256b370604f1ff060fb489c6a8e3f8a6d9' as const;
/** Known liquid pair: USDC/EURC */
export const UNIV2_USDC_EURC_PAIR = '0xb3685D16AAa06361ED28377b1319136650Fa9A13' as const;

/** Uniswap V3 — deployed by Cooket on Arc Testnet. */
export const UNIV3_FACTORY  = '0xc70593E016A5d50451b1A2Cf3173E7d77F120B37' as const;
export const UNIV3_ROUTER   = '0x63c8ed3ca14c996d4d58f558f5988f3a1e863231' as const;
export const UNIV3_QUOTER_V2 = '0xaccdaf1d4c0722c99a9b2d24413258ebdacc6db6' as const;

/** UnitFlowV3 — Uniswap V3 fork with WUSDC. Deployed on Arc Testnet. */
export const UNITFLOW_FACTORY = '0xb0bCabE107e9e37b34900667fa4ded4Df7e910CB' as const;
export const UNITFLOW_ROUTER  = '0x75eDe46A468Eb600C10982e6FdCeADCB37a40930' as const;
export const UNITFLOW_QUOTER  = '0x09ea20bC7Fbb42C202b2Fa108365ccB15165Dc53' as const;
export const WUSDC_ADDRESS    = '0x911b4000D3422F482F4062a913885f7b035382Df' as const;

/** Peach Aggregator — meta-aggregator execution router on Arc Testnet. */
export const PEACH_ROUTER     = '0x5FF56925140D6f5912C8Ca6593f2C3BC28190607' as const;
export const PEACH_API_BASE   = 'https://api-arc.cipheron.org' as const;

// ── Minimal ABIs needed for off-chain quoting ────────────────────────────────

/** Uniswap V2 Pair — getReserves + token0/token1 */
export const UNIV2_PAIR_ABI = [
  { inputs: [], name: 'getReserves', outputs: [{ type: 'uint112' }, { type: 'uint112' }, { type: 'uint32' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'token0',      outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'token1',      outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;

/** Uniswap V2 Factory — getPair */
export const UNIV2_FACTORY_ABI = [
  { inputs: [{ type: 'address' }, { type: 'address' }], name: 'getPair', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;

/** Uniswap V3 QuoterV2 — quoteExactInputSingle */
export const UNIV3_QUOTER_ABI = [
  {
    inputs: [{
      components: [
        { internalType: 'address', name: 'tokenIn',           type: 'address' },
        { internalType: 'address', name: 'tokenOut',          type: 'address' },
        { internalType: 'uint256', name: 'amountIn',          type: 'uint256' },
        { internalType: 'uint24',  name: 'fee',               type: 'uint24'  },
        { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
      internalType: 'struct IQuoterV2.QuoteExactInputSingleParams',
      name: 'params',
      type: 'tuple',
    }],
    name: 'quoteExactInputSingle',
    outputs: [
      { internalType: 'uint256', name: 'amountOut',                type: 'uint256' },
      { internalType: 'uint160', name: 'sqrtPriceX96After',        type: 'uint160' },
      { internalType: 'uint32',  name: 'initializedTicksCrossed',  type: 'uint32'  },
      { internalType: 'uint256', name: 'gasEstimate',              type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/** Uniswap V2 Router — swapExactTokensForTokens */
export const UNIV2_ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256',   name: 'amountIn',     type: 'uint256'   },
      { internalType: 'uint256',   name: 'amountOutMin', type: 'uint256'   },
      { internalType: 'address[]', name: 'path',         type: 'address[]' },
      { internalType: 'address',   name: 'to',           type: 'address'   },
      { internalType: 'uint256',   name: 'deadline',     type: 'uint256'   },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/** Uniswap V3 SwapRouter — exactInputSingle */
export const UNIV3_ROUTER_ABI = [
  {
    inputs: [{
      components: [
        { internalType: 'address', name: 'tokenIn',           type: 'address' },
        { internalType: 'address', name: 'tokenOut',          type: 'address' },
        { internalType: 'uint24',  name: 'fee',               type: 'uint24'  },
        { internalType: 'address', name: 'recipient',         type: 'address' },
        { internalType: 'uint256', name: 'deadline',          type: 'uint256' },
        { internalType: 'uint256', name: 'amountIn',          type: 'uint256' },
        { internalType: 'uint256', name: 'amountOutMinimum',  type: 'uint256' },
        { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
      internalType: 'struct ISwapRouter.ExactInputSingleParams',
      name: 'params',
      type: 'tuple',
    }],
    name: 'exactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// XyloNet StableSwap — Curve-style USDC/EURC pool, 0.04% fee, A=200
// Address verified on Arc Testnet explorer
// ─────────────────────────────────────────────────────────────────────────────
export const XYLO_STABLE_POOL_ADDRESS = '0x3DF3966F5138143dce7a9cFDdC2c0310ce083BB1';

export const XYLO_STABLE_POOL_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn',  type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
    ],
    name: 'calculateSwap',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPoolInfo',
    outputs: [{ components: [
      { internalType: 'address', name: 'token0',    type: 'address' },
      { internalType: 'address', name: 'token1',    type: 'address' },
      { internalType: 'uint256', name: 'reserve0',  type: 'uint256' },
      { internalType: 'uint256', name: 'reserve1',  type: 'uint256' },
      { internalType: 'uint256', name: 'amplificationParameter', type: 'uint256' },
      { internalType: 'uint256', name: 'swapFee',   type: 'uint256' },
      { internalType: 'uint256', name: 'totalSupply', type: 'uint256' },
    ], internalType: 'struct IXyloPool.PoolInfo', name: '', type: 'tuple' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn',     type: 'address' },
      { internalType: 'address', name: 'tokenOut',    type: 'address' },
      { internalType: 'uint256', name: 'amountIn',    type: 'uint256' },
      { internalType: 'uint256', name: 'minAmountOut', type: 'uint256' },
      { internalType: 'address', name: 'to',          type: 'address' },
      { internalType: 'uint256', name: 'deadline',    type: 'uint256' },
    ],
    name: 'swap',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
