/**
 * CCTP V2-supported chains for the EcoSwap bridge.
 * Source: Circle official CCTP contract addresses (developers.circle.com/cctp/references/contract-addresses)
 * All chains listed have confirmed CCTP V2 testnet support.
 *
 * CCTP V2 supports exactly 2 bridgeable tokens on Arc Testnet:
 *   - USDC: via TokenMessengerV2
 *   - EURC: via CrossChainTokenService (CCTP for non-USDC assets)
 *
 * cirBTC, WETH, USYC are NOT supported by CCTP on testnet.
 */

import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  avalancheFuji,
  polygonAmoy,
  unichainSepolia,
  lineaSepolia,
  monadTestnet,
  inkSepolia,
  plumeSepolia,
  worldchainSepolia,
  sonicBlazeTestnet,
  xdcTestnet,
} from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import type { Chain } from 'viem'

const W3I = 'https://raw.githubusercontent.com/0xa3k5/web3icons/refs/heads/main/raw-svgs/networks/branded'
const W3T = 'https://raw.githubusercontent.com/0xa3k5/web3icons/refs/heads/main/raw-svgs/tokens/branded'

export interface BridgeChain {
  /** CCTP domain identifier (26 = Arc) */
  domain: number
  /** App Kit / Bridge Kit chain name string used in kit.bridge() calls */
  cctpName: string
  /** viem chain object (for wagmi switchChain) */
  viemChain: Chain
  /** Display name shown in the UI */
  label: string
  /** Short network badge label */
  badge: string
  /** Brand color for the chain icon */
  color: string
  /** Logo URL for the chain */
  logoURI: string
  /** Block explorer base URL */
  explorerUrl: string
  /** Testnet USDC contract address on this chain */
  usdcAddress: `0x${string}`
  /** Testnet EURC address (if supported on this chain via CrossChainTokenService) */
  eurcAddress?: `0x${string}`
}

/** Bridgeable tokens — CCTP V2 on Arc Testnet supports USDC and EURC only */
export interface BridgeToken {
  symbol: 'USDC' | 'EURC'
  name: string
  logoURI: string
  color: string
  /** App Kit token string */
  kitToken: string
  /** Note to display in the token selector */
  note?: string
}

// Official brand kit URLs — each verified 200 OK
const LOGO = {
  ethereum:  'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  base:      'https://raw.githubusercontent.com/base-org/brand-kit/001c0e9b40a67799ebe0418671ac4e02a0c683ce/logo/symbol/Base_Symbol_Blue.png',
  arbitrum:  'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  optimism:  'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png',
  avalanche: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  polygon:   'https://cryptologos.cc/logos/polygon-matic-logo.png',
  uniswap:   'https://cryptologos.cc/logos/uniswap-uni-logo.png',
  linea:     'https://s2.coinmarketcap.com/static/img/coins/64x64/27657.png',
  monad:     'https://s2.coinmarketcap.com/static/img/coins/64x64/33462.png',
  sonic:     'https://s2.coinmarketcap.com/static/img/coins/64x64/30014.png',
  xdc:       'https://cryptologos.cc/logos/xdc-network-xdc-logo.png',
  usdc:      'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  eurc:      'https://s2.coinmarketcap.com/static/img/coins/64x64/20641.png',
}

export const BRIDGE_CHAINS: BridgeChain[] = [
  // ─── Arc Testnet (domain 26) ──────────────────────────────────────────────
  {
    domain:      26,
    cctpName:    'Arc_Testnet',
    viemChain:   arcTestnet,
    label:       'Arc Testnet',
    badge:       'ARC',
    color:       '#0F9D6B',
    logoURI:     '', // Arc has no public CDN logo yet — gradient fallback
    explorerUrl: 'https://explorer.testnet.arc.io',
    usdcAddress: '0x3600000000000000000000000000000000000000',
    eurcAddress: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  },

  // ─── Ethereum Sepolia (domain 0) ─────────────────────────────────────────
  {
    domain:      0,
    cctpName:    'Ethereum_Sepolia',
    viemChain:   sepolia,
    label:       'Ethereum Sepolia',
    badge:       'ETH',
    color:       '#627EEA',
    logoURI:     LOGO.ethereum,
    explorerUrl: 'https://sepolia.etherscan.io',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    eurcAddress: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
  },

  // ─── Base Sepolia (domain 6) ──────────────────────────────────────────────
  {
    domain:      6,
    cctpName:    'Base_Sepolia',
    viemChain:   baseSepolia,
    label:       'Base Sepolia',
    badge:       'BASE',
    color:       '#0052FF',
    logoURI:     `${W3I}/base.svg`,
    explorerUrl: 'https://sepolia.basescan.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    eurcAddress: '0x808456652fdb597867f38412077A9182bf77359F',
  },

  // ─── Arbitrum Sepolia (domain 3) ─────────────────────────────────────────
  {
    domain:      3,
    cctpName:    'Arbitrum_Sepolia',
    viemChain:   arbitrumSepolia,
    label:       'Arbitrum Sepolia',
    badge:       'ARB',
    color:       '#12AAFF',
    logoURI:     `${W3I}/arbitrum-one.svg`,
    explorerUrl: 'https://sepolia.arbiscan.io',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },

  // ─── Optimism Sepolia (domain 2) ─────────────────────────────────────────
  {
    domain:      2,
    cctpName:    'Optimism_Sepolia',
    viemChain:   optimismSepolia,
    label:       'Optimism Sepolia',
    badge:       'OP',
    color:       '#FF0420',
    logoURI:     `${W3I}/optimism.svg`,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },

  // ─── Avalanche Fuji (domain 1) ───────────────────────────────────────────
  {
    domain:      1,
    cctpName:    'Avalanche_Fuji',
    viemChain:   avalancheFuji,
    label:       'Avalanche Fuji',
    badge:       'AVAX',
    color:       '#E84142',
    logoURI:     `${W3I}/avalanche.svg`,
    explorerUrl: 'https://testnet.snowtrace.io',
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
  },

  // ─── Polygon Amoy (domain 7) ──────────────────────────────────────────────
  {
    domain:      7,
    cctpName:    'Polygon_Amoy_Testnet',
    viemChain:   polygonAmoy,
    label:       'Polygon Amoy',
    badge:       'POL',
    color:       '#8247E5',
    logoURI:     `${W3I}/polygon-pos.svg`,
    explorerUrl: 'https://amoy.polygonscan.com',
    usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  },

  // ─── Unichain Sepolia (domain 10) ────────────────────────────────────────
  {
    domain:      10,
    cctpName:    'Unichain_Sepolia',
    viemChain:   unichainSepolia,
    label:       'Unichain Sepolia',
    badge:       'UNI',
    color:       '#FF007A',
    logoURI:     `${W3I}/unichain.svg`,
    explorerUrl: 'https://unichain-sepolia.blockscout.com',
    usdcAddress: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
  },

  // ─── Linea Sepolia (domain 11) ────────────────────────────────────────────
  {
    domain:      11,
    cctpName:    'Linea_Sepolia',
    viemChain:   lineaSepolia,
    label:       'Linea Sepolia',
    badge:       'LINEA',
    color:       '#61DFFF',
    logoURI:     `${W3I}/linea.svg`,
    explorerUrl: 'https://sepolia.lineascan.build',
    usdcAddress: '0xf62849F9A0B5Bf2913b396098F7c7019b51A820a',
  },

  // ─── Monad Testnet (domain 15) ───────────────────────────────────────────
  {
    domain:      15,
    cctpName:    'Monad_Testnet',
    viemChain:   monadTestnet,
    label:       'Monad Testnet',
    badge:       'MON',
    color:       '#836EF9',
    logoURI:     `${W3I}/monad.svg`,
    explorerUrl: 'https://testnet.monadexplorer.com',
    usdcAddress: '0x534b2f3A21130d7a60830c2Df862319e593943A3',
  },

  // ─── Ink Testnet (domain 21) ──────────────────────────────────────────────
  {
    domain:      21,
    cctpName:    'Ink_Testnet',
    viemChain:   inkSepolia,
    label:       'Ink Sepolia',
    badge:       'INK',
    color:       '#7B3FE4',
    logoURI:     '', // Not yet in web3icons — gradient fallback
    explorerUrl: 'https://explorer-sepolia.inkonchain.com',
    usdcAddress: '0x5875eEE11Cf8398102FdAd704C9E96607675467a',
  },

  // ─── Plume Sepolia (domain 22) ────────────────────────────────────────────
  {
    domain:      22,
    cctpName:    'Plume_Testnet',
    viemChain:   plumeSepolia,
    label:       'Plume Testnet',
    badge:       'PLUME',
    color:       '#E8A045',
    logoURI:     `${W3I}/plume.svg`,
    explorerUrl: 'https://testnet-explorer.plumenetwork.xyz',
    usdcAddress: '0x8Fb1E3605db8E1C2C1eE4bBeC0EB53c77d2D91D1',
  },

  // ─── World Chain Sepolia (domain 14) ─────────────────────────────────────
  {
    domain:      14,
    cctpName:    'World_Chain_Sepolia',
    viemChain:   worldchainSepolia,
    label:       'World Chain Sepolia',
    badge:       'WLD',
    color:       '#191C1F',
    logoURI:     '', // Not yet in web3icons — gradient fallback
    explorerUrl: 'https://worldchain-sepolia.explorer.alchemy.com',
    usdcAddress: '0xE6d8B281AAFbda4d39Ac65CEb24bfA4D79a65acd',
  },

  // ─── Sonic Blaze Testnet (domain 13) ─────────────────────────────────────
  {
    domain:      13,
    cctpName:    'Sonic_Testnet',
    viemChain:   sonicBlazeTestnet,
    label:       'Sonic Blaze',
    badge:       'S',
    color:       '#FC6B4F',
    logoURI:     `${W3I}/sonic.svg`,
    explorerUrl: 'https://testnet.soniclabs.com',
    usdcAddress: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
  },

  // ─── XDC Apothem (domain 18) ──────────────────────────────────────────────
  {
    domain:      18,
    cctpName:    'XDC_Apothem',
    viemChain:   xdcTestnet,
    label:       'XDC Apothem',
    badge:       'XDC',
    color:       '#F49D2A',
    logoURI:     `${W3I}/xinfin.svg`,
    explorerUrl: 'https://explorer.apothem.network',
    usdcAddress: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
  },
]

/** Tokens available to bridge via CCTP V2 */
export const BRIDGE_TOKENS: BridgeToken[] = [
  {
    symbol:   'USDC',
    name:     'USD Coin',
    logoURI:  `${W3T}/usdc.svg`,
    color:    '#2775CA',
    kitToken: 'USDC',
    note:     'Available on all chains',
  },
  {
    symbol:   'EURC',
    name:     'Euro Coin',
    logoURI:  `${W3T}/eurc.svg`,
    color:    '#2B5CE6',
    kitToken: 'EURC',
    note:     'Arc ↔ Ethereum, Base only',
  },
]

/** Lookup by cctpName */
export function getBridgeChain(cctpName: string): BridgeChain | undefined {
  return BRIDGE_CHAINS.find((c) => c.cctpName === cctpName)
}

/** Lookup by domain */
export function getBridgeChainByDomain(domain: number): BridgeChain | undefined {
  return BRIDGE_CHAINS.find((c) => c.domain === domain)
}

/** Arc Testnet entry (used as the default destination) */
export const ARC_TESTNET_CHAIN = BRIDGE_CHAINS[0]

/** Non-Arc chains */
export const EXTERNAL_CHAINS = BRIDGE_CHAINS.slice(1)

/** Chains that support EURC bridging (have eurcAddress set) */
export const EURC_CHAINS = BRIDGE_CHAINS.filter((c) => c.eurcAddress)
