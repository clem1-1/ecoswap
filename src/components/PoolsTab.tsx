import { Droplets, ExternalLink, ChevronRight, Plus, TrendingUp } from 'lucide-react';
import { TokenIcon } from './TokenSelector';
import {
  useAllPairsLength,
  usePairAtIndex,
  usePairInfo,
  formatTokenAmount,
  useFactoryAddress,
} from '@/hooks/useEcoSwap';
import { buildAddressExplorerUrl } from '@/onchain-facts';
import { ARC_TESTNET_CHAIN_ID } from '@/constants/tokens';

function PoolCard({ index, onSelect }: { index: number; onSelect: (address: `0x${string}`) => void }) {
  const { pairAddress } = usePairAtIndex(index);
  const { pairInfo } = usePairInfo(pairAddress);

  if (!pairInfo) {
    return (
      <div className="rounded-3xl p-5" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-24 rounded-lg" />
            <div className="skeleton h-3 w-16 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const tvl0 = formatTokenAmount(pairInfo.reserve0, pairInfo.token0Meta.decimals, 2);
  const tvl1 = formatTokenAmount(pairInfo.reserve1, pairInfo.token1Meta.decimals, 2);
  const lpSupply = formatTokenAmount(pairInfo.totalSupply, 18, 2);

  return (
    <button
      onClick={() => onSelect(pairInfo.pairAddress)}
      className="stagger-item w-full rounded-3xl p-5 text-left transition-all hover:scale-[1.01] table-row-hover group"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-card)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Token pair header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="token-overlap flex items-center flex-shrink-0">
          <TokenIcon token={pairInfo.token0Meta} size={36} />
          <TokenIcon token={pairInfo.token1Meta} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-base tracking-tight" style={{ color: 'var(--ink)' }}>
            {pairInfo.token0Meta.symbol} / {pairInfo.token1Meta.symbol}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(15,157,107,0.12)', color: 'var(--success)' }}>
              0.3% fee
            </span>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--subtle)' }}
          className="group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatBlock label={`${pairInfo.token0Meta.symbol} reserve`} value={tvl0} />
        <StatBlock label={`${pairInfo.token1Meta.symbol} reserve`} value={tvl1} />
        <StatBlock label="LP supply" value={lpSupply} accent />
      </div>
    </button>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl px-3 py-2.5"
      style={{ background: accent ? 'rgba(15,157,107,0.06)' : 'var(--surface-muted)', border: '1px solid var(--border)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1 truncate" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-sm font-bold tabular truncate" style={{ color: accent ? 'var(--success)' : 'var(--ink-2)' }}>{value}</div>
    </div>
  );
}

interface PoolsTabProps {
  onSelectPool: (pairAddress: `0x${string}`) => void;
  onCreatePool: () => void;
}

export default function PoolsTab({ onSelectPool, onCreatePool }: PoolsTabProps) {
  const factory = useFactoryAddress();
  const { length, isLoading } = useAllPairsLength();

  if (!factory) {
    return (
      <div className="text-center py-14" style={{ color: 'var(--muted)' }}>
        <Droplets size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Contracts not yet deployed.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>Liquidity Pools</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {isLoading ? 'Loading…' : `${length} pool${length !== 1 ? 's' : ''} on Arc Testnet`}
          </p>
        </div>
        <button
          onClick={onCreatePool}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
          style={{ borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 700 }}
        >
          <Plus size={14} />
          New Pool
        </button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-3xl p-5" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-28 rounded-lg" />
                  <div className="skeleton h-3 w-16 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0,1,2].map(j => <div key={j} className="skeleton h-12 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && length === 0 && (
        <div className="rounded-3xl p-10 text-center"
          style={{ background: 'var(--surface-muted)', border: '1px dashed var(--border-strong)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(15,157,107,0.08)' }}>
            <TrendingUp size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-base font-bold mb-1" style={{ color: 'var(--ink-2)' }}>No pools yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Be the first to create a liquidity pool.</p>
          <button onClick={onCreatePool} className="btn-primary px-6 py-2.5 text-sm" style={{ borderRadius: 'var(--radius-pill)', fontSize: 13 }}>
            Create First Pool
          </button>
        </div>
      )}

      {/* Pool cards */}
      {!isLoading && length > 0 && (
        <div className="space-y-3">
          {Array.from({ length }).map((_, i) => (
            <PoolCard key={i} index={i} onSelect={onSelectPool} />
          ))}
        </div>
      )}

      {/* Factory explorer link */}
      {factory && (
        <div className="pt-1">
          <a
            href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, factory)}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
            style={{ color: 'var(--subtle)' }}
          >
            View factory contract <ExternalLink size={10} className="ml-0.5" />
          </a>
        </div>
      )}
    </div>
  );
}
