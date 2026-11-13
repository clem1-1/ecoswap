/**
 * RouteSelector.tsx
 * ─────────────────
 * Expandable route-selector drawer rendered inside SwapTab.
 *
 * Shows a compact "best route" summary pill when collapsed.
 * Expands to a full list of route cards when the user taps it.
 * Each card shows: output amount, gas, estimated time, path pills,
 * BEST RATE / FASTEST badges, and a Coming Soon overlay for unavailable routes.
 */

import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Zap, TrendingUp, Clock, ArrowRight, Lock } from 'lucide-react';
import type { RouteOption } from '@/lib/routeEngine';

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ label, variant }: { label: string; variant: 'best' | 'fast' | 'cheap' | 'coming' }) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    best: {
      background: 'rgba(15,157,107,0.15)',
      border: '1px solid rgba(15,157,107,0.30)',
      color: '#0F9D6B',
    },
    fast: {
      background: 'rgba(20,184,166,0.15)',
      border: '1px solid rgba(20,184,166,0.30)',
      color: '#14B8A6',
    },
    cheap: {
      background: 'rgba(251,191,36,0.12)',
      border: '1px solid rgba(251,191,36,0.28)',
      color: '#FBBF24',
    },
    coming: {
      background: 'rgba(107,144,128,0.10)',
      border: '1px solid rgba(107,144,128,0.18)',
      color: 'var(--muted)',
    },
  };

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={styles[variant]}
    >
      {variant === 'best'   && <TrendingUp size={9} />}
      {variant === 'fast'   && <Zap size={9} />}
      {variant === 'cheap'  && <span style={{ fontSize: 9 }}>$</span>}
      {variant === 'coming' && <Lock size={9} />}
      {label}
    </span>
  );
}

function TimeLabel({ seconds }: { seconds: number }) {
  const text = seconds < 60
    ? `~${seconds}s`
    : `~${Math.round(seconds / 60)}m`;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] tabular" style={{ color: 'var(--muted)' }}>
      <Clock size={10} />
      {text}
    </span>
  );
}

function PathPills({ path }: { path: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-1.5">
      {path.map((segment, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-lg"
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              color: 'var(--ink-2)',
            }}
          >
            {segment}
          </span>
          {i < path.length - 1 && (
            <ArrowRight size={9} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
          )}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Route card
// ─────────────────────────────────────────────────────────────────────────────

interface RouteCardProps {
  route: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
}

function RouteCard({ route, isSelected, onSelect }: RouteCardProps) {
  const unavailable = !route.isAvailable;

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    background: isSelected
      ? 'rgba(15,157,107,0.08)'
      : unavailable
        ? 'rgba(9,20,17,0.30)'
        : 'var(--surface-muted)',
    border: isSelected
      ? '1.5px solid rgba(15,157,107,0.35)'
      : unavailable
        ? '1px solid rgba(107,144,128,0.12)'
        : '1px solid var(--border)',
    borderRadius: 16,
    padding: '12px 14px',
    cursor: unavailable ? 'not-allowed' : 'pointer',
    transition: 'all 180ms cubic-bezier(0.4,0,0.2,1)',
    opacity: unavailable ? 0.55 : 1,
  };

  return (
    <div
      style={cardStyle}
      onClick={unavailable ? undefined : onSelect}
      role={unavailable ? undefined : 'button'}
      aria-disabled={unavailable}
      tabIndex={unavailable ? -1 : 0}
      onKeyDown={(e) => {
        if (!unavailable && (e.key === 'Enter' || e.key === ' ')) onSelect();
      }}
    >
      {/* Coming-soon overlay */}
      {unavailable && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-3"
          style={{ borderRadius: 16 }}
        >
          <Badge label="Coming Soon" variant="coming" />
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        {/* Left: name + badges */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span
            className="text-[13px] font-bold truncate"
            style={{ color: unavailable ? 'var(--muted)' : 'var(--ink)' }}
          >
            {route.name}
          </span>
          {route.isBestReturn && <Badge label="Best Rate" variant="best"  />}
          {route.isFastest   && <Badge label="Fastest"   variant="fast"  />}
          {'isCheapest' in route && route.isCheapest && <Badge label="Cheapest" variant="cheap" />}
        </div>

        {/* Right: output amount */}
        {route.isAvailable && (
          <div className="text-right flex-shrink-0">
            <div
              className="font-extrabold tabular text-[15px]"
              style={{
                color: isSelected ? 'var(--accent)' : 'var(--ink)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {route.expectedOutputAmount}
            </div>
            <div className="text-[10px] tabular mt-0.5" style={{ color: 'var(--muted)' }}>
              min {route.minimumReceived}
            </div>
          </div>
        )}
      </div>

      {/* Path pills */}
      {route.isAvailable && <PathPills path={route.routePath} />}

      {/* Footer: Relay-style fee breakdown + time */}
      {route.isAvailable && (
        <div className="mt-2 space-y-1">
          {/* Fee rows */}
          {'fees' in route && route.fees ? (
            <div className="grid grid-cols-3 gap-x-2 text-[10px]" style={{ color: 'var(--muted)' }}>
              <div>
                <span style={{ color: 'var(--subtle)' }}>Gas </span>
                <span className="tabular">${route.fees.gasFeeUsd < 0.001 ? route.fees.gasFeeUsd.toFixed(4) : route.fees.gasFeeUsd.toFixed(3)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--subtle)' }}>Swap fee </span>
                <span className="tabular">${route.fees.swapFeeUsd < 0.01 ? route.fees.swapFeeUsd.toFixed(4) : route.fees.swapFeeUsd.toFixed(3)}</span>
              </div>
              {route.fees.bridgeFeeUsd > 0 ? (
                <div>
                  <span style={{ color: 'var(--subtle)' }}>Bridge </span>
                  <span className="tabular">${route.fees.bridgeFeeUsd.toFixed(3)}</span>
                </div>
              ) : (
                <div />
              )}
            </div>
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Gas ~${route.estimatedGasFeeUsd.toFixed(4)}
            </span>
          )}

          {/* Time + impact row */}
          <div className="flex items-center gap-3 flex-wrap">
            <TimeLabel seconds={route.estimatedTimeSeconds} />
            {route.priceImpactPercentage !== '—' && parseFloat(route.priceImpactPercentage) > 0 && (
              <span
                className="text-[11px] tabular"
                style={{
                  color: parseFloat(route.priceImpactPercentage) < 1
                    ? 'var(--success)'
                    : parseFloat(route.priceImpactPercentage) < 5
                      ? 'var(--warning)'
                      : 'var(--danger)',
                }}
              >
                {route.priceImpactPercentage}% impact
              </span>
            )}
          </div>
        </div>
      )}

      {/* Selected indicator ring */}
      {isSelected && (
        <div
          className="absolute top-2.5 right-2.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────

export interface RouteSelectorProps {
  /** Routes returned by fetchAllLPRoutes — pass [] while loading */
  routes: RouteOption[];
  /** True while fetchAllLPRoutes is running */
  isLoading: boolean;
  /** Currently selected route id */
  selectedRouteId: RouteOption['id'] | null;
  /** Called when user clicks an available route card */
  onSelectRoute: (id: RouteOption['id']) => void;
  /** Symbol of the output token for column header */
  tokenOutSymbol: string;
}

export default function RouteSelector({
  routes,
  isLoading,
  selectedRouteId,
  onSelectRoute,
  tokenOutSymbol,
}: RouteSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Derive collapsed state: never show expanded panel when there are no routes
  const isExpanded = expanded && (isLoading || routes.length > 0);

  const bestRoute = routes.find((r) => r.isBestReturn) ?? routes[0] ?? null;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
  const displayRoute = selectedRoute ?? bestRoute;

  const availableCount = routes.filter((r) => r.isAvailable).length;

  if (!isLoading && routes.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Collapsed summary trigger */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all"
        style={{
          background: isExpanded ? 'var(--surface-strong)' : 'var(--surface-muted)',
          border: isExpanded
            ? '1px solid rgba(15,157,107,0.22)'
            : '1px solid var(--border)',
        }}
        disabled={isLoading}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLoading ? (
            <span className="text-xs animate-pulse" style={{ color: 'var(--muted)' }}>
              Scanning routes…
            </span>
          ) : displayRoute ? (
            <>
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--ink-2)' }}>
                {selectedRoute ? selectedRoute.name : `Best: ${displayRoute.name}`}
              </span>
              {displayRoute.isAvailable && (
                <span
                  className="text-xs font-extrabold tabular"
                  style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {displayRoute.expectedOutputAmount} {tokenOutSymbol}
                </span>
              )}
              <span className="text-[11px]" style={{ color: 'var(--subtle)' }}>
                · {availableCount} route{availableCount !== 1 ? 's' : ''} found
              </span>
            </>
          ) : null}
        </div>
        <span style={{ color: 'var(--muted)', flexShrink: 0 }}>
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {/* Expanded route list */}
      {isExpanded && (
        <div
          ref={panelRef}
          className="mt-1 space-y-2 quote-details-enter"
          style={{ maxHeight: 420, overflowY: 'auto' }}
        >
          {/* Skeleton while loading */}
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl p-3.5 animate-pulse"
                  style={{ background: 'var(--surface-muted)', height: 88 }}
                />
              ))}
            </>
          )}

          {/* Route cards */}
          {!isLoading && routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              isSelected={selectedRouteId === route.id}
              onSelect={() => {
                onSelectRoute(route.id);
                setExpanded(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
