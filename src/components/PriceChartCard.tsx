import { useId, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { TokenIcon } from './TokenSelector';
import type { Token } from '@/constants/tokens';
import { CHART_RANGES, useMarketHistory, type ChartRange, type HistoryPoint } from '@/lib/useMarketHistory';
import { deriveMarketRate, usePythPrice, type PythFeedKey } from '@/lib/usePythPrice';

const W = 400;
const PAD_X = 0;
const PAD_Y = 14;

const FEED_FOR: Record<string, PythFeedKey | undefined> = {
  USDC: 'USDC/USD', EURC: 'EURC/USD', cirBTC: 'BTC/USD', WETH: 'ETH/USD',
};

function fmtPrice(p: number): string {
  if (!Number.isFinite(p)) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toPrecision(4);
}

function fmtTime(t: number, range: ChartRange): string {
  const d = new Date(t);
  if (range === '1H' || range === '1D') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', ...(range === '1Y' ? { year: 'numeric' } : {}) });
}

function buildPaths(points: HistoryPoint[], h: number) {
  const prices = points.map((p) => p.price);
  let lo = Math.min(...prices);
  let hi = Math.max(...prices);
  if (hi - lo < hi * 1e-6) { lo -= hi * 0.0005; hi += hi * 0.0005; }
  const span = hi - lo;
  const x = (i: number) => PAD_X + (i / Math.max(points.length - 1, 1)) * (W - PAD_X * 2);
  const y = (p: number) => PAD_Y + (1 - (p - lo) / span) * (h - PAD_Y * 2);
  const coords = points.map((p, i) => [x(i), y(p.price)] as const);
  const line = coords.map(([cx, cy], i) => `${i === 0 ? 'M' : 'L'}${cx.toFixed(1)},${cy.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${h} L${coords[0][0].toFixed(1)},${h} Z`;
  return { line, area, coords };
}

interface Props {
  tokenIn: Token;
  tokenOut: Token;
  onClose?: () => void;
  className?: string;
}

export default function PriceChartCard({ tokenIn, tokenOut, onClose, className = '' }: Props) {
  const [range, setRange] = useState<ChartRange>('1D');
  const [expanded, setExpanded] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, '');

  const H = expanded ? 280 : 168;
  const { points: history, loading, error, supported } = useMarketHistory(tokenIn.symbol, tokenOut.symbol, range);

  // Live spot rate, refreshed every few seconds, becomes the final point.
  const feedKeys = useMemo(() => {
    const keys = new Set<PythFeedKey>();
    for (const s of [tokenIn.symbol, tokenOut.symbol]) {
      const k = FEED_FOR[s];
      if (k) keys.add(k);
    }
    keys.add('USDC/USD');
    return [...keys];
  }, [tokenIn.symbol, tokenOut.symbol]);
  const { prices } = usePythPrice(feedKeys);
  const liveRate = deriveMarketRate(prices, tokenIn.symbol, tokenOut.symbol);

  const points = useMemo<HistoryPoint[]>(() => {
    if (history.length === 0) return [];
    if (liveRate && liveRate > 0) {
      const last = history[history.length - 1];
      return [...history.slice(0, -1), { t: Math.max(last.t, last.t + 1), price: liveRate }];
    }
    return history;
  }, [history, liveRate]);

  const first = points[0]?.price;
  const lastPrice = points[points.length - 1]?.price;
  const shown = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : points[points.length - 1];
  const change = shown && first ? shown.price - first : 0;
  const changePct = shown && first ? (change / first) * 100 : 0;
  const up = change >= 0;
  const color = up ? '#2DD4A7' : '#F05252';
  const paths = points.length > 1 ? buildPaths(points, H) : null;

  const handleMove = (clientX: number) => {
    const el = svgRef.current;
    if (!el || points.length < 2) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setHoverIdx(Math.round(frac * (points.length - 1)));
  };

  const hoverPt = hoverIdx !== null && paths ? paths.coords[hoverIdx] : null;
  const endPt = paths ? paths.coords[paths.coords.length - 1] : null;

  return (
    <div
      className={`rounded-3xl p-5 ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center">
            <TokenIcon token={tokenIn} size={26} />
            <span style={{ marginLeft: -8 }}><TokenIcon token={tokenOut} size={26} /></span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
            {tokenIn.symbol}/{tokenOut.symbol}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted)' }}
            aria-label={expanded ? 'Collapse chart' : 'Expand chart'}
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70 lg:hidden"
              style={{ color: 'var(--muted)' }}
              aria-label="Close chart"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Price + change */}
      <div className="mt-3 min-h-[68px]">
        {shown ? (
          <>
            <div className="tabular font-bold" style={{ fontSize: '2rem', lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
              {fmtPrice(shown.price)}
              <span className="text-sm font-semibold ml-2" style={{ color: 'var(--muted)', letterSpacing: 0 }}>{tokenOut.symbol}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold tabular" style={{ color }}>
              {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              <span>{fmtPrice(Math.abs(change))} ({Math.abs(changePct).toFixed(2)}%)</span>
              <span className="font-medium" style={{ color: 'var(--muted)' }}>
                {hoverIdx !== null ? fmtTime(shown.t, range) : `Past ${range === '1H' ? 'hour' : range === '1D' ? 'day' : range === '1W' ? 'week' : range === '1M' ? 'month' : 'year'}`}
              </span>
            </div>
          </>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="skeleton h-8 w-40" />
            <div className="skeleton h-4 w-28" />
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="mt-3 relative" style={{ height: H }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full block touch-none"
          style={{ height: H }}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseLeave={() => setHoverIdx(null)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={() => setHoverIdx(null)}
          role="img"
          aria-label={`${tokenIn.symbol} to ${tokenOut.symbol} price chart`}
        >
          <defs>
            <pattern id={`dots-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.10)" />
            </pattern>
            <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width={W} height={H} fill={`url(#dots-${uid})`} />
          {paths && (
            <>
              <path d={paths.area} fill={`url(#fill-${uid})`} />
              <path d={paths.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" filter={`url(#glow-${uid})`} />
              {hoverPt && (
                <line x1={hoverPt[0]} x2={hoverPt[0]} y1={0} y2={H} stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeDasharray="3 3" />
              )}
              {(hoverPt ?? endPt) && (
                <>
                  <circle cx={(hoverPt ?? endPt)![0]} cy={(hoverPt ?? endPt)![1]} r="9" fill={color} opacity="0.18" />
                  <circle cx={(hoverPt ?? endPt)![0]} cy={(hoverPt ?? endPt)![1]} r="4" fill="#0b0b0b" stroke={color} strokeWidth="2" />
                </>
              )}
            </>
          )}
        </svg>

        {(loading || error || (!paths && !loading)) && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              {loading
                ? 'Loading live market data…'
                : !supported
                  ? `No market price feed for ${!['USDC', 'EURC', 'cirBTC', 'WETH'].includes(tokenIn.symbol) ? tokenIn.symbol : tokenOut.symbol}`
                  : tokenIn.symbol === tokenOut.symbol || (tokenIn.symbol === 'USDC' && tokenOut.symbol === 'USDC')
                    ? 'Pick two different tokens'
                    : 'Market data unavailable right now'}
            </span>
          </div>
        )}
      </div>

      {/* Range selector + live badge */}
      <div className="mt-3 flex items-center justify-between">
        <div
          className="inline-flex items-center gap-0.5 p-1 rounded-full"
          style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}
        >
          {CHART_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: range === r ? 'var(--bg-hover)' : 'transparent',
                color: range === r ? 'var(--ink)' : 'var(--muted)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: lastPrice ? '#2DD4A7' : 'var(--subtle)' }} />
          Live · Coinbase
        </span>
      </div>
    </div>
  );
}
