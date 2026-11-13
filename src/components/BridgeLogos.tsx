import React, { useState } from 'react'
import type { BridgeChain, BridgeToken } from '@/constants/bridgeChains'
import { FEATURED_TOKENS } from '@/constants/tokens'

/* ─────────────────────────────────────────────
   Chain logo — official web3icons CDN + Arc fallback
───────────────────────────────────────────── */
const W3I = 'https://raw.githubusercontent.com/0xa3k5/web3icons/refs/heads/main/raw-svgs/networks/branded'

// Map badge → web3icons slug (exact filenames from the repo)
const CHAIN_CDN_SLUG: Record<string, string> = {
  ETH:   'ethereum',
  BASE:  'base',
  ARB:   'arbitrum-one',
  OP:    'optimism',
  AVAX:  'avalanche',
  POL:   'polygon-pos',
  UNI:   'unichain',
  LINEA: 'linea',
  MON:   'monad',
  INK:   'ink',
  PLUME: 'plume',
  WLD:   'world-chain',
  S:     'sonic',
  XDC:   'xdc-network',
}

/* ─────────────────────────────────────────────
   ChainLogo — official web3icons CDN, Arc SVG fallback
───────────────────────────────────────────── */
export function ChainLogo({ chain, size = 32 }: { chain: BridgeChain; size?: number }) {
  const [imgErr, setImgErr] = useState(false)
  const slug = CHAIN_CDN_SLUG[chain.badge]

  // Arc: official Arc icon (white mark from arc.io) on Arc's navy app-icon circle.
  if (chain.badge === 'ARC') {
    return (
      <div
        className="rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ width: size, height: size, background: '#1B3158' }}
      >
        <img src="/brand/arc-icon.svg" alt="Arc" style={{ width: size * 0.54, height: size * 0.54, objectFit: 'contain', display: 'block' }} />
      </div>
    )
  }

  // Known chain with CDN slug — try official logo first
  if (slug && !imgErr) {
    return (
      <div className="rounded-full flex-shrink-0 overflow-hidden"
        style={{ width: size, height: size, boxShadow: `0 0 0 1.5px ${chain.color}40` }}>
        <img
          src={`${W3I}/${slug}.svg`}
          alt={chain.label}
          width={size}
          height={size}
          onError={() => setImgErr(true)}
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      </div>
    )
  }

  // Gradient ring fallback for unknown chains or CDN failure
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 35% 35%, ${chain.color}30, ${chain.color}08)`,
        boxShadow: `0 0 0 1.5px ${chain.color}50, inset 0 1px 0 ${chain.color}30`,
      }}
    >
      <span style={{ fontSize: size * 0.34, color: chain.color, fontWeight: 800, letterSpacing: '-0.02em' }}>
        {chain.badge.slice(0, 3)}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Token logo — inline SVG for USDC/EURC
───────────────────────────────────────────── */
const TOKEN_SVG: Record<string, (s: number) => React.ReactElement> = {
  USDC: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#2775CA"/>
      <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C21.523 26 26 21.523 26 16C26 10.477 21.523 6 16 6Z" fill="#2775CA"/>
      <path d="M18 19.5C18 20.328 17.328 21 16.5 21H15.5C14.672 21 14 20.328 14 19.5V19H12V17.5H14V14.5H12V13H14V12.5C14 11.672 14.672 11 15.5 11H16.5C17.328 11 18 11.672 18 12.5V13H20V14.5H18V17.5H20V19H18V19.5Z" fill="white"/>
      <path d="M16 8C11.582 8 8 11.582 8 16C8 20.418 11.582 24 16 24C20.418 24 24 20.418 24 16C24 11.582 20.418 8 16 8ZM16 22.4C12.468 22.4 9.6 19.532 9.6 16C9.6 12.468 12.468 9.6 16 9.6C19.532 9.6 22.4 12.468 22.4 16C22.4 19.532 19.532 22.4 16 22.4Z" fill="white" opacity="0.3"/>
    </svg>
  ),
  EURC: (s) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#2B5CE6"/>
      <circle cx="16" cy="16" r="8" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3"/>
      <path d="M19 13C19 13 18 11 16 11C13.8 11 12 12.8 12 15C12 17.2 13.8 19 16 19C18 19 19 17 19 17" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M11 15H18M11 17H17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}

export function TokenLogo({ token, size = 24 }: { token: BridgeToken; size?: number }) {
  const [imgErr, setImgErr] = useState(false)
  // Same logo source as the swap screen, so a token looks identical everywhere.
  const logoURI = FEATURED_TOKENS.find((t) => t.symbol === token.symbol)?.logoURI ?? token.logoURI

  if (logoURI && !imgErr) {
    return (
      <div className="rounded-full flex-shrink-0 overflow-hidden" style={{ width: size, height: size }}>
        <img
          src={logoURI}
          alt={token.symbol}
          width={size}
          height={size}
          onError={() => setImgErr(true)}
          style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block' }}
        />
      </div>
    )
  }

  const svgFn = TOKEN_SVG[token.symbol]
  if (svgFn) {
    return (
      <div className="rounded-full flex-shrink-0 overflow-hidden" style={{ width: size, height: size }}>
        {svgFn(size)}
      </div>
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 35% 35%, ${token.color}30, ${token.color}08)`,
        boxShadow: `0 0 0 1.5px ${token.color}50`,
      }}
    >
      <span style={{ fontSize: size * 0.4, color: token.color, fontWeight: 800 }}>{token.symbol[0]}</span>
    </div>
  )
}

/** Token logo with a small chain badge in the corner (Relay style). */
export function TokenWithChain({ token, chain, size = 40 }: { token: BridgeToken; chain: BridgeChain; size?: number }) {
  const badge = Math.round(size * 0.46)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <TokenLogo token={token} size={size} />
      <div
        className="absolute rounded-full"
        style={{ right: -3, bottom: -3, padding: 2, background: 'var(--bg-elevated)', lineHeight: 0 }}
      >
        <ChainLogo chain={chain} size={badge} />
      </div>
    </div>
  )
}
