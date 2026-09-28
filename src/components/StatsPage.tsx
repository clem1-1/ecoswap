import { BarChart3, Droplets, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { useAllPairsLength, usePairAtIndex, usePairInfo, formatTokenAmount } from '@/hooks/useEcoSwap';
import { useActivity } from '@/hooks/useActivity';
import { Skeleton } from './ui/Skeleton';

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl p-5 space-y-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2" style={{ color: 'var(--muted)' }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular" style={{ color: 'var(--ink)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--subtle)' }}>{sub}</p>}
    </div>
  );
}

function PoolStatRow({ index }: { index: number }) {
  const { pairAddress } = usePairAtIndex(index);
  const { pairInfo, isLoading } = usePairInfo(pairAddress);

  if (isLoading) return <tr><td colSpan={5}><Skeleton height={48} /></td></tr>;
  if (!pairInfo) return null;

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="py-3 px-4 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        {pairInfo.token0Meta.symbol}/{pairInfo.token1Meta.symbol}
      </td>
      <td className="py-3 px-4 text-sm tabular text-right" style={{ color: 'var(--ink-2)' }}>
        {formatTokenAmount(pairInfo.reserve0, pairInfo.token0Meta.decimals ?? 6, 2)} + {formatTokenAmount(pairInfo.reserve1, pairInfo.token1Meta.decimals ?? 6, 2)}
      </td>
      <td className="py-3 px-4 text-sm tabular text-right" style={{ color: 'var(--muted)' }}>—</td>
      <td className="py-3 px-4 text-sm tabular text-right" style={{ color: 'var(--muted)' }}>—</td>
      <td className="py-3 px-4 text-sm tabular text-right" style={{ color: 'var(--success)' }}>0.30%</td>
    </tr>
  );
}

export default function StatsPage() {
  const { length } = useAllPairsLength();
  const { items } = useActivity();

  const swapCount = items.filter((i) => i.type === 'swap').length;

  return (
    <div className="w-full space-y-6">
      <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>Protocol Stats</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Droplets size={15} />} label="Total Pools" value={String(length)} sub="All-time" />
        <StatCard icon={<ArrowLeftRight size={15} />} label="Swaps" value={String(swapCount)} sub="This session" />
        <StatCard icon={<TrendingUp size={15} />} label="24h Volume" value="—" sub="On-chain data" />
        <StatCard icon={<BarChart3 size={15} />} label="TVL" value="—" sub="Testnet only" />
      </div>

      {/* Pool table */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>All Pools</h3>
        {length === 0 ? (
          <div className="text-center py-8 rounded-2xl" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No pools yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full" style={{ background: 'var(--surface-muted)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Pair', 'Reserves', '24h Vol', '24h Fees', 'Fee'].map((h) => (
                    <th key={h} className="py-2.5 px-4 text-xs font-semibold text-right first:text-left" style={{ color: 'var(--subtle)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length }).map((_, i) => <PoolStatRow key={i} index={i} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
        24h volume and fees require an indexer — coming soon. All data is Arc Testnet only.
      </p>
    </div>
  );
}
