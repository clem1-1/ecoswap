import { ArrowLeftRight, Droplets, PlusCircle, MinusCircle, ExternalLink, Clock } from 'lucide-react';
import { useActivity, type ActivityType } from '@/hooks/useActivity';

const iconMap: Record<ActivityType, JSX.Element> = {
  swap: <ArrowLeftRight size={14} />,
  add_liquidity: <Droplets size={14} />,
  remove_liquidity: <MinusCircle size={14} />,
  create_pool: <PlusCircle size={14} />,
};

const labelMap: Record<ActivityType, string> = {
  swap: 'Swap',
  add_liquidity: 'Add Liquidity',
  remove_liquidity: 'Remove Liquidity',
  create_pool: 'Pool Created',
};

const colorMap: Record<ActivityType, string> = {
  swap: '#2775CA',
  add_liquidity: 'var(--success)',
  remove_liquidity: '#E8A507',
  create_pool: 'var(--accent)',
};

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function ActivityFeed() {
  const { items } = useActivity();

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock size={28} className="mx-auto mb-2" style={{ color: 'var(--subtle)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>No activity yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          Your swaps, liquidity events, and pool creations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <h2
        className="font-semibold text-base pb-1"
        style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Activity
      </h2>
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${colorMap[item.type]}18`, color: colorMap[item.type] }}
          >
            {iconMap[item.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colorMap[item.type] }}>
                {labelMap[item.type]}
              </span>
              <span className="text-xs" style={{ color: 'var(--subtle)' }}>{formatTime(item.timestamp)}</span>
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-2)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {item.description}
            </p>
          </div>
          {item.txHash && (
            <a
              href={`${item.explorerBase}/tx/${item.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <ExternalLink size={14} color="var(--ink-2)" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
