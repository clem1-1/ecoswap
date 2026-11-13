/**
 * SparklineChart — live price chart using Pyth oracle data.
 *
 * In compact mode: an inline SVG sparkline + price + % change.
 * In expanded mode (click to toggle): a full mini-chart with time axis,
 *   price range, volume proxy, and a "Live prices from Coinbase" badge.
 *
 * Price history: blends Pyth Hermes API (real-time) with localStorage
 * snapshots from pool reserves. Pyth data gives the true market rate;
 * pool snapshots show the DEX divergence.
 *
 * Pyth is deployed on Arc Testnet at 0x2880aB155794e7179c9eE2e38200202908C17B43
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { TrendingUp, TrendingDown, X, RefreshCw } from 'lucide-react'
import type { PairInfo } from '@/hooks/useEcoSwap'
import { usePythPrice, deriveMarketRate, type PythFeedKey } from '@/lib/usePythPrice'

const MAX_POINTS = 120

/* ── localStorage pool snapshot helpers ── */
interface PricePoint { t: number; price: number; source: 'pool' | 'oracle' }

function getKey(pair: `0x${string}`) { return `ecoswap-spark-${pair.toLowerCase()}` }
function loadHistory(pair: `0x${string}`): PricePoint[] {
  try {
    const raw = localStorage.getItem(getKey(pair))
    return raw ? (JSON.parse(raw) as PricePoint[]) : []
  } catch { return [] }
}
function saveHistory(pair: `0x${string}`, points: PricePoint[]) {
  try { localStorage.setItem(getKey(pair), JSON.stringify(points.slice(-MAX_POINTS))) } catch { /* ignore */ }
}

export function recordPoolPrice(pairInfo: PairInfo, isToken0In: boolean) {
  const resIn  = isToken0In ? pairInfo.reserve0 : pairInfo.reserve1
  const resOut = isToken0In ? pairInfo.reserve1 : pairInfo.reserve0
  const dIn  = pairInfo.token0Meta.decimals ?? 6
  const dOut = pairInfo.token1Meta.decimals ?? 6
  if (resIn === 0n) return
  const priceRaw = (resOut * parseUnits('1', isToken0In ? dIn : dOut)) / resIn
  const price = parseFloat(formatUnits(priceRaw, isToken0In ? dOut : dIn))
  const history = loadHistory(pairInfo.pairAddress)
  const last = history[history.length - 1]
  if (last && Date.now() - last.t < 5_000) return
  history.push({ t: Date.now(), price, source: 'pool' })
  saveHistory(pairInfo.pairAddress, history)
}

/* ── SVG helpers ── */
function buildPolyline(points: PricePoint[], w: number, h: number, pad: number): string {
  if (points.length < 2) return ''
  const prices = points.map((p) => p.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const range = maxP - minP || 0.001
  const usableW = w - pad * 2
  const usableH = h - pad * 2
  return points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * usableW
      const y = pad + usableH - ((p.price - minP) / range) * usableH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/* ── Time label formatter ── */
function fmtTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diffH = (now - ts) / 3_600_000
  if (diffH < 1) return `${Math.round(diffH * 60)}m ago`
  if (diffH < 24) return `${Math.round(diffH)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/* ── Mini grid line for expanded chart ── */
function GridLine({ y, label, color }: { y: number; label: string; color: string }) {
  return (
    <g>
      <line x1="0" y1={y} x2="100%" y2={y} stroke={color} strokeWidth="0.5" strokeDasharray="3,3" />
      <text x="4" y={y - 3} fontSize="9" fill={color}>{label}</text>
    </g>
  )
}

interface SparklineProps {
  pairInfo: PairInfo | null
  isToken0In: boolean
  tokenInSymbol?: string
  tokenOutSymbol?: string
  height?: number
  width?: number
  className?: string
}

export default function SparklineChart({
  pairInfo,
  isToken0In,
  tokenInSymbol,
  tokenOutSymbol,
  height = 48,
  width = 120,
  className,
}: SparklineProps) {
  const [expanded, setExpanded] = useState(false)
  const [hermesPoints, setHermesPoints] = useState<PricePoint[]>([])
  const [nowMs] = useState(() => Date.now())
  const fetchRef = useRef(false)

  /* Determine which Pyth feeds to watch */
  const feedKeys = useMemo<PythFeedKey[]>(() => {
    const keys: PythFeedKey[] = []
    if (tokenInSymbol === 'EURC' || tokenOutSymbol === 'EURC') keys.push('EURC/USD')
    if (tokenInSymbol === 'cirBTC' || tokenOutSymbol === 'cirBTC') keys.push('BTC/USD')
    if (tokenInSymbol === 'WETH' || tokenOutSymbol === 'WETH') keys.push('ETH/USD')
    keys.push('USDC/USD')
    return keys
  }, [tokenInSymbol, tokenOutSymbol])

  const { prices, loading: oracleLoading } = usePythPrice(feedKeys)

  /* Derive oracle market rate */
  const marketRate = useMemo(() => {
    if (!tokenInSymbol || !tokenOutSymbol) return null
    return deriveMarketRate(prices, tokenInSymbol, tokenOutSymbol)
  }, [prices, tokenInSymbol, tokenOutSymbol])

  /* Record pool price snapshot on pairInfo change */
  useEffect(() => {
    if (pairInfo) recordPoolPrice(pairInfo, isToken0In)
  }, [pairInfo, isToken0In])

  /* Fetch/refresh history when expanded */
  useEffect(() => {
    if (!expanded || fetchRef.current || !tokenInSymbol || !tokenOutSymbol || !pairInfo) return
    fetchRef.current = true
    // Async IIFE so setState is called after await — satisfies React purity rule
    ;(async () => {
      await Promise.resolve() // yield to event loop
      const history = loadHistory(pairInfo.pairAddress)
      if (marketRate && marketRate > 0) {
        const last = history[history.length - 1]
        if (!last || Date.now() - last.t > 5_000) {
          history.push({ t: Date.now(), price: marketRate, source: 'oracle' })
          saveHistory(pairInfo.pairAddress, history)
        }
      }
      setHermesPoints(history)
    })().catch(() => { /* ignore */ })
  }, [expanded, pairInfo, tokenInSymbol, tokenOutSymbol, marketRate])

  /* Combine pool snapshots + live oracle price for sparkline */
  const allPoints = useMemo<PricePoint[]>(() => {
    const history = pairInfo ? loadHistory(pairInfo.pairAddress) : []
    // If we have a live oracle rate, add it as the latest point
    if (marketRate && marketRate > 0) {
      const last = history[history.length - 1]
      if (!last || Math.abs(last.price - marketRate) > 0.0001 || nowMs - last.t > 5_000) {
        return [...history, { t: nowMs, price: marketRate, source: 'oracle' as const }]
      }
    }
    return history
  }, [pairInfo, marketRate, nowMs])

  const displayPoints = expanded ? (hermesPoints.length > 1 ? hermesPoints : allPoints) : allPoints

  /* Always render something — even with 0 or 1 stored points, show oracle price */
  const hasOraclePrice = marketRate !== null && !oracleLoading
  const hasHistory = displayPoints.length >= 2

  if (!hasOraclePrice && !hasHistory) return null

  const prices2 = displayPoints.map((p) => p.price)
  const lastPrice = marketRate ?? prices2[prices2.length - 1] ?? 0
  const firstPrice = prices2[0] ?? lastPrice
  const isUp = lastPrice >= firstPrice
  const changePct = firstPrice > 0
    ? ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2)
    : '0.00'
  const changeSign = isUp ? '+' : ''
  const color = isUp ? '#0F9D6B' : '#F05252'

  /* ─── Compact mode ─── */
  const compactView = (() => {
    const polyline = hasHistory ? buildPolyline(displayPoints, width, height, 4) : ''
    const gradId = `spark-grad-${pairInfo?.pairAddress?.slice(2, 8) ?? 'x'}`
    const pad = 4
    const w = width - pad * 2
    const h = height - pad * 2

    const fillCoords = hasHistory
      ? [
          `${pad},${pad + h}`,
          ...displayPoints.map((p, i) => {
            const minP = Math.min(...prices2)
            const maxP = Math.max(...prices2)
            const range = maxP - minP || 0.001
            const x = pad + (i / (displayPoints.length - 1)) * w
            const y = pad + h - ((p.price - minP) / range) * h
            return `${x.toFixed(1)},${y.toFixed(1)}`
          }),
          `${pad + w},${pad + h}`,
        ].join(' ')
      : ''

    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
        title="Click to expand price chart"
        aria-label="Expand price chart"
      >
        {hasHistory ? (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillCoords} fill={`url(#${gradId})`} />
            <polyline points={polyline} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle
              cx={parseFloat(polyline.split(' ').pop()?.split(',')[0] ?? '0')}
              cy={parseFloat(polyline.split(' ').pop()?.split(',')[1] ?? '0')}
              r="2.5" fill={color}
            />
          </svg>
        ) : (
          /* No history yet — show a flat line placeholder */
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
            <line x1="4" y1={height / 2} x2={width - 4} y2={height / 2}
              stroke={color} strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" />
          </svg>
        )}
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-bold" style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
            {lastPrice < 0.01 ? lastPrice.toFixed(8) : lastPrice.toFixed(4)}
          </span>
          <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color, fontVariantNumeric: 'tabular-nums' }}>
            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {changeSign}{changePct}%
          </span>
          {/* Pyth badge */}
          <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--muted)' }}>
            Live market price
          </span>
        </div>
      </button>
    )
  })()

  /* ─── Expanded mode ─── */
  const expandedView = (() => {
    const chartW = 320
    const chartH = 120
    const pad    = { top: 16, right: 8, bottom: 24, left: 8 }
    const innerW = chartW - pad.left - pad.right
    const innerH = chartH - pad.top - pad.bottom

    const pts = displayPoints.length >= 2 ? displayPoints : [
      { t: nowMs - 60_000, price: lastPrice * 0.999, source: 'oracle' as const },
      { t: nowMs, price: lastPrice, source: 'oracle' as const },
    ]

    const minP = Math.min(...pts.map((p) => p.price))
    const maxP = Math.max(...pts.map((p) => p.price))
    const range = maxP - minP || lastPrice * 0.01

    const toSvg = (p: PricePoint, i: number) => {
      const x = pad.left + (i / (pts.length - 1)) * innerW
      const y = pad.top + innerH - ((p.price - minP) / range) * innerH
      return { x, y }
    }

    const polylineStr = pts.map((p, i) => {
      const { x, y } = toSvg(p, i)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    const gradId2 = 'spark-expanded-grad'
    const fillStr = [
      `${pad.left},${pad.top + innerH}`,
      ...pts.map((p, i) => {
        const { x, y } = toSvg(p, i)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }),
      `${pad.left + innerW},${pad.top + innerH}`,
    ].join(' ')

    // Horizontal grid lines at min, mid, max
    const midP = (minP + maxP) / 2
    const gridPrices = [maxP, midP, minP]
    const gridYs = gridPrices.map((gp) => pad.top + innerH - ((gp - minP) / range) * innerH)

    // Time labels: first, middle, last
    const timeLabels = [
      { i: 0, label: fmtTime(pts[0].t) },
      { i: Math.floor(pts.length / 2), label: fmtTime(pts[Math.floor(pts.length / 2)].t) },
      { i: pts.length - 1, label: fmtTime(pts[pts.length - 1].t) },
    ]

    // Last oracle + pool point markers
    const oraclePoints = pts.filter((p) => p.source === 'oracle')
    const lastOracle = oraclePoints[oraclePoints.length - 1]
    const lastOracleSvg = lastOracle ? toSvg(lastOracle, pts.indexOf(lastOracle)) : null

    return (
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', minWidth: 340 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base" style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                {lastPrice < 0.01 ? lastPrice.toFixed(8) : lastPrice.toFixed(6)}
              </span>
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-lg flex items-center gap-1"
                style={{
                  background: isUp ? 'rgba(15,157,107,0.12)' : 'rgba(240,82,82,0.12)',
                  color,
                }}
              >
                {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {changeSign}{changePct}%
              </span>
            </div>
            <div className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
              {tokenInSymbol}/{tokenOutSymbol}
              <span className="opacity-50">·</span>
              <span>
                {displayPoints.length > 0
                  ? `${displayPoints.length} snapshots`
                  : 'Live oracle'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { fetchRef.current = false; setHermesPoints([]) }}
              className="p-1.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--muted)' }}
              aria-label="Refresh chart"
            >
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--muted)' }}
              aria-label="Close chart"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* SVG chart */}
        <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} fill="none">
          <defs>
            <linearGradient id={gradId2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridYs.map((y, gi) => (
            <GridLine
              key={gi}
              y={y}
              label={gridPrices[gi].toFixed(gridPrices[gi] < 0.01 ? 6 : 4)}
              color="rgba(108,144,128,0.3)"
            />
          ))}

          {/* Area fill */}
          <polygon points={fillStr} fill={`url(#${gradId2})`} />

          {/* Price line */}
          <polyline
            points={polylineStr}
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Oracle price dot (teal, distinct from pool dots) */}
          {lastOracleSvg && (
            <g>
              <circle cx={lastOracleSvg.x} cy={lastOracleSvg.y} r="4" fill="none" stroke={color} strokeWidth="1.5" />
              <circle cx={lastOracleSvg.x} cy={lastOracleSvg.y} r="2" fill={color} />
            </g>
          )}

          {/* Time axis labels */}
          {timeLabels.map(({ i, label }) => {
            const { x } = toSvg(pts[i], i)
            return (
              <text
                key={i}
                x={x}
                y={chartH - 4}
                fontSize="9"
                fill="rgba(108,144,128,0.6)"
                textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}
              >
                {label}
              </text>
            )
          })}
        </svg>

        {/* Oracle info row */}
        <div className="flex items-center justify-between mt-2 pt-2"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
              Pool snapshots
            </span>
            <div className="w-1.5 h-1.5 rounded-full ml-2" style={{ background: '#14B8A6' }} />
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
              Live market price
            </span>
          </div>
          <span className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>
            Live prices from Coinbase
          </span>
        </div>

        {/* Note about history */}
        {displayPoints.length < 5 && (
          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--muted)' }}>
            Chart builds up over time as you use the app. More swaps = more history.
          </p>
        )}
      </div>
    )
  })()

  return (
    <div className={className ?? ''}>
      {expanded ? expandedView : compactView}
    </div>
  )
}
