import { Droplets, ExternalLink, ChevronRight } from 'lucide-react';
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

function PoolRow({ index, onSelect }: { index: number; onSelect: (address: `0x${string}`) => void }) {
  const { pairAddress } = usePairAtIndex(index);
  const { pairInfo } = usePairInfo(pairAddress);

  if (!pairInfo) return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--surface-muted)', height: 80 }} />
  );

  const tvl0 = formatTokenAmount(pairInfo.reserve0, pairInfo.token0Meta.decimals, 2);
  const tvl1 = formatTokenAmount(pairInfo.reserve1, pairInfo.token1Meta.decimals, 2);

  return (
    <button
      onClick={() => onSelect(pairInfo.pairAddress)}
      className="w-full rounded-2xl p-4 text-left hover:opacity-90 transition-opacity"
      style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <TokenIcon token={pairInfo.token0Meta} size={32} />
          <TokenIcon token={pairInfo.token1Meta} size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm" style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {pairInfo.token0Meta.symbol} / {pairInfo.token1Meta.symbol}
          </div>
          <div className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
            {tvl0} {pairInfo.token0Meta.symbol} + {tvl1} {pairInfo.token1Meta.symbol}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(26,128,71,0.10)', color: 'var(--success)' }}>
            0.3% fee
          </span>
          <ChevronRight size={16} color="var(--subtle)" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Reserve {pairInfo.token0Meta.symbol}</div>
          <div className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>{tvl0}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Reserve {pairInfo.token1Meta.symbol}</div>
          <div className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>{tvl1}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>LP supply</div>
          <div className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>
            {formatTokenAmount(pairInfo.totalSupply, 18, 2)}
          </div>
        </div>
      </div>
    </button>
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
      <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
        <Droplets size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Contracts not yet deployed.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}>
            All Pools
          </h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {isLoading ? 'Loading...' : `${length} pool${length !== 1 ? 's' : ''} created`}
          </p>
        </div>
        <button
          onClick={onCreatePool}
          className="px-3 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          + New Pool
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--surface-muted)', height: 100 }} />
          ))}
        </div>
      )}

      {!isLoading && length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface-muted)', border: '1px dashed var(--border)' }}
        >
          <Droplets size={28} className="mx-auto mb-2" style={{ color: 'var(--subtle)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>No pools yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Create the first liquidity pool to start trading.</p>
          <button
            onClick={onCreatePool}
            className="mt-3 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Create Pool
          </button>
        </div>
      )}

      {!isLoading && length > 0 && (
        <div className="space-y-3">
          {Array.from({ length }).map((_, i) => (
            <PoolRow key={i} index={i} onSelect={onSelectPool} />
          ))}
        </div>
      )}

      {/* Factory link */}
      {factory && (
        <div className="pt-2">
          <a
            href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, factory)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--subtle)' }}
          >
            Factory contract <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}
