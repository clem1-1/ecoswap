import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Star, LayoutGrid } from 'lucide-react'
import {
  BRIDGE_CHAINS, BRIDGE_TOKENS,
  type BridgeChain, type BridgeToken,
} from '@/constants/bridgeChains'
import { ChainLogo, TokenWithChain } from './BridgeLogos'

export type BridgeSide = 'from' | 'to'

interface Props {
  side: BridgeSide
  /** Chain on the opposite side — can't be picked again. */
  otherChain: BridgeChain
  selectedChain: BridgeChain
  selectedToken: BridgeToken
  onSelect: (chain: BridgeChain, token: BridgeToken) => void
  onClose: () => void
}

const STARRED = ['Arc_Testnet', 'Base_Sepolia', 'Ethereum_Sepolia']

function tokenAddress(token: BridgeToken, chain: BridgeChain): string | undefined {
  return token.symbol === 'USDC' ? chain.usdcAddress : chain.eurcAddress
}

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

export default function BridgeTokenModal({ side, otherChain, selectedChain, selectedToken, onSelect, onClose }: Props) {
  const [chainFilter, setChainFilter] = useState<string>('all')
  const [chainQuery, setChainQuery] = useState('')
  const [tokenQuery, setTokenQuery] = useState('')
  const tokenInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const chains = useMemo(() => BRIDGE_CHAINS.filter((c) => c.cctpName !== otherChain.cctpName), [otherChain])
  const visibleChains = useMemo(() => {
    const q = chainQuery.trim().toLowerCase()
    return q ? chains.filter((c) => c.label.toLowerCase().includes(q) || c.badge.toLowerCase().includes(q)) : chains
  }, [chains, chainQuery])
  const starred = visibleChains.filter((c) => STARRED.includes(c.cctpName))
  const alphabetical = [...visibleChains].sort((a, b) => a.label.localeCompare(b.label))

  const rows = useMemo(() => {
    const q = tokenQuery.trim().toLowerCase()
    const out: Array<{ chain: BridgeChain; token: BridgeToken; disabled: boolean; hint?: string }> = []
    const pool = chainFilter === 'all' ? chains : chains.filter((c) => c.cctpName === chainFilter)
    for (const chain of pool) {
      for (const token of BRIDGE_TOKENS) {
        const addr = tokenAddress(token, chain)
        if (!addr) continue
        if (q && !(token.symbol.toLowerCase().includes(q) || token.name.toLowerCase().includes(q) || chain.label.toLowerCase().includes(q) || addr.toLowerCase().includes(q))) continue
        let disabled = false
        let hint: string | undefined
        if (token.symbol === 'EURC') {
          const isArc = chain.cctpName === 'Arc_Testnet'
          if (side === 'from' && !isArc) { disabled = true; hint = 'EURC bridges from Arc only' }
          if (side === 'to' && isArc) { disabled = true; hint = 'Pick Arc as the source' }
        }
        out.push({ chain, token, disabled, hint })
      }
    }
    // Starred chains first, then A to Z
    return out.sort((a, b) => {
      const sa = STARRED.indexOf(a.chain.cctpName), sb = STARRED.indexOf(b.chain.cctpName)
      if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb)
      return a.chain.label.localeCompare(b.chain.label) || a.token.symbol.localeCompare(b.token.symbol)
    })
  }, [chains, chainFilter, tokenQuery, side])

  const chainBtn = (active: boolean) => ({
    background: active ? 'var(--bg-hover)' : 'transparent',
    color: 'var(--ink)',
  })

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(2,12,8,0.72)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Select token"
    >
      <div
        className="w-full max-w-[660px] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-elevated)', maxHeight: 'min(600px, 90dvh)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>Select Token</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 min-h-0 gap-3 px-3 pb-3 grid-cols-[148px_1fr] sm:grid-cols-[210px_1fr]">
          {/* ── Chains ── */}
          <div className="rounded-2xl p-2 flex flex-col min-h-0" style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl mb-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}>
              <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                value={chainQuery}
                onChange={(e) => setChainQuery(e.target.value)}
                placeholder="Search chains"
                className="w-full bg-transparent outline-none text-[13px] min-w-0"
                style={{ color: 'var(--ink)' }}
              />
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 pr-0.5">
              <button
                onClick={() => setChainFilter('all')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-[13px] font-semibold"
                style={chainBtn(chainFilter === 'all')}
              >
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
                  <LayoutGrid size={14} />
                </span>
                All Chains
              </button>

              {starred.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-2.5 pt-3 pb-1 text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
                    <Star size={11} fill="currentColor" style={{ color: 'var(--accent)' }} /> Starred Chains
                  </div>
                  {starred.map((c) => (
                    <button key={`s-${c.cctpName}`} onClick={() => setChainFilter(c.cctpName)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-[13px] font-semibold"
                      style={chainBtn(chainFilter === c.cctpName)}>
                      <ChainLogo chain={c} size={26} /> <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </>
              )}

              <div className="px-2.5 pt-3 pb-1 text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>Chains A-Z</div>
              {alphabetical.map((c) => (
                <button key={`a-${c.cctpName}`} onClick={() => setChainFilter(c.cctpName)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-[13px] font-semibold"
                  style={chainBtn(chainFilter === c.cctpName)}>
                  <ChainLogo chain={c} size={26} /> <span className="truncate">{c.label}</span>
                </button>
              ))}
              {visibleChains.length === 0 && (
                <div className="px-2.5 py-4 text-xs" style={{ color: 'var(--muted)' }}>No chains match</div>
              )}
            </div>
          </div>

          {/* ── Tokens ── */}
          <div className="flex flex-col min-h-0 min-w-0">
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl mb-2" style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}>
              <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                ref={tokenInputRef}
                autoFocus
                value={tokenQuery}
                onChange={(e) => setTokenQuery(e.target.value)}
                placeholder="Search for a token or paste address"
                className="w-full bg-transparent outline-none text-sm min-w-0"
                style={{ color: 'var(--ink)' }}
              />
            </div>
            <div className="px-1 pb-1.5 text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
              Bridgeable with Circle CCTP V2
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {rows.length === 0 && (
                <div className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>No tokens found</div>
              )}
              {rows.map(({ chain, token, disabled, hint }) => {
                const isSelected = chain.cctpName === selectedChain.cctpName && token.symbol === selectedToken.symbol
                return (
                  <button
                    key={`${chain.cctpName}-${token.symbol}`}
                    disabled={disabled}
                    onClick={() => onSelect(chain, token)}
                    className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-2xl text-left transition-colors"
                    style={{
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      opacity: disabled ? 0.4 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!disabled && !isSelected) e.currentTarget.style.background = 'var(--surface-hover)' }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <TokenWithChain token={token} chain={chain} size={40} />
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold leading-tight" style={{ color: 'var(--ink)' }}>{token.symbol}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                        {hint ?? `${chain.label} ${short(tokenAddress(token, chain))}`}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
