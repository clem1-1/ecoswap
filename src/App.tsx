import { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import {
  Leaf,
  ArrowLeftRight,
  Droplets,
  PlusCircle,
  Clock,
  Layers,
  Sun,
  Moon,
  ExternalLink,
  Coins,
} from 'lucide-react';
import SwapTab from '@/components/SwapTab';
import PoolsTab from '@/components/PoolsTab';
import CreatePoolTab from '@/components/CreatePoolTab';
import LiquidityTab from '@/components/LiquidityTab';
import ActivityFeed from '@/components/ActivityFeed';
import { useTheme } from '@/hooks/useTheme';

type Tab = 'swap' | 'pools' | 'create' | 'liquidity' | 'activity';

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'swap', label: 'Swap', icon: <ArrowLeftRight size={15} /> },
  { id: 'pools', label: 'Pools', icon: <Droplets size={15} /> },
  { id: 'create', label: 'Create', icon: <PlusCircle size={15} /> },
  { id: 'liquidity', label: 'Liquidity', icon: <Layers size={15} /> },
  { id: 'activity', label: 'Activity', icon: <Clock size={15} /> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('swap');
  const [selectedPool, setSelectedPool] = useState<`0x${string}` | undefined>();
  const { theme, toggle } = useTheme();

  const handleSelectPool = (addr: `0x${string}`) => {
    setSelectedPool(addr);
    setTab('liquidity');
  };

  const handleCreatePool = () => {
    setTab('create');
  };

  const handlePoolCreated = (addr: `0x${string}`) => {
    setSelectedPool(addr);
    setTab('pools');
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--bg-gradient)', fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: 'var(--surface-strong)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a8047 0%, #2dbd70 100%)' }}
          >
            <Leaf size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <span
            className="font-bold text-lg tracking-tight"
            style={{
              color: 'var(--ink)',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.02em',
            }}
          >
            EcoSwap
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              color: 'var(--ink-2)',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Wallet */}
          <ConnectKitButton.Custom>
            {({ isConnected, show, address, ensName }) => (
              <button
                onClick={show}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  background: isConnected ? 'var(--surface-muted)' : 'var(--accent)',
                  color: isConnected ? 'var(--ink)' : '#fff',
                  border: isConnected ? '1px solid var(--border)' : 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {isConnected ? (
                  <>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: 'var(--success)' }}
                    />
                    <span className="font-mono text-xs">
                      {ensName ?? (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '')}
                    </span>
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </header>

      {/* ── Faucet Banner ── */}
      <div
        className="mx-4 mt-4 rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(26,128,71,0.12) 0%, rgba(45,189,112,0.08) 100%)',
          border: '1px solid rgba(45,189,112,0.25)',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(45,189,112,0.15)' }}
        >
          <Coins size={15} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
            Need testnet tokens?
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Get free USDC and EURC for Arc Testnet from the Circle Faucet.
          </p>
        </div>
        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Faucet
          <ExternalLink size={11} />
        </a>
      </div>

      {/* ── Nav tabs ── */}
      <div className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0"
            style={{
              background: tab === t.id ? 'var(--surface-strong)' : 'transparent',
              color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
              border: tab === t.id ? '1px solid var(--border)' : '1px solid transparent',
              boxShadow: tab === t.id ? '0 1px 4px rgba(18,45,69,0.07)' : 'none',
            }}
          >
            <span style={{ opacity: tab === t.id ? 1 : 0.6 }}>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col items-center px-4 py-5">
        <div className="w-full max-w-md">
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(18,45,69,0.06)',
            }}
          >
            {tab === 'swap' && <SwapTab />}
            {tab === 'pools' && (
              <PoolsTab onSelectPool={handleSelectPool} onCreatePool={handleCreatePool} />
            )}
            {tab === 'create' && <CreatePoolTab onPoolCreated={handlePoolCreated} />}
            {tab === 'liquidity' && <LiquidityTab initialPairAddress={selectedPool} />}
            {tab === 'activity' && <ActivityFeed />}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-4 px-4 text-center">
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
          EcoSwap — Arc Testnet prototype. Not for real funds.{' '}
          <a
            href="https://explorer.testnet.arc.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Explorer
          </a>
          {' · '}
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Get test tokens
          </a>
        </p>
      </footer>
    </div>
  );
}
