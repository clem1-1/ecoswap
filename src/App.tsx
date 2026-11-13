import { useState, useEffect, useCallback } from 'react';
import { ConnectKitButton } from 'connectkit';
import {
  Sun, Moon, Wallet,
  Twitter, MessageCircle, ExternalLink, ChevronDown, Leaf,
  MoreHorizontal,
} from 'lucide-react';

/* ── Premium nav icons — hand-crafted SVGs ── */
function IconSwap({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M14 3L17 6L14 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 6H5C3.9 6 3 6.9 3 8v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M6 17L3 14L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 14H15c1.1 0 2-.9 2-2v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}
function IconBridge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="4" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="16" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6.5 10 Q10 5.5 13.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M6.5 10 Q10 14.5 13.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" strokeDasharray="2 1.5" opacity="0.5"/>
    </svg>
  )
}
function IconPools({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <ellipse cx="10" cy="7" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 7v6c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 10c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.6"/>
    </svg>
  )
}
function IconPortfolio({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 3a7 7 0 1 0 7 7h-7V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 3.5A7.01 7.01 0 0 1 17 10h-4V3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
    </svg>
  )
}
function IconActivity({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <polyline points="2,10 5,10 7,5 10,15 13,7 15,10 18,10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}
function IconLimitOrder({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 1.5" opacity="0.5"/>
      <polyline points="3,15 7,15 7,8 11,8 11,12 15,12 15,5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="15" cy="5" r="1.5" fill="currentColor"/>
    </svg>
  )
}
function IconFaucet({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M8 3h4v5H8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10 8v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 10h6l-1 2H8l-1-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M10 12.5C10 12.5 8 14.5 8 15.5a2 2 0 0 0 4 0c0-1-2-3-2-3z" fill="currentColor" opacity="0.8"/>
    </svg>
  )
}
function IconQuests({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7 9l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconRewards({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2l1.8 3.6 4 .6-2.9 2.8.7 4L10 11l-3.6 1.9.7-4L4.2 6.2l4-.6L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M7 14l-2 4h10l-2-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
    </svg>
  )
}
function IconStats({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="12" width="3" height="5" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="8.5" y="8" width="3" height="9" rx="1" fill="currentColor" opacity="0.85"/>
      <rect x="14" y="4" width="3" height="13" rx="1" fill="currentColor"/>
      <path d="M4.5 11 L10 6.5 L15.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}
function IconDocs({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="7" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="7" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}
import SwapTab from '@/components/SwapPanel';
import LimitOrderTab from '@/components/LimitOrderTab';
import BridgeTab from '@/components/BridgeTab';
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
import { LogoMark, LogoWordmark } from '@/components/Logo';
import PriceChartCard from '@/components/PriceChartCard';
import { FEATURED_TOKENS, type Token } from '@/constants/tokens';
import { NetworkGuard } from '@/components/NetworkGuard';
import { useTheme } from '@/hooks/useTheme';
import { useLeafPoints } from '@/hooks/useLeafPoints';
import { useAccount } from 'wagmi';

type Tab = 'swap' | 'limit' | 'bridge' | 'pools' | 'create' | 'liquidity' | 'activity' | 'faucet' | 'portfolio' | 'stats' | 'faq' | 'rewards' | 'quests';

// Primary nav — always visible in top bar
const NAV_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'swap',      label: 'Swap',      icon: <IconSwap size={14} /> },
  { id: 'bridge',    label: 'Bridge',    icon: <IconBridge size={14} /> },
  { id: 'pools',     label: 'Pools',     icon: <IconPools size={14} /> },
  { id: 'portfolio', label: 'Portfolio', icon: <IconPortfolio size={14} /> },
  { id: 'activity',  label: 'Activity',  icon: <IconActivity size={14} /> },
];

// "More" dropdown items
const MORE_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'limit',   label: 'Limit Orders', icon: <IconLimitOrder size={14} /> },
  { id: 'faucet',  label: 'Faucet',       icon: <IconFaucet size={14} /> },
  { id: 'quests',  label: 'Quests',       icon: <IconQuests size={14} /> },
  { id: 'rewards', label: 'Rewards',      icon: <IconRewards size={14} /> },
  { id: 'stats',   label: 'Stats',        icon: <IconStats size={14} /> },
  { id: 'faq',     label: 'Docs',         icon: <IconDocs size={14} /> },
];

const BOTTOM_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'swap',     label: 'Swap',     icon: <IconSwap size={20} /> },
  { id: 'bridge',   label: 'Bridge',   icon: <IconBridge size={20} /> },
  { id: 'pools',    label: 'Pools',    icon: <IconPools size={20} /> },
  { id: 'activity', label: 'Activity', icon: <IconActivity size={20} /> },
  { id: 'faucet',   label: 'Faucet',   icon: <IconFaucet size={20} /> },
];

const WIDE_TABS: Tab[] = ['pools', 'create', 'liquidity', 'stats', 'faq', 'portfolio', 'quests', 'rewards', 'limit'];

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
  const [moreOpen, setMoreOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(() => localStorage.getItem('ecoswap-chart') !== '0');
  const [pair, setPair] = useState<{ tokenIn: Token; tokenOut: Token }>({ tokenIn: FEATURED_TOKENS[0], tokenOut: FEATURED_TOKENS[1] });
  const handlePairChange = useCallback((tokenIn: Token, tokenOut: Token) => setPair({ tokenIn, tokenOut }), []);
  const toggleChart = useCallback(() => {
    setChartOpen((v) => { localStorage.setItem('ecoswap-chart', v ? '0' : '1'); return !v; });
  }, []);
  const moreActive = MORE_TABS.some((t) => t.id === tab);
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
    ? 'rgba(4,31,23,0.88)'
    : 'rgba(247,247,247,0.90)';

  if (showLanding) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  return (
    <div className="min-h-dvh flex flex-col relative" style={{ background: 'var(--bg)' }}>
      <div className="ambient-bg" aria-hidden="true" />

      {/* ── Sticky top nav ── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-[52px]"
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
          <LogoMark size={36} />
          <span className="hidden sm:inline-flex"><LogoWordmark size={20} /></span>
        </button>

        {/* Center nav — 4 primary tabs + More dropdown */}
        <nav className="hidden md:flex items-center gap-0.5" role="tablist">
          {NAV_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => { setTab(t.id); setMoreOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all relative"
                style={{
                  color: active ? 'var(--ink)' : 'var(--muted)',
                  background: active ? 'var(--surface-hover)' : 'transparent',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{t.icon}</span>
                {t.label}
                {active && (
                  <span className="absolute -bottom-px left-2 right-2 h-px rounded-full" style={{ background: 'var(--accent)' }} />
                )}
              </button>
            );
          })}

          {/* More dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all relative"
              style={{
                color: moreActive ? 'var(--ink)' : 'var(--muted)',
                background: moreActive || moreOpen ? 'var(--surface-strong)' : 'transparent',
                border: moreActive || moreOpen ? '1px solid var(--border-strong)' : '1px solid transparent',
              }}
              aria-label="More pages"
            >
              <MoreHorizontal size={14} style={{ color: moreActive ? 'var(--accent)' : 'inherit' }} />
              More
              <ChevronDown size={11} style={{ opacity: 0.5, transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
              {moreActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
            {moreOpen && (
              <div
                className="absolute left-0 top-full mt-2 rounded-2xl p-1 min-w-[148px] z-50"
                style={{ background: 'var(--surface-strong)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-elevated)' }}
                onMouseLeave={() => setMoreOpen(false)}
              >
                {MORE_TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setTab(t.id); setMoreOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold text-left transition-colors"
                      style={{
                        color: active ? 'var(--accent)' : 'var(--ink-2)',
                        background: active ? 'rgba(15,157,107,0.10)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(15,157,107,0.10)' : 'transparent'; }}
                    >
                      <span style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}>{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={isConnected ? {
                    background: 'var(--surface-strong)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border-strong)',
                  } : {
                    background: 'var(--grad-btn)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: 'var(--shadow-btn)',
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
        {/* Bridge tab manages its own card layout */}
        {tab === 'bridge' && (
          <div className="w-full max-w-[460px] page-enter">
            <BridgeTab />
          </div>
        )}
        {tab === 'swap' && (
          <div className="w-full max-w-[940px] page-enter flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5">
            {chartOpen && (
              <PriceChartCard
                tokenIn={pair.tokenIn}
                tokenOut={pair.tokenOut}
                onClose={toggleChart}
                className="w-full max-w-[460px] lg:w-[440px] lg:max-w-none flex-shrink-0"
              />
            )}
            <div className="w-full max-w-[460px] flex-shrink-0">
              <div className="glass-card p-5 sm:p-6">
                <SwapTab
                  onNavigate={(t) => setTab(t as Tab)}
                  chartOpen={chartOpen}
                  onToggleChart={toggleChart}
                  onPairChange={handlePairChange}
                />
              </div>
            </div>
          </div>
        )}
        {tab !== 'bridge' && tab !== 'swap' && (
        <div className={`w-full page-enter ${isWide ? 'max-w-2xl' : 'max-w-[460px]'}`}>
          <div className="glass-card p-5 sm:p-6">
            {tab === 'limit'     && <LimitOrderTab />}
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
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="hidden md:flex relative z-10 items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[11px]" style={{ color: 'var(--subtle)' }}>
          EcoSwap · Arc Testnet · Tokens have no real value
        </p>
        <div className="flex items-center gap-4">
          <a href="https://explorer.testnet.arc.io" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--muted)' }}>
            Explorer <ExternalLink size={9} />
          </a>
          <a href="https://x.com/EcoSwapDEX" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--muted)' }}>
            <Twitter size={10} /> X
          </a>
          <a href="https://discord.gg/ecoswap" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--muted)' }}>
            <MessageCircle size={10} /> Discord
          </a>
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
