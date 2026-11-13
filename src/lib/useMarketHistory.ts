/**
 * useMarketHistory — real market price history for a token pair.
 *
 * Candles come from Coinbase's public exchange API (no key, CORS enabled).
 * Pair price = price of 1 tokenIn expressed in tokenOut, built from each leg's
 * USD history. Pool reserves are never used. USDC is treated as the $1 unit.
 */
import { useEffect, useState } from 'react'

export type ChartRange = '1H' | '1D' | '1W' | '1M' | '1Y'
export const CHART_RANGES: ChartRange[] = ['1H', '1D', '1W', '1M', '1Y']

const RANGE_CFG: Record<ChartRange, { gran: number; secs: number }> = {
  '1H': { gran: 60,     secs: 3_600 },
  '1D': { gran: 300,    secs: 86_400 },
  '1W': { gran: 3_600,  secs: 604_800 },
  '1M': { gran: 21_600, secs: 2_592_000 },
  '1Y': { gran: 86_400, secs: 31_536_000 },
}

/** Token symbol -> Coinbase product. USDC is the $1 unit and needs none. */
const PRODUCT: Record<string, string | undefined> = {
  EURC: 'EURC-USDC',
  cirBTC: 'BTC-USD',
  WETH: 'ETH-USD',
}

export interface HistoryPoint { t: number; price: number }

export function hasMarketData(symbol: string): boolean {
  return symbol === 'USDC' || PRODUCT[symbol] !== undefined
}

const MAX_CANDLES = 300
const CACHE_MS = 60_000
const cache = new Map<string, { at: number; data: Map<number, number> }>()

async function fetchLegSeries(product: string, range: ChartRange): Promise<Map<number, number>> {
  const key = `${product}|${range}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data

  const { gran, secs } = RANGE_CFG[range]
  const end = Math.floor(Date.now() / 1000)
  const start = end - secs
  const span = gran * MAX_CANDLES
  const chunks: Array<[number, number]> = []
  for (let s = start; s < end; s += span) chunks.push([s, Math.min(s + span, end)])

  const out = new Map<number, number>()
  const results = await Promise.all(
    chunks.map(async ([s, e]) => {
      const url =
        `https://api.exchange.coinbase.com/products/${product}/candles` +
        `?granularity=${gran}&start=${new Date(s * 1000).toISOString()}&end=${new Date(e * 1000).toISOString()}`
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) throw new Error(`candles ${res.status}`)
      return (await res.json()) as number[][]
    }),
  )
  for (const rows of results) {
    // row = [time, low, high, open, close, volume]
    for (const r of rows) if (r[4] > 0) out.set(r[0], r[4])
  }
  cache.set(key, { at: Date.now(), data: out })
  return out
}

export async function buildPairSeries(symIn: string, symOut: string, range: ChartRange): Promise<HistoryPoint[]> {
  const pIn = PRODUCT[symIn]
  const pOut = PRODUCT[symOut]
  const [sIn, sOut] = await Promise.all([
    pIn ? fetchLegSeries(pIn, range) : Promise.resolve(null),
    pOut ? fetchLegSeries(pOut, range) : Promise.resolve(null),
  ])
  if (!sIn && !sOut) return [] // USDC against USDC
  const times = [...(sIn ?? sOut)!.keys()].filter((t) => (!sIn || sIn.has(t)) && (!sOut || sOut.has(t)))
  times.sort((a, b) => a - b)
  return times.map((t) => ({
    t: t * 1000,
    price: (sIn ? sIn.get(t)! : 1) / (sOut ? sOut.get(t)! : 1),
  }))
}

interface Result { key: string; points: HistoryPoint[]; error: boolean }

export function useMarketHistory(symIn: string, symOut: string, range: ChartRange) {
  const key = `${symIn}>${symOut}|${range}`
  const [result, setResult] = useState<Result | null>(null)
  const [tick, setTick] = useState(0)
  const supported = hasMarketData(symIn) && hasMarketData(symOut)

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), CACHE_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    buildPairSeries(symIn, symOut, range)
      .then((points) => { if (!cancelled) setResult({ key, points, error: false }) })
      .catch(() => { if (!cancelled) setResult({ key, points: [], error: true }) })
    return () => { cancelled = true }
  }, [symIn, symOut, range, key, supported, tick])

  const current = result && result.key === key ? result : null
  return {
    points: current?.points ?? [],
    loading: supported && current === null,
    error: !supported || (current?.error ?? false),
    supported,
  }
}
