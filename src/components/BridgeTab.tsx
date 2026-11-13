/**
 * BridgeTab — Premium CCTP cross-chain bridge
 * Relay.link-inspired layout: solid opaque dropdown, chain picker with logos,
 * fee breakdown card, horizontal step stepper.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { AppKit, BridgeChain as BridgeChainEnum } from '@circle-fin/app-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import type { EIP1193Provider } from 'viem'
import type { BridgeResult } from '@circle-fin/app-kit'
import {
  ArrowDown, ChevronRight, Settings, ExternalLink, AlertTriangle,
  CheckCircle2, Loader2, XCircle, Droplets,
  Clock, Zap, Shield, TrendingUp,
} from 'lucide-react'
import {
  BRIDGE_TOKENS, ARC_TESTNET_CHAIN, EXTERNAL_CHAINS,
  type BridgeChain, type BridgeToken,
} from '@/constants/bridgeChains'
import { TokenLogo, TokenWithChain } from './BridgeLogos'
import BridgeTokenModal, { type BridgeSide } from './BridgeTokenModal'
import { addActivity } from '@/hooks/useActivity'
import { usePythPrice, deriveMarketRate, formatOracleDelta } from '@/lib/usePythPrice'

/* ── singleton App Kit instance ── */
const appKit = new AppKit()

/* ── Step types ── */
type StepName  = 'approve' | 'burn' | 'fetchAttestation' | 'mint'
type StepState = 'pending' | 'active' | 'success' | 'error'
interface StepInfo {
  name:        StepName
  label:       string
  icon:        'shield' | 'zap' | 'clock' | 'check'
  txHash?:     string
  explorerUrl?: string
  state:       StepState
}

const INITIAL_STEPS: StepInfo[] = [
  { name: 'approve',          label: 'Approve',     icon: 'shield', state: 'pending' },
  { name: 'burn',             label: 'Burn',         icon: 'zap',   state: 'pending' },
  { name: 'fetchAttestation', label: 'Attest',       icon: 'clock', state: 'pending' },
  { name: 'mint',             label: 'Mint',         icon: 'check', state: 'pending' },
]

/* ─────────────────────────────────────────────
   Relay-style token + chain button
───────────────────────────────────────────── */
const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
const trimNum = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 6 })

function TokenChainButton({ token, chain, onClick, label }: { token: BridgeToken; chain: BridgeChain; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center gap-2.5 rounded-full pl-2 pr-3.5 py-2 flex-shrink-0 transition-colors"
      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <TokenWithChain token={token} chain={chain} size={36} />
      <div className="text-left leading-tight">
        <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{token.symbol}</div>
        <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{chain.label}</div>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
    </button>
  )
}

/* ─────────────────────────────────────────────
   Relay-style horizontal step stepper
───────────────────────────────────────────── */
function StepStepper({ steps }: { steps: StepInfo[] }) {
  return (
    <div className="flex items-center gap-1 py-3">
      {steps.map((step, i) => {
        const isDone    = step.state === 'success'
        const isActive  = step.state === 'active'
        const isError   = step.state === 'error'
        const isPending = step.state === 'pending'

        const dotColor = isDone ? '#0F9D6B'
          : isActive  ? '#14B8A6'
          : isError   ? '#EF4444'
          : 'rgba(255,255,255,0.12)'

        const labelColor = isDone ? '#0F9D6B'
          : isActive ? 'var(--ink)'
          : 'var(--muted)'

        const lineColor = isDone ? 'rgba(15,157,107,0.50)' : 'rgba(255,255,255,0.07)'

        return (
          <div key={step.name} className="flex items-center" style={{ flex: i < steps.length - 1 ? '1' : '0 0 auto' }}>
            {/* Step */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: isDone ? 'rgba(15,157,107,0.15)'
                    : isActive ? 'rgba(20,184,166,0.15)'
                    : isError  ? 'rgba(239,68,68,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${dotColor}`,
                  boxShadow: isActive ? '0 0 12px rgba(20,184,166,0.35)' : 'none',
                }}
              >
                {isDone   && <CheckCircle2 size={14} style={{ color: '#0F9D6B' }} />}
                {isActive && <Loader2 size={14} className="animate-spin" style={{ color: '#14B8A6' }} />}
                {isError  && <XCircle size={14} style={{ color: '#EF4444' }} />}
                {isPending && (
                  <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] font-semibold whitespace-nowrap transition-colors" style={{ color: labelColor }}>
                  {step.label}
                </span>
                {step.txHash && step.explorerUrl && (
                  <a
                    href={`${step.explorerUrl}/tx/${step.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] flex items-center gap-0.5"
                    style={{ color: 'var(--accent)' }}
                  >
                    Tx <ExternalLink size={9} />
                  </a>
                )}
              </div>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-1 transition-all duration-500"
                style={{ background: lineColor }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Faucet banner
───────────────────────────────────────────── */
function FaucetBanner() {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('ecoswap-bridge-faucet-dismissed') === '1'
  )
  if (dismissed) return null
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm mb-4"
      style={{
        background: 'rgba(15,157,107,0.07)',
        border: '1px solid rgba(15,157,107,0.18)',
      }}
    >
      <Droplets size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      <div className="flex-1 text-xs">
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>New to Arc Testnet?</span>
        <span style={{ color: 'var(--muted)' }}> Claim free USDC gas. </span>
        <a
          href="https://faucet.circle.com"
          target="_blank" rel="noopener noreferrer"
          className="font-semibold underline"
          style={{ color: 'var(--accent)' }}
        >Faucet →</a>
      </div>
      <button
        onClick={() => { localStorage.setItem('ecoswap-bridge-faucet-dismissed', '1'); setDismissed(true) }}
        className="text-xs opacity-40 hover:opacity-80 transition-opacity"
        aria-label="Dismiss"
      >✕</button>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Quote preview card (Relay-style)
───────────────────────────────────────────── */
function QuoteCard({ amount, token, fromSymbol }: { amount: string; token: BridgeToken; fromSymbol: string }) {
  const parsed = parseFloat(amount)
  // Oracle — CCTP is 1:1 so market rate shows if the peg holds
  const feedKeys = useMemo<('EURC/USD' | 'BTC/USD' | 'ETH/USD' | 'USDC/USD')[]>(() => {
    const k: ('EURC/USD' | 'BTC/USD' | 'ETH/USD' | 'USDC/USD')[] = ['USDC/USD']
    if (token.symbol === 'EURC' || fromSymbol === 'EURC') k.push('EURC/USD')
    return k
  }, [token.symbol, fromSymbol])
  const { prices } = usePythPrice(feedKeys)
  const marketRate = useMemo(() => deriveMarketRate(prices, fromSymbol, token.symbol), [prices, fromSymbol, token.symbol])
  const oracleDelta = useMemo(() => {
    if (!marketRate || isNaN(parsed) || parsed <= 0) return null
    return formatOracleDelta(parsed, parsed, marketRate)
  }, [marketRate, parsed])
  if (isNaN(parsed) || parsed <= 0) return null
  return (
    <div
      className="rounded-2xl overflow-hidden mt-3"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(15,157,107,0.12)',
      }}
    >
      {/* You receive */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>You receive</span>
        <div className="flex items-center gap-2">
          <TokenLogo token={token} size={18} />
          <span className="tabular-nums font-black text-xl" style={{ color: 'var(--ink)' }}>
            {parsed.toFixed(6)}
          </span>
          <span className="font-bold text-sm" style={{ color: 'var(--muted)' }}>{token.symbol}</span>
        </div>
      </div>

      {/* Fee rows */}
      <div className="px-4 pb-3.5 flex flex-col gap-1.5 mt-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <Shield size={11} />
            <span>Bridge fee</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Free (testnet)</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <Zap size={11} />
            <span>Gas (source)</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>~$0.01 USDC</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <Clock size={11} />
            <span>Est. time</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>~8–20 seconds</span>
        </div>
        {marketRate && (
          <div className="flex justify-between items-center pt-1 mt-0.5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <TrendingUp size={11} />
              <span>Oracle rate</span>
            </div>
            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
              1 {fromSymbol} = {marketRate.toFixed(6)} {token.symbol}
            </span>
          </div>
        )}
        {oracleDelta && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <span>vs. market</span>
            </div>
            <span className="text-xs font-semibold tabular-nums" style={{
              color: oracleDelta.isAbove ? 'var(--success)' : 'var(--danger)',
            }}>
              {oracleDelta.label}
            </span>
          </div>
        )}
      </div>

      {/* Route badge */}
      <div
        className="flex items-center justify-between px-4 py-2 text-[11px]"
        style={{ background: 'rgba(15,157,107,0.06)', borderTop: '1px solid rgba(15,157,107,0.10)' }}
      >
        <span style={{ color: 'var(--muted)' }}>Route</span>
        <span className="font-semibold" style={{ color: 'var(--accent)' }}>Circle CCTP V2 · 1:1 guaranteed</span>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   Main BridgeTab
   ════════════════════════════════════════════════ */
export default function BridgeTab() {
  const { address, connector, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [fromChain,         setFromChain]         = useState<BridgeChain>(EXTERNAL_CHAINS[0])
  const [toChain,           setToChain]           = useState<BridgeChain>(ARC_TESTNET_CHAIN)
  const [amount,            setAmount]            = useState('')
  const [selectedToken,     setSelectedToken]     = useState<BridgeToken>(BRIDGE_TOKENS[0])
  const [recipientOverride, setRecipientOverride] = useState<string | undefined>(undefined)
  const [showRecipient,     setShowRecipient]     = useState(false)
  const [modalSide,         setModalSide]         = useState<BridgeSide | null>(null)

  type Phase = 'idle' | 'bridging' | 'success' | 'error'
  const [phase,     setPhase]     = useState<Phase>('idle')
  const [steps,     setSteps]     = useState<StepInfo[]>(INITIAL_STEPS)
  const [errMsg,    setErrMsg]    = useState('')
  const [resultRef, setResultRef] = useState<BridgeResult<string> | null>(null)

  const recipient   = recipientOverride ?? address ?? ''
  const parsedAmount = parseFloat(amount)
  const amountValid  = !isNaN(parsedAmount) && parsedAmount > 0
  const eurcDisabled = fromChain.cctpName !== 'Arc_Testnet'
  const eurcWarning  = selectedToken.symbol === 'EURC' && eurcDisabled

  const { prices: usdPrices } = usePythPrice(['EURC/USD', 'USDC/USD'])
  const unitUsd = usdPrices[`${selectedToken.symbol}/USD`]?.price
  const usdValue = amountValid && unitUsd
    ? `$${(parsedAmount * unitUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00'

  const handleModalSelect = useCallback((chain: BridgeChain, token: BridgeToken) => {
    if (modalSide === 'from') {
      setFromChain(chain)
    } else {
      setToChain(chain)
      if (token.symbol === 'EURC') setFromChain((f) => (f.cctpName === 'Arc_Testnet' ? f : ARC_TESTNET_CHAIN))
    }
    setSelectedToken(token)
    setModalSide(null)
  }, [modalSide])

  const handleFlip = useCallback(() => {
    setFromChain(toChain)
    setToChain(fromChain)
    setAmount('')
    if (selectedToken.symbol === 'EURC' && toChain.cctpName !== 'Arc_Testnet') {
      setSelectedToken(BRIDGE_TOKENS[0])
    }
  }, [fromChain, toChain, selectedToken])

  const updateStep = useCallback((name: StepName, state: StepState, txHash?: string, explorerUrl?: string) => {
    setSteps((prev) => prev.map((s) =>
      s.name === name ? { ...s, state, ...(txHash ? { txHash, explorerUrl } : {}) } : s
    ))
  }, [])

  const handleBridge = useCallback(async () => {
    if (!connector || !address || !amountValid) return
    setPhase('bridging')
    setErrMsg('')
    setResultRef(null)
    // Reset all steps to pending
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, state: 'pending' as StepState })))

    // ── Wire App Kit events → stepper BEFORE calling bridge ──────────────
    // App Kit fires 'approve', 'burn', 'fetchAttestation', 'mint' events
    // with payload { values: { state, txHash?, ... } } as each step runs.
    // We subscribe first so the stepper reflects real wallet interactions.
    // AppKit prefixes bridge action names with 'bridge.'
    // e.g. 'bridge.approve', 'bridge.burn', 'bridge.fetchAttestation', 'bridge.mint'
    type KitStepPayload = { values?: { state?: string; txHash?: string } }
    type AppKitBridgeEventName = 'bridge.approve' | 'bridge.burn' | 'bridge.fetchAttestation' | 'bridge.mint'

    const stepOrder: StepName[] = ['approve', 'burn', 'fetchAttestation', 'mint']
    const kitNames: AppKitBridgeEventName[] = ['bridge.approve', 'bridge.burn', 'bridge.fetchAttestation', 'bridge.mint']

    const makeHandler = (stepName: StepName) => (payload: KitStepPayload) => {
      const state  = payload?.values?.state
      const txHash = payload?.values?.txHash
      // Map App Kit step state → our stepper state
      const stepState: StepState =
        state === 'success' ? 'success'
        : state === 'error' ? 'error'
        : 'active'
      const explorerUrl = stepName === 'mint' ? toChain.explorerUrl : fromChain.explorerUrl
      updateStep(stepName, stepState, txHash, explorerUrl)
      // When a step completes, mark the next one as active
      if (stepState === 'success') {
        const idx = stepOrder.indexOf(stepName)
        if (idx >= 0 && idx < stepOrder.length - 1) {
          updateStep(stepOrder[idx + 1], 'active')
        }
      }
    }

    // Register handlers using the prefixed 'bridge.*' action names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers: Record<AppKitBridgeEventName, (p: any) => void> = {
      'bridge.approve':          makeHandler('approve'),
      'bridge.burn':             makeHandler('burn'),
      'bridge.fetchAttestation': makeHandler('fetchAttestation'),
      'bridge.mint':             makeHandler('mint'),
    }
    kitNames.forEach((name) => appKit.on(name, handlers[name]))
    // Mark first step as active immediately so UI shows progress right away
    updateStep('approve', 'active')

    try {
      if (chainId !== fromChain.viemChain.id) {
        await switchChainAsync({ chainId: fromChain.viemChain.id })
      }
      const provider = (await connector.getProvider()) as EIP1193Provider
      const adapter  = await createViemAdapterFromProvider({ provider })

      const dest = recipient && recipient !== address
        ? { adapter, chain: toChain.cctpName as BridgeChainEnum, recipientAddress: recipient as `0x${string}` }
        : { adapter, chain: toChain.cctpName as BridgeChainEnum }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (appKit.bridge as (p: any) => Promise<BridgeResult<string>>)({
        from:   { adapter, chain: fromChain.cctpName as BridgeChainEnum },
        to:     dest,
        amount: parsedAmount.toFixed(6),
        token:  selectedToken.kitToken,
      })

      setResultRef(result)

      if (result.state === 'success') {
        // Mark all steps success (events may have already done this)
        INITIAL_STEPS.forEach((s) => updateStep(s.name, 'success'))
        setPhase('success')
        const burnStep = result.steps?.find((s) => s.name === 'burn')
        const burnHash = burnStep && 'txHash' in burnStep ? (burnStep as { txHash?: string }).txHash : undefined
        addActivity({
          type: 'bridge',
          description: `Bridged ${amount} ${selectedToken.symbol} · ${fromChain.label} → ${toChain.label}`,
          txHash: burnHash,
          chainId: fromChain.viemChain.id,
          explorerBase: fromChain.explorerUrl,
          amount,
          token: selectedToken.symbol,
          fromChain: fromChain.label,
          toChain: toChain.label,
        })
      } else {
        setErrMsg('Bridge failed. You can retry below.')
        setPhase('error')
        setSteps((prev) => prev.map((s) => s.state === 'active' ? { ...s, state: 'error' } : s))
      }
    } catch (err: unknown) {
      const msg      = err instanceof Error ? err.message : 'Unknown error'
      const friendly = msg.includes('rejected') || msg.includes('denied')
        ? 'Transaction rejected in wallet.'
        : msg.includes('insufficient')
        ? `Insufficient ${selectedToken.symbol} balance.`
        : `Bridge error: ${msg.slice(0, 100)}`
      console.error('BRIDGE ERROR:', err)
      setErrMsg(friendly)
      setPhase('error')
      setSteps((prev) => prev.map((s) => s.state === 'active' ? { ...s, state: 'error' } : s))
    } finally {
      // Always clean up event listeners
      kitNames.forEach((name) => appKit.off(name, handlers[name]))
    }
  }, [connector, address, amount, amountValid, chainId, fromChain, toChain, parsedAmount, recipient, switchChainAsync, updateStep, selectedToken])

  const handleRetry = useCallback(async () => {
    if (!connector || !resultRef) return
    setPhase('bridging')
    setErrMsg('')
    try {
      const provider = (await connector.getProvider()) as EIP1193Provider
      const adapter  = await createViemAdapterFromProvider({ provider })
      const result   = await appKit.retryBridge(resultRef, { from: adapter, to: adapter })
      if (result.state === 'success') {
        INITIAL_STEPS.forEach((s) => updateStep(s.name, 'success'))
        setPhase('success')
      } else {
        setErrMsg('Retry failed.')
        setPhase('error')
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'Retry error')
      setPhase('error')
    }
  }, [connector, resultRef, updateStep])

  const isDisabled   = !isConnected || !amountValid || phase === 'bridging' || eurcWarning
  const btnLabel     = !isConnected ? 'Connect Wallet'
    : !amountValid         ? 'Enter Amount'
    : eurcWarning          ? 'Set Arc as Source for EURC'
    : phase === 'bridging' ? 'Bridging…'
    : `Bridge ${amount} ${selectedToken.symbol}`

  return (
    <div className="w-full max-w-[440px] mx-auto px-4 pb-24 sm:pb-8 pt-4">

      {isConnected && <FaucetBanner />}

      {modalSide && (
        <BridgeTokenModal
          side={modalSide}
          otherChain={modalSide === 'from' ? toChain : fromChain}
          selectedChain={modalSide === 'from' ? fromChain : toChain}
          selectedToken={selectedToken}
          onSelect={handleModalSelect}
          onClose={() => setModalSide(null)}
        />
      )}

      {/* ── Main card ── */}
      <div className="glass-card swap-card p-4 sm:p-5">

        {/* Header: tab pill + settings */}
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex p-1 rounded-full" style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}>
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--ink)' }}>
              Bridge
            </span>
          </div>
          {(phase === 'idle' || phase === 'error') && (
            <button
              type="button"
              onClick={() => setShowRecipient((v) => !v)}
              aria-label="Bridge settings"
              aria-pressed={showRecipient}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: showRecipient ? 'var(--bg-hover)' : 'transparent', border: '1px solid var(--border)', color: 'var(--ink-2)' }}
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        {/* ── Idle / Error form ── */}
        {(phase === 'idle' || phase === 'error') && (
          <>
            {showRecipient && (
              <div className="rounded-2xl p-3 mb-2" style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}>
                <label className="block text-[12px] mb-1.5" style={{ color: 'var(--muted)' }}>Recipient address</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipientOverride(e.target.value)}
                  placeholder="0x… (defaults to your wallet)"
                  className="w-full rounded-xl px-3 py-2 outline-none font-mono"
                  style={{ color: 'var(--ink)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 12 }}
                  aria-label="Recipient address"
                />
              </div>
            )}

            {/* SELL */}
            <div className="rounded-2xl px-4 pt-3 pb-3.5" style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Sell</span>
                <span className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                  {isConnected && address ? shortAddr(address) : 'Select wallet'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isDisabled) void handleBridge() }}
                  className="flex-1 bg-transparent outline-none tabular-nums font-semibold w-0 min-w-0"
                  style={{ color: 'var(--ink)', fontSize: 44, lineHeight: 1.1, letterSpacing: '-0.03em' }}
                  aria-label="Bridge amount"
                />
                <TokenChainButton token={selectedToken} chain={fromChain} onClick={() => setModalSide('from')} label="Select source token" />
              </div>
              <div className="mt-1.5 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{usdValue}</div>
            </div>

            {/* Flip */}
            <div className="flex justify-center relative z-10" style={{ margin: '-14px 0' }}>
              <button
                onClick={handleFlip}
                className="flip-btn"
                style={{ width: 34, height: 34, borderRadius: 10 }}
                aria-label="Flip bridge direction"
              >
                <ArrowDown size={14} />
              </button>
            </div>

            {/* BUY */}
            <div className="rounded-2xl px-4 pt-3 pb-3.5" style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Buy</span>
                <span className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                  {recipient ? shortAddr(recipient) : 'Select wallet'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div
                  className="flex-1 tabular-nums font-semibold min-w-0 truncate"
                  style={{ color: amountValid ? 'var(--ink)' : 'var(--muted)', fontSize: 44, lineHeight: 1.1, letterSpacing: '-0.03em' }}
                >
                  {amountValid ? trimNum(parsedAmount) : '0'}
                </div>
                <TokenChainButton token={selectedToken} chain={toChain} onClick={() => setModalSide('to')} label="Select destination token" />
              </div>
              <div className="mt-1.5 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{usdValue}</div>
            </div>

            {/* EURC warning */}
            {eurcWarning && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl mt-2 text-xs"
                style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)', color: '#FBBF24' }}
              >
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                <span>EURC is natively issued on Arc. Switch source to Arc Testnet to bridge EURC.</span>
              </div>
            )}

            {/* Quote card */}
            <QuoteCard amount={amount} token={selectedToken} fromSymbol={selectedToken.symbol} />

            {/* Error */}
            {phase === 'error' && errMsg && (
              <div
                className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
              >
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{errMsg}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-2.5 flex flex-col gap-2">
              {!isConnected ? (
                <ConnectKitButton.Custom>
                  {({ show }) => (
                    <button onClick={show} className="w-full py-4 rounded-2xl text-[15px] font-extrabold uppercase tracking-wide text-white transition-all active:scale-[0.99]"
                      style={{ background: 'var(--grad-btn)', boxShadow: 'var(--shadow-btn)' }}>
                      Connect Wallet
                    </button>
                  )}
                </ConnectKitButton.Custom>
              ) : (
                <button
                  onClick={() => void handleBridge()}
                  disabled={isDisabled}
                  className="w-full py-4 rounded-2xl text-[15px] font-extrabold uppercase tracking-wide transition-all active:scale-[0.99]"
                  style={{
                    background: isDisabled ? 'var(--bg-hover)' : 'var(--grad-btn)',
                    color: isDisabled ? 'var(--muted)' : '#fff',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: isDisabled ? 'none' : 'var(--shadow-btn)',
                  }}
                >
                  {btnLabel}
                </button>
              )}

              {phase === 'error' && resultRef && (
                <button
                  onClick={() => void handleRetry()}
                  className="w-full py-3 rounded-2xl font-semibold text-sm transition-all"
                  style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
                >
                  Retry from last checkpoint
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Bridging state ── */}
        {phase === 'bridging' && (
          <div className="py-2">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(20,184,166,0.12)', border: '1.5px solid rgba(20,184,166,0.30)' }}
              >
                <Loader2 size={18} className="animate-spin" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>
                  Bridging {amount} {selectedToken.symbol}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {fromChain.label} → {toChain.label}
                </div>
              </div>
            </div>
            <StepStepper steps={steps} />
            <div className="mt-4 text-[11px] text-center" style={{ color: 'var(--muted)' }}>
              Keep this tab open during bridging
            </div>
          </div>
        )}

        {/* ── Success state ── */}
        {phase === 'success' && (
          <div className="py-4 flex flex-col items-center gap-5">
            {/* Success glow */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(15,157,107,0.10)',
                border: '2px solid rgba(15,157,107,0.28)',
                boxShadow: '0 0 40px rgba(15,157,107,0.20)',
              }}
            >
              <CheckCircle2 size={36} style={{ color: '#0F9D6B' }} />
            </div>

            <div className="text-center">
              <div className="font-black text-xl" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                Bridge Complete
              </div>
              <div className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>
                {amount} {selectedToken.symbol} · {fromChain.label} → {toChain.label}
              </div>
            </div>

            <div className="w-full">
              <StepStepper steps={steps} />
            </div>

            <button
              onClick={() => {
                setPhase('idle')
                setAmount('')
                setSteps(INITIAL_STEPS.map((s) => ({ ...s, state: 'pending' as StepState })))
              }}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all"
              style={{ background: 'var(--grad-btn)', boxShadow: '0 4px 20px rgba(15,157,107,0.25)' }}
            >
              Bridge Again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] mt-3" style={{ color: 'var(--muted)' }}>
        Testnet only · USDC and EURC have no real value on testnet
      </p>
    </div>
  )
}
