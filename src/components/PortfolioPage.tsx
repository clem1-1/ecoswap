import { useAccount } from 'wagmi';
import { Wallet, Droplets, ArrowLeftRight, ExternalLink } from 'lucide-react';
import { FEATURED_TOKENS } from '@/constants/tokens';
import { useTokenBalance, useAllPairsLength, usePairAtIndex, usePairInfo, useLPBalance, formatTokenAmount } from '@/hooks/useEcoSwap';
import { Skeleton } from './ui/Skeleton';
import { useActivity } from '@/hooks/useActivity';

function TokenBalance({ symbol, address, userAddress, color }: { symbol: string; address: string; userAddress: `0x${string}`; color?: string; decimals?: number }) {
  const token = FEATURED_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase());
  const { balance, isLoading } = useTokenBalance(address, userAddress);
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: color ?? '#4E6077' }}>
        {symbol.slice(0, 3).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{symbol}</div>
      </div>
      <div className="text-sm font-semibold tabular" style={{ color: 'var(--ink)' }}>
        {isLoading ? <Skeleton height={16} width={60} /> : formatTokenAmount(balance, token?.decimals ?? 6, 4)}
      </div>
    </div>
  );
}

function LPPosition({ index, userAddress }: { index: number; userAddress: `0x${string}` }) {
  const { pairAddress } = usePairAtIndex(index);
  const { pairInfo, isLoading } = usePairInfo(pairAddress);
  const { lpBalance } = useLPBalance(pairAddress, userAddress);

  if (isLoading) return <div className="py-2"><Skeleton height={56} /></div>;
  if (!pairInfo) return null;
  if (!lpBalance || lpBalance === 0n) return null;

  const share = pairInfo.totalSupply > 0n ? Number((lpBalance * 10000n) / pairInfo.totalSupply) / 100 : 0;

  return (
    <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[pairInfo.token0Meta, pairInfo.token1Meta].map((t) => (
              <div key={t.address} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2" style={{ background: t.color ?? '#4E6077', borderColor: 'var(--surface-strong)' }}>
                {t.symbol.slice(0, 2)}
              </div>
            ))}
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {pairInfo.token0Meta.symbol}/{pairInfo.token1Meta.symbol}
          </span>
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>{share.toFixed(3)}% share</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div style={{ color: 'var(--muted)' }}>Pooled {pairInfo.token0Meta.symbol}: <span className="tabular font-medium" style={{ color: 'var(--ink-2)' }}>{formatTokenAmount(pairInfo.reserve0 * lpBalance / pairInfo.totalSupply, pairInfo.token0Meta.decimals ?? 6, 4)}</span></div>
        <div style={{ color: 'var(--muted)' }}>Pooled {pairInfo.token1Meta.symbol}: <span className="tabular font-medium" style={{ color: 'var(--ink-2)' }}>{formatTokenAmount(pairInfo.reserve1 * lpBalance / pairInfo.totalSupply, pairInfo.token1Meta.decimals ?? 6, 4)}</span></div>
      </div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>LP tokens: <span className="tabular font-medium" style={{ color: 'var(--ink-2)' }}>{formatTokenAmount(lpBalance, 18, 4)}</span></div>
    </div>
  );
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { length } = useAllPairsLength();
  const { items } = useActivity();

  if (!isConnected || !address) {
    return (
      <div className="w-full text-center py-16 space-y-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--surface-muted)' }}>
          <Wallet size={24} style={{ color: 'var(--subtle)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Connect your wallet</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Connect to see your token balances and LP positions.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>Portfolio</h2>

      {/* Token balances */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={15} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Token Balances</span>
        </div>
        <div className="rounded-2xl divide-y" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderColor: 'var(--border)' }}>
          {FEATURED_TOKENS.map((t) => (
            <div key={t.address} className="px-4">
              <TokenBalance symbol={t.symbol} address={t.address} userAddress={address} color={t.color} />
            </div>
          ))}
        </div>
      </section>

      {/* LP positions */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Droplets size={15} style={{ color: 'var(--accent-teal)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Liquidity Positions</span>
        </div>
        {length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>No pools exist yet.</p>
        ) : (
          <div className="space-y-2">
            {Array.from({ length }).map((_, i) => (
              <LPPosition key={i} index={i} userAddress={address} />
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      {items.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Recent Activity</span>
          </div>
          <div className="space-y-2">
            {items.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>{item.description}</p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>{new Date(item.timestamp).toLocaleString()}</p>
                </div>
                {item.txHash && (
                  <a href={`https://explorer.testnet.arc.io/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={13} style={{ color: 'var(--accent-teal)' }} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
