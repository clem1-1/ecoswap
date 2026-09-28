import { useState } from 'react';
import { ArrowLeftRight, Droplets, MinusCircle, PlusCircle, Clock, ExternalLink } from 'lucide-react';
import { useActivity, type ActivityType } from '@/hooks/useActivity';

const iconMap: Record<ActivityType, React.ReactNode> = {
  swap:             <ArrowLeftRight size={14} />,
  add_liquidity:    <Droplets size={14} />,
  remove_liquidity: <MinusCircle size={14} />,
  create_pool:      <PlusCircle size={14} />,
};

const labelMap: Record<ActivityType, string> = {
  swap:             'Swap',
  add_liquidity:    'Add Liquidity',
  remove_liquidity: 'Remove Liquidity',
  create_pool:      'Pool Created',
};

const colorMap: Record<ActivityType, string> = {
  swap:             '#2775CA',
  add_liquidity:    '#10B981',
  remove_liquidity: '#F59E0B',
  create_pool:      '#14B8A6',
};

const bgMap: Record<ActivityType, string> = {
  swap:             'rgba(39,117,202,0.10)',
  add_liquidity:    'rgba(16,185,129,0.10)',
  remove_liquidity: 'rgba(245,158,11,0.10)',
  create_pool:      'rgba(20,184,166,0.10)',
};

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

type FilterType = ActivityType | 'all';
const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'all',             label: 'All' },
  { id: 'swap',            label: 'Swaps' },
  { id: 'add_liquidity',   label: 'Add Liq.' },
  { id: 'remove_liquidity',label: 'Remove' },
  { id: 'create_pool',     label: 'Pools' },
];

export default function ActivityFeed() {
  const { items } = useActivity();
  const [filter, setFilter] = useState<FilterType>('all');
  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>Activity</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          {items.length} tx
        </span>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-4">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0"
            style={{
              background: filter === f.id ? 'var(--grad-btn)' : 'var(--surface-muted)',
              color: filter === f.id ? '#fff' : 'var(--muted)',
              border: filter === f.id ? 'none' : '1px solid var(--border)',
              boxShadow: filter === f.id ? '0 2px 10px rgba(15,157,107,0.20)' : 'none',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-14 space-y-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <Clock size={26} style={{ color: 'var(--subtle)' }} />
          </div>
          <p className="text-base font-bold" style={{ color: 'var(--ink-2)' }}>No activity yet</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Your swaps and liquidity events will appear here.
          </p>
        </div>
      )}

      {/* Empty filter state */}
      {items.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
            No {filter.replace('_', ' ')} transactions yet.
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative space-y-2">
        {/* Vertical line */}
        {filtered.length > 1 && (
          <div className="absolute left-[18px] top-4 bottom-4 w-px" style={{ background: 'var(--border)' }} />
        )}

        {filtered.map((item, idx) => (
          <div
            key={item.id}
            className="stagger-item flex items-start gap-3 group"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {/* Icon dot */}
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 relative z-10 transition-transform group-hover:scale-110"
              style={{ background: bgMap[item.type], color: colorMap[item.type], border: `1px solid ${colorMap[item.type]}28` }}
            >
              {iconMap[item.type]}
            </div>

            {/* Content */}
            <div
              className="flex-1 rounded-2xl px-4 py-3 min-w-0 table-row-hover"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-extrabold" style={{ color: colorMap[item.type] }}>
                  {labelMap[item.type]}
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--success)' }}
                >
                  ✓ Success
                </span>
                <span className="text-[11px] ml-auto" style={{ color: 'var(--subtle)' }}>
                  {formatTime(item.timestamp)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-2)' }}>
                  {item.description}
                </p>
                {item.txHash && (
                  <a
                    href={`https://explorer.testnet.arc.io/tx/${item.txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--accent-teal)' }}
                    aria-label="View transaction"
                  >
                    Tx <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
