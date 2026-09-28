import { useSwitchChain, useAccount } from 'wagmi';
import { AlertTriangle } from 'lucide-react';
import { ARC_TESTNET_CHAIN_ID } from '@/hooks/useEcoSwap';

export function NetworkGuard() {
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  if (!isConnected || chainId === ARC_TESTNET_CHAIN_ID) return null;

  return (
    <div
      className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.25)' }}
    >
      <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
      <p className="flex-1 text-xs font-medium" style={{ color: 'var(--warning)' }}>
        Wrong network — switch to Arc Testnet to use EcoSwap.
      </p>
      <button
        onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
        style={{ background: 'var(--warning)', color: '#000' }}
      >
        Switch
      </button>
    </div>
  );
}
