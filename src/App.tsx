import { useState, useEffect } from 'react';
import { ConnectKitButton } from 'connectkit';
import {
  ArrowLeftRight, Droplets, Clock,
  Sun, Moon, Wallet, BarChart3, BookOpen,
  Twitter, MessageCircle, ExternalLink, ChevronDown, Leaf, Trophy, Map,
} from 'lucide-react';
import SwapTab from '@/components/SwapTab';
import PoolsTab from '@/components/PoolsTab';
import CreatePoolTab from '@/components/CreatePoolTab';
import LiquidityTab from '@/components/LiquidityTab';
import ActivityFeed from '@/components/ActivityFeed';
import FaucetPage from '@/components/FaucetPage';
import PortfolioPage from '@/components/PortfolioPage';
import StatsPage from '@/components/StatsPage';
import FAQPage from '@/components/FAQPage';
import RewardsPage from '@/components/RewardsPage';
import QuestsPage from '@/components/QuestsPage';
import LandingPage from '@/components/LandingPage';
import { NetworkGuard } from '@/components/NetworkGuard';
import { useTheme } from '@/hooks/useTheme';
import { useLeafPoints } from '@/hooks/useLeafPoints';
import { useAccount } from 'wagmi';

type Tab = 'swap' | 'pools' | 'create' | 'liquidity' | 'activity' | 'faucet' | 'portfolio' | 'stats' | 'faq' | 'rewards' | 'quests';

const NAV_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'swap',      label: 'Swap',      icon: <ArrowLeftRight size={14} /> },
  { id: 'pools',     label: 'Pools',     icon: <Droplets size={14} /> },
  { id: 'activity',  label: 'Activity',  icon: <Clock size={14} /> },
  { id: 'portfolio', label: 'Portfolio', icon: <Wallet size={14} /> },
  { id: 'faucet',    label: 'Faucet',    icon: <Droplets size={14} /> },
  { id: 'quests',    label: 'Quests',    icon: <Map size={14} /> },
  { id: 'rewards',   label: 'Rewards',   icon: <Trophy size={14} /> },
  { id: 'stats',     label: 'Stats',     icon: <BarChart3 size={14} /> },
  { id: 'faq',       label: 'Docs',      icon: <BookOpen size={14} /> },
];

const BOTTOM_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'swap',     label: 'Swap',    icon: <ArrowLeftRight size={20} /> },
  { id: 'pools',    label: 'Pools',   icon: <Droplets size={20} /> },
  { id: 'quests',   label: 'Quests',  icon: <Map size={20} /> },
  { id: 'rewards',  label: 'Rewards', icon: <Trophy size={20} /> },
  { id: 'faucet',   label: 'Faucet',  icon: <Droplets size={20} /> },
];

const WIDE_TABS: Tab[] = ['pools', 'create', 'liquidity', 'stats', 'faq', 'portfolio', 'quests', 'rewards'];

/* ── EcoSwap Logo SVG ── */
function EcoSwapLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="24" r="21" stroke="rgba(20,184,166,0.18)" strokeWidth="1.5" />
      <path d="M24 3 A21 21 0 0 1 45 24" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <polygon points="45,24 40.5,17.5 40.5,30.5" fill="#14B8A6"/>
      <path d="M24 45 A21 21 0 0 1 3 24" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <polygon points="3,24 7.5,17.5 7.5,30.5" fill="#14B8A6"/>
      <circle cx="24" cy="24" r="13" fill="#0F9D6B"/>
      <circle cx="24" cy="24" r="13" fill="url(#leafGrad)" opacity="0.3"/>
      <path d="M24 13 C19.5 17.5 17.5 22 19.5 26.5 C21.5 31 27.5 31 29.5 26.5 C31.5 22 28 15.5 24 13 Z" fill="white" opacity="0.95"/>
      <line x1="24" y1="13" x2="24" y2="30" stroke="#0D8A5D" strokeWidth="1.1" strokeLinecap="round"/>
      <defs>
        <radialGradient id="leafGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#10D49A" />
          <stop offset="100%" stopColor="#0F9D6B" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ── Leaf badge in header ── */
function LeafBadge({ address }: { address?: string }) {
  const store = useLeafPoints(address);
  if (!address) return null;
  return (
    <button
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold transition-all hover:opacity-80"
      style={{ background: 'rgba(15,157,107,0.12)', border: '1px solid rgba(15,157,107,0.25)', color: 'var(--accent)' }}
      title="Leaf Points"
    >
      <Leaf size={12} style={{ color: 'var(--accent)' }} />
      <span className="tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>{store.total}</span>
    </button>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState(() => !localStorage.getItem('ecoswap-launched'));
  const [tab, setTab] = useState<Tab>('swap');
  const [selectedPool, setSelectedPool] = useState<`0x${string}` | undefined>();
  const { theme, toggle } = useTheme();
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLaunch = () => {
    localStorage.setItem('ecoswap-launched', '1');
    setShowLanding(false);
  };

  const handleSelectPool = (addr: `0x${string}`) => { setSelectedPool(addr); setTab('liquidity'); };
  const handleCreatePool = () => setTab('create');
  const handlePoolCreated = (addr: `0x${string}`) => { setSelectedPool(addr); setTab('pools'); };

  const isWide = WIDE_TABS.includes(tab);

  const navBg = theme === 'dark'
    ? 'rgba(7,17,15,0.88)'
    : 'rgba(244,251,248,0.88)';

  if (showLanding) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  return (
    <div className="min-h-dvh flex flex-col relative" style={{ background: 'var(--bg-gradient)' }}>
      <div className="ambient-bg" aria-hidden="true" />

      {/* ── Sticky top nav ── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-[60px]"
        style={{
          background: navBg,
          backdropFilter: 'var(--blur-nav)',
          WebkitBackdropFilter: 'var(--blur-nav)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => setShowLanding(true)}
          className="flex items-center gap-2.5 flex-shrink-0"
          aria-label="EcoSwap home"
        >
          <EcoSwapLogo size={34} />
          <div className="hidden sm:flex items-baseline gap-0.5">
            <span className="font-extrabold text-[17px] tracking-tight" style={{ color: 'var(--ink)' }}>Eco</span>
            <span className="font-extrabold text-[17px] tracking-tight" style={{ color: 'var(--accent)' }}>Swap</span>
          </div>
        </button>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-0.5" role="tablist">
          {NAV_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all relative"
                style={{
                  color: active ? 'var(--ink)' : 'var(--muted)',
                  background: active ? 'var(--surface-strong)' : 'transparent',
                  boxShadow: active ? 'var(--glow-card)' : 'none',
                  border: active ? '1px solid var(--border-strong)' : '1px solid transparent',
                }}
              >
                <span style={{ color: active ? 'var(--accent)' : 'inherit' }}>{t.icon}</span>
                {t.label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="testnet-badge hidden sm:inline-flex">
            <span className="testnet-dot" />
            TESTNET
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(20,184,166,0.10)', color: 'var(--accent-teal)', border: '1px solid rgba(20,184,166,0.20)' }}>
            <svg width="7" height="7" viewBox="0 0 7 7" aria-hidden="true"><circle cx="3.5" cy="3.5" r="3.5" fill="#14B8A6"/></svg>
            Arc
          </span>

          {/* Leaf Points badge */}
          <LeafBadge address={address} />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="theme-toggle"
            style={{ minWidth: 62 }}
          >
            <span className="theme-toggle-thumb" style={{ left: theme === 'light' ? '2px' : 'calc(50%)' }} />
            <span className="theme-toggle-icon" style={{ color: theme === 'light' ? 'var(--accent)' : 'var(--muted)' }}>
              <Sun size={13} />
            </span>
            <span className="theme-toggle-icon" style={{ color: theme === 'dark' ? 'var(--accent)' : 'var(--muted)' }}>
              <Moon size={13} />
            </span>
          </button>

          {/* Wallet */}
          <ConnectKitButton.Custom>
            {({ isConnected, show, address: addr, ensName }) => (
              <div className="relative">
                <button
                  onClick={isConnected ? () => setWalletMenuOpen((v) => !v) : show}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all"
                  style={isConnected ? {
                    background: 'var(--surface-strong)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border-strong)',
                    boxShadow: 'var(--glow-card)',
                  } : {
                    background: 'var(--grad-btn)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(15,157,107,0.35)',
                  }}
                >
                  {isConnected ? (
                    <>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--success)' }} />
                      <span className="font-mono tabular text-xs">
                        {ensName ?? (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '')}
                      </span>
                      <ChevronDown size={12} style={{ opacity: 0.6 }} />
                    </>
                  ) : (
                    <>
                      <Wallet size={14} />
                      <span>Connect</span>
                    </>
                  )}
                </button>
                {isConnected && walletMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 rounded-2xl p-1 min-w-[160px] z-50"
                    style={{ background: 'var(--surface-strong)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-elevated)' }}
                    onMouseLeave={() => setWalletMenuOpen(false)}
                  >
                    {[
                      { label: 'Portfolio', icon: <Wallet size={13} />, action: () => { setTab('portfolio'); setWalletMenuOpen(false); } },
                      { label: 'Rewards', icon: <Leaf size={13} />, action: () => { setTab('rewards'); setWalletMenuOpen(false); } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors"
                        style={{ color: 'var(--ink-2)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {item.icon}{item.label}
                      </button>
                    ))}
                    <button
                      onClick={show}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors"
                      style={{ color: 'var(--danger)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--danger-bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </ConnectKitButton.Custom>
        </div>
      </header>

      <NetworkGuard />

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 pb-28 md:pb-10 relative z-10">
        <div className={`w-full page-enter ${isWide ? 'max-w-2xl' : 'max-w-[460px]'}`}>
          <div className="glass-card p-5 sm:p-6">
            {tab === 'swap'      && <SwapTab onNavigate={(t) => setTab(t as Tab)} />}
            {tab === 'pools'     && <PoolsTab onSelectPool={handleSelectPool} onCreatePool={handleCreatePool} />}
            {tab === 'create'    && <CreatePoolTab onPoolCreated={handlePoolCreated} />}
            {tab === 'liquidity' && <LiquidityTab initialPairAddress={selectedPool} />}
            {tab === 'activity'  && <ActivityFeed />}
            {tab === 'faucet'    && <FaucetPage />}
            {tab === 'portfolio' && <PortfolioPage />}
            {tab === 'stats'     && <StatsPage />}
            {tab === 'faq'       && <FAQPage />}
            {tab === 'rewards'   && <RewardsPage />}
            {tab === 'quests'    && <QuestsPage onNavigate={(t) => setTab(t as Tab)} />}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="hidden md:block relative z-10 pb-6 pt-2 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EcoSwapLogo size={20} />
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>Arc Testnet only — tokens have no real value</p>
            <a href="https://explorer.testnet.arc.io" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-xs hover:opacity-70 transition-opacity" style={{ color: 'var(--muted)' }}>
              Explorer <ExternalLink size={10} className="ml-0.5" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--subtle)' }}><Twitter size={14} /></a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--subtle)' }}><MessageCircle size={14} /></a>
          </div>
        </div>
      </footer>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-40 flex items-center justify-around px-1"
        style={{
          background: theme === 'dark' ? 'rgba(7,17,15,0.93)' : 'rgba(244,251,248,0.93)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          paddingTop: '8px',
        }}
      >
        {BOTTOM_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl relative min-w-0 transition-all"
              style={{ color: active ? 'var(--accent)' : 'var(--subtle)' }}
            >
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />}
              <span className={`transition-transform ${active ? 'scale-110' : 'scale-100'}`}>{t.icon}</span>
              <span className="text-[10px] font-semibold tracking-tight">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
