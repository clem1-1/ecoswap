/**
 * usePythPrice — live USD reference prices from the public internet.
 *
 * Sources, in order: Coinbase spot API, Pyth Hermes, CoinGecko. The first source
 * that answers for a feed wins. Pool reserves are never used as an oracle.
 *
 * Feed IDs (same across all chains):
 *   EURC/USD  0x76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c
 *   BTC/USD   0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
 *   ETH/USD   0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
 *   USDC/USD  0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a
 *
 * Refresh interval: 10 seconds (Pyth updates every ~400ms but Hermes REST is polled)
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const HERMES = 'https://hermes.pyth.network'
const REFRESH_MS = 10_000

export const PYTH_FEED_IDS = {
  'EURC/USD': '0x76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c',
  'BTC/USD':  '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD':  '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
} as const

export type PythFeedKey = keyof typeof PYTH_FEED_IDS

export type PriceSource = 'coinbase' | 'pyth' | 'coingecko'

export interface PythPrice {
  price: number          // USD price
  confidence: number     // ±confidence interval in USD (0 when the source does not report one)
  publishTime: number    // unix timestamp (seconds)
  expo: number           // raw exponent (0 for non-Pyth sources)
  ageSeconds: number     // seconds since last update
  source: PriceSource    // which live feed produced this price
}

export type PythPriceMap = Partial<Record<PythFeedKey, PythPrice>>

interface HermesResponse {
  parsed: Array<{
    id: string
    price: {
      price: string
      conf: string
      expo: number
      publish_time: number
    }
  }>
}

/** Coinbase spot symbol and CoinGecko id for every feed we expose. */
const FEED_META: Record<PythFeedKey, { cb: string; cg: string }> = {
  'EURC/USD': { cb: 'EURC', cg: 'euro-coin' },
  'BTC/USD':  { cb: 'BTC',  cg: 'bitcoin' },
  'ETH/USD':  { cb: 'ETH',  cg: 'ethereum' },
  'USDC/USD': { cb: 'USDC', cg: 'usd-coin' },
}

const nowSec = () => Math.floor(Date.now() / 1000)

function livePrice(price: number, source: PriceSource): PythPrice {
  return { price, confidence: 0, publishTime: nowSec(), expo: 0, ageSeconds: 0, source }
}

/** Primary: Coinbase public spot API (no key, CORS enabled). */
async function fetchCoinbase(keys: PythFeedKey[]): Promise<PythPriceMap> {
  const out: PythPriceMap = {}
  await Promise.all(
    keys.map(async (k) => {
      try {
        const res = await fetch(`https://api.coinbase.com/v2/prices/${FEED_META[k].cb}-USD/spot`, {
          signal: AbortSignal.timeout(6_000),
        })
        if (!res.ok) return
        const json = (await res.json()) as { data?: { amount?: string } }
        const v = parseFloat(json.data?.amount ?? '')
        if (Number.isFinite(v) && v > 0) out[k] = livePrice(v, 'coinbase')
      } catch { /* try next source */ }
    }),
  )
  return out
}

/** Secondary: Pyth Hermes (public access currently requires a key, so this often 401s). */
async function fetchHermes(keys: PythFeedKey[]): Promise<PythPriceMap> {
  const out: PythPriceMap = {}
  try {
    const params = keys.map((k) => `ids[]=${PYTH_FEED_IDS[k]}`).join('&')
    const res = await fetch(`${HERMES}/v2/updates/price/latest?${params}&parsed=true`, {
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return out
    const data = (await res.json()) as HermesResponse
    for (const item of data.parsed ?? []) {
      const match = keys.find((k) => PYTH_FEED_IDS[k].toLowerCase() === `0x${item.id}`.toLowerCase())
      if (!match) continue
      const p = item.price
      const price = parseFloat(p.price) * Math.pow(10, p.expo)
      if (!Number.isFinite(price) || price <= 0) continue
      out[match] = {
        price,
        confidence: parseFloat(p.conf) * Math.pow(10, p.expo),
        publishTime: p.publish_time,
        expo: p.expo,
        ageSeconds: Math.max(0, nowSec() - p.publish_time),
        source: 'pyth',
      }
    }
  } catch { /* try next source */ }
  return out
}

/** Last resort: CoinGecko simple price (no key, CORS enabled, rate limited). */
async function fetchCoinGecko(keys: PythFeedKey[]): Promise<PythPriceMap> {
  const out: PythPriceMap = {}
  try {
    const ids = keys.map((k) => FEED_META[k].cg).join(',')
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, {
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return out
    const json = (await res.json()) as Record<string, { usd?: number }>
    for (const k of keys) {
      const v = json[FEED_META[k].cg]?.usd
      if (typeof v === 'number' && v > 0) out[k] = livePrice(v, 'coingecko')
    }
  } catch { /* give up */ }
  return out
}

/* Share one request across every component polling the same feed. */
const CACHE_TTL_MS = 4_000
const cache = new Map<PythFeedKey, { at: number; value: PythPrice }>()
const inflight = new Map<PythFeedKey, Promise<PythPrice | null>>()

async function loadMissing(keys: PythFeedKey[]): Promise<PythPriceMap> {
  let found: PythPriceMap = await fetchCoinbase(keys)
  let missing = keys.filter((k) => !found[k])
  if (missing.length) {
    found = { ...found, ...(await fetchHermes(missing)) }
    missing = keys.filter((k) => !found[k])
  }
  if (missing.length) found = { ...found, ...(await fetchCoinGecko(missing)) }
  return found
}

/**
 * Fetch latest live USD prices for the given feed keys from the public internet.
 * Returns null when no source answered (callers must show "oracle unavailable",
 * never substitute pool prices).
 */
export async function fetchPythPrices(keys: PythFeedKey[]): Promise<PythPriceMap | null> {
  const now = Date.now()
  const result: PythPriceMap = {}
  const toLoad: PythFeedKey[] = []
  const waiting: Array<[PythFeedKey, Promise<PythPrice | null>]> = []

  for (const k of keys) {
    const hit = cache.get(k)
    if (hit && now - hit.at < CACHE_TTL_MS) { result[k] = hit.value; continue }
    const pending = inflight.get(k)
    if (pending) { waiting.push([k, pending]); continue }
    toLoad.push(k)
  }

  if (toLoad.length) {
    const batch = loadMissing(toLoad)
    for (const k of toLoad) {
      const p = batch.then((m) => m[k] ?? null)
      inflight.set(k, p)
      waiting.push([k, p])
      void p.finally(() => inflight.delete(k))
    }
  }

  await Promise.all(
    waiting.map(async ([k, p]) => {
      const v = await p
      if (v) { cache.set(k, { at: Date.now(), value: v }); result[k] = v }
    }),
  )

  return Object.keys(result).length ? result : null
}

/**
 * React hook — polls Pyth Hermes for the requested feed keys every REFRESH_MS ms.
 *
 * @param keys   Array of feed keys to subscribe to, e.g. ['EURC/USD', 'BTC/USD']
 * @returns      { prices, loading, error, lastUpdated }
 */
export function usePythPrice(keys: PythFeedKey[]) {
  const [prices, setPrices]           = useState<PythPriceMap>({})
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const keysRef = useRef(keys)
  useEffect(() => { keysRef.current = keys }, [keys])

  const refresh = useCallback(async () => {
    const result = await fetchPythPrices(keysRef.current)
    if (result) {
      setPrices(result)
      setError(null)
      setLastUpdated(Date.now())
    } else {
      setError('Oracle unavailable')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [refresh])

  return { prices, loading, error, lastUpdated, refresh }
}

/**
 * Derive a "market rate" for a given token pair from Pyth USD prices.
 * e.g. EURC/USDC = (EURC/USD) / (USDC/USD)
 * Returns null if either leg is missing.
 */
export function deriveMarketRate(
  prices: PythPriceMap,
  tokenInSymbol: string,
  tokenOutSymbol: string,
): number | null {
  // Map token symbol → Pyth feed key
  const symbolToFeed: Record<string, PythFeedKey | undefined> = {
    USDC:   'USDC/USD',
    EURC:   'EURC/USD',
    cirBTC: 'BTC/USD',
    WETH:   'ETH/USD',
  }

  const inFeed  = symbolToFeed[tokenInSymbol]
  const outFeed = symbolToFeed[tokenOutSymbol]

  // If both are USD-pegged stablecoins, rate is very close to 1.0 but use oracle
  if (!inFeed || !outFeed) return null

  const inPrice  = prices[inFeed]?.price
  const outPrice = prices[outFeed]?.price

  if (!inPrice || !outPrice || outPrice === 0) return null

  return inPrice / outPrice
}

/**
 * Format a price delta between the AMM quote and the oracle market rate.
 * Returns { pct: number, label: string, isAbove: boolean }
 */
export function formatOracleDelta(
  ammOutput: number,       // what the AMM gives for amountIn
  amountIn: number,
  marketRate: number,      // oracle-derived price for 1 tokenIn
): { pct: number; label: string; isAbove: boolean } | null {
  if (!ammOutput || !amountIn || !marketRate) return null
  const ammRate    = ammOutput / amountIn
  const deltaPct   = ((ammRate - marketRate) / marketRate) * 100
  const isAbove    = deltaPct >= 0
  const abs        = Math.abs(deltaPct)
  const label      = isAbove
    ? `+${abs.toFixed(2)}% above oracle`
    : `${abs.toFixed(2)}% below oracle`
  return { pct: deltaPct, label, isAbove }
}
