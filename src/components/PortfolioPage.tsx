import { useAccount } from 'wagmi';
import { Wallet, Droplets, ArrowLeftRight, ExternalLink, TrendingUp, ArrowUpDown, TrendingDown } from 'lucide-react';
import { FEATURED_TOKENS } from '@/constants/tokens';
import { useTokenBalance, useAllPairsLength, usePairAtIndex, usePairInfo, useLPBalance, formatTokenAmount } from '@/hooks/useEcoSwap';
import { Skeleton } from './ui/Skeleton';
import { useActivity } from '@/hooks/useActivity';
import { computePnL } from '@/hooks/usePnL';
import SparklineChart from './SparklineChart';

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
  const claimable0 = pairInfo.reserve0 * lpBalance / (pairInfo.totalSupply > 0n ? pairInfo.totalSupply : 1n);
  const claimable1 = pairInfo.reserve1 * lpBalance / (pairInfo.totalSupply > 0n ? pairInfo.totalSupply : 1n);
  const pnl = computePnL(
    pairInfo.pairAddress,
    claimable0, claimable1,
    pairInfo.token0Meta.decimals ?? 6,
    pairInfo.token1Meta.decimals ?? 6,
  );
  const isToken0In = pairInfo.token0Meta.address.toLowerCase() < pairInfo.token1Meta.address.toLowerCase();

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
      {/* Header */}
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
        <div className="flex items-center gap-2">
          {pnl && (
            <span className="flex items-center gap-0.5 text-xs font-bold tabular px-2 py-0.5 rounded-full"
              style={{
                background: pnl.isProfit ? 'rgba(15,157,107,0.1)' : 'rgba(240,82,82,0.1)',
                color: pnl.isProfit ? 'var(--success)' : 'var(--danger)',
              }}>
              {pnl.isProfit ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {pnl.pnlPct}
            </span>
          )}
          <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>{share.toFixed(3)}%</span>
        </div>
      </div>

      {/* Claimable amounts */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div style={{ color: 'var(--muted)' }}>
          {pairInfo.token0Meta.symbol}: <span className="tabular font-medium" style={{ color: 'var(--ink-2)' }}>{formatTokenAmount(claimable0, pairInfo.token0Meta.decimals ?? 6, 4)}</span>
          {pnl && <span className="ml-1 tabular" style={{ color: pnl.isProfit ? 'var(--success)' : 'var(--danger)' }}>({pnl.pnl0})</span>}
        </div>
        <div style={{ color: 'var(--muted)' }}>
          {pairInfo.token1Meta.symbol}: <span className="tabular font-medium" style={{ color: 'var(--ink-2)' }}>{formatTokenAmount(claimable1, pairInfo.token1Meta.decimals ?? 6, 4)}</span>
          {pnl && <span className="ml-1 tabular" style={{ color: pnl.isProfit ? 'var(--success)' : 'var(--danger)' }}>({pnl.pnl1})</span>}
        </div>
      </div>

      {/* Sparkline price chart */}
      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[11px]" style={{ color: 'var(--subtle)' }}>LP tokens: {formatTokenAmount(lpBalance, 18, 4)}</span>
        <SparklineChart pairInfo={pairInfo} isToken0In={isToken0In} height={32} width={100} />
      </div>
    </div>
  );
}

/* Estimated fee earnings for an LP position.
   0.3% fee tier — fees accumulate in the pool reserves.
   We show the user's proportional share of each reserve as "claimable",
   which represents the approximate value they'd receive on removal. */
function EarningsRow({ index, userAddress }: { index: number; userAddress: `0x${string}` }) {
  const { pairAddress } = usePairAtIndex(index);
  const { pairInfo, isLoading } = usePairInfo(pairAddress);
  const { lpBalance } = useLPBalance(pairAddress, userAddress);

  if (isLoading) return <div className="py-2"><Skeleton height={48} /></div>;
  if (!pairInfo || !lpBalance || lpBalance === 0n) return null;

  const share = pairInfo.totalSupply > 0n ? (lpBalance * 10000n) / pairInfo.totalSupply : 0n;
  const claimable0 = pairInfo.reserve0 * lpBalance / (pairInfo.totalSupply > 0n ? pairInfo.totalSupply : 1n);
  const claimable1 = pairInfo.reserve1 * lpBalance / (pairInfo.totalSupply > 0n ? pairInfo.totalSupply : 1n);
  const sharePercent = Number(share) / 100;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
    >
      {/* pair header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[pairInfo.token0Meta, pairInfo.token1Meta].map((t) => (
              <div key={t.address}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2"
                style={{ background: t.color ?? '#4E6077', borderColor: 'var(--surface-strong)' }}
              >{t.symbol.slice(0, 2)}</div>
            ))}
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {pairInfo.token0Meta.symbol}/{pairInfo.token1Meta.symbol}
          </span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(15,157,107,0.1)', color: 'var(--success)' }}>
          {sharePercent.toFixed(3)}% share
        </span>
      </div>

      {/* claimable amounts */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { meta: pairInfo.token0Meta, amount: claimable0 },
          { meta: pairInfo.token1Meta, amount: claimable1 },
        ].map(({ meta, amount }) => (
          <div key={meta.address}
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(15,157,107,0.06)', border: '1px solid rgba(15,157,107,0.12)' }}
          >
            <div className="text-[11px] font-medium mb-1" style={{ color: 'var(--muted)' }}>{meta.symbol}</div>
            <div className="text-base font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {formatTokenAmount(amount, meta.decimals ?? 6, 4)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--accent)' }}>claimable on removal</div>
          </div>
        ))}
      </div>
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

      {/* Earnings from LP */}
      {length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Earnings</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-1"
              style={{ background: 'rgba(15,157,107,0.1)', color: 'var(--accent)' }}>
              0.3% fee share
            </span>
          </div>
          <div className="space-y-2">
            {Array.from({ length }).map((_, i) => (
              <EarningsRow key={i} index={i} userAddress={address} />
            ))}
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--subtle)' }}>
            Amounts claimable by removing liquidity. Includes principal + accumulated fees.
          </p>
        </section>
      )}

      {/* Bridge history */}
      {items.filter((i) => i.type === 'bridge').length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpDown size={15} style={{ color: '#8B5CF6' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Bridge History</span>
          </div>
          <div className="space-y-2">
            {items.filter((i) => i.type === 'bridge').slice(0, 5).map((item) => (
              <div key={item.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                  <ArrowUpDown size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    {item.amount && item.token ? `${item.amount} ${item.token}` : item.description}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    {item.fromChain && item.toChain
                      ? `${item.fromChain} → ${item.toChain}`
                      : new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px]" style={{ color: 'var(--subtle)' }}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                  {item.txHash && (
                    <a href={`${item.explorerBase}/tx/${item.txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-[11px] mt-0.5"
                      style={{ color: 'var(--accent-teal)' }}>
                      Tx <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      {items.filter((i) => i.type !== 'bridge').length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Recent Activity</span>
          </div>
          <div className="space-y-2">
            {items.filter((i) => i.type !== 'bridge').slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--ink-2)' }}>{item.description}</p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>{new Date(item.timestamp).toLocaleString()}</p>
                </div>
                {item.txHash && (
                  <a href={`${item.explorerBase}/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer">
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
