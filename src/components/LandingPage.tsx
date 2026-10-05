import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Zap, DollarSign, Leaf, ExternalLink, Twitter, MessageCircle, ShieldCheck } from 'lucide-react';

/* ── Animated logo hero ── */
function AnimatedLogo() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      {/* Outer pulsing ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '2px solid rgba(20,184,166,0.3)',
        animation: 'pulse 2.5s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 8, borderRadius: '50%',
        border: '1.5px solid rgba(15,157,107,0.2)',
        animation: 'pulse 2.5s ease-in-out infinite 0.5s',
      }} />
      {/* Main logo SVG */}
      <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="21" stroke="rgba(20,184,166,0.25)" strokeWidth="1.5" />
        <g style={{ animation: 'spin 12s linear infinite', transformOrigin: '24px 24px' }}>
          <path d="M24 3 A21 21 0 0 1 45 24" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <polygon points="45,24 40.5,17.5 40.5,30.5" fill="#14B8A6"/>
          <path d="M24 45 A21 21 0 0 1 3 24" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <polygon points="3,24 7.5,17.5 7.5,30.5" fill="#14B8A6"/>
        </g>
        <circle cx="24" cy="24" r="13" fill="#0F9D6B"/>
        <path d="M24 13 C19.5 17.5 17.5 22 19.5 26.5 C21.5 31 27.5 31 29.5 26.5 C31.5 22 28 15.5 24 13Z" fill="white" opacity="0.95"/>
        <line x1="24" y1="13" x2="24" y2="30" stroke="#0D8A5D" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
      `}</style>
    </div>
  );
}

/* ── Scroll fade-in hook ── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function FadeSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Highlights strip — no numeric counts ── */
function StatsStrip() {
  const highlights = [
    { icon: <ShieldCheck size={15} />, label: 'Permissionless' },
    { icon: <svg width="15" height="15" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="13" fill="#0F9D6B"/><path d="M24 13 C19.5 17.5 17.5 22 19.5 26.5 C21.5 31 27.5 31 29.5 26.5 C31.5 22 28 15.5 24 13Z" fill="white" opacity="0.95"/></svg>, label: 'Arc Testnet' },
    { icon: <DollarSign size={15} />, label: 'USDC Gas' },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {highlights.map((h) => (
        <span
          key={h.label}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: 'rgba(15,157,107,0.10)',
            border: '1px solid rgba(15,157,107,0.20)',
            color: 'var(--accent)',
          }}
        >
          {h.icon}{h.label}
        </span>
      ))}
    </div>
  );
}

interface LandingPageProps {
  onLaunch: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden" style={{ background: 'var(--bg-gradient)' }}>
      {/* Ambient glows — stronger hero glow */}
      <div className="ambient-bg" aria-hidden="true" />
      <div aria-hidden="true" style={{
        position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 520, height: 320, borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(15,157,107,0.18) 0%, rgba(20,184,166,0.10) 40%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Testnet notice */}
      <div className="relative z-10 flex justify-center pt-4 px-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--warning)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--warning)', display: 'inline-block' }} />
          Arc Testnet Only — Tokens have no real-world value
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-10 pb-8 text-center">
        <AnimatedLogo />

        <h1
          className="mt-8 font-extrabold tracking-tight leading-tight"
          style={{ color: 'var(--ink)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', maxWidth: 640 }}
        >
          Swap Smarter on Arc.<br />
          <span style={{ background: 'var(--grad-btn)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gas Paid in USDC.
          </span>
        </h1>

        <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--muted)', maxWidth: 480 }}>
          EcoSwap is a permissionless AMM built on Arc — where USDC is the native gas token.
          No juggling volatile gas tokens. Just swap, earn, and grow.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button
            onClick={onLaunch}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-base font-extrabold"
          >
            Launch App <ArrowRight size={18} />
          </button>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-bold transition-all hover:opacity-80"
            style={{ background: 'var(--surface-strong)', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
          >
            Get Testnet Tokens <ExternalLink size={16} />
          </a>
        </div>

        {/* Live stats */}
        <div className="mt-12 w-full max-w-md">
          <StatsStrip />
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="relative z-10 px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <FadeSection>
            <div className="text-center mb-10">
              <h2 className="font-extrabold text-2xl tracking-tight mb-3" style={{ color: 'var(--ink)' }}>
                Built for the Arc Ecosystem
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                {[
                  { name: 'Arc', color: '#14B8A6' },
                  { name: 'USDC', color: '#2775CA' },
                  { name: 'EURC', color: '#0052B4' },
                ].map((p) => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: `${p.color}18`, border: `1px solid ${p.color}33`, color: p.color }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          </FadeSection>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Zap size={24} style={{ color: 'var(--accent-teal)' }} />,
                title: 'Fast & Low-Cost',
                body: 'Sub-second finality on Arc with predictable fees. No gas spikes, no surprises.',
                color: 'var(--accent-teal)',
                delay: 0,
              },
              {
                icon: <DollarSign size={24} style={{ color: 'var(--accent)' }} />,
                title: 'USDC as Gas',
                body: 'Arc is USDC-native — you pay gas in USDC. One token for everything.',
                color: 'var(--accent)',
                delay: 100,
              },
              {
                icon: <Leaf size={24} style={{ color: '#4ADE80' }} />,
                title: 'Earn Leaf Points',
                body: 'Every action earns leaves. Level up from Seed to Forest on the leaderboard.',
                color: '#4ADE80',
                delay: 200,
              },
            ].map((card) => (
              <FadeSection key={card.title} delay={card.delay}>
                <div
                  className="rounded-3xl p-6 h-full"
                  style={{
                    background: 'var(--surface-strong)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--glow-card)',
                  }}
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `${card.color}18` }}>
                    {card.icon}
                  </div>
                  <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--ink)' }}>{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{card.body}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 px-4 py-16" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto">
          <FadeSection>
            <h2 className="text-center font-extrabold text-2xl tracking-tight mb-10" style={{ color: 'var(--ink)' }}>
              How It Works
            </h2>
          </FadeSection>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', emoji: '🔗', title: 'Connect', body: 'Connect your wallet in one click. MetaMask, Coinbase Wallet, and WalletConnect all work.' },
              { step: '2', emoji: '💧', title: 'Claim Tokens', body: 'Visit the Faucet tab and get free USDC and EURC on Arc Testnet from the Circle Faucet.' },
              { step: '3', emoji: '🔄', title: 'Swap', body: 'Pick your tokens, set slippage, review the quote, and swap. Earn Leaf Points instantly.' },
            ].map((item, i) => (
              <FadeSection key={item.step} delay={i * 120}>
                <div className="flex flex-col items-center text-center gap-4">
                  <div
                    className="w-14 h-14 rounded-3xl flex items-center justify-center text-2xl font-extrabold"
                    style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', boxShadow: 'var(--glow-card)' }}
                  >
                    {item.emoji}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm mb-1" style={{ color: 'var(--accent)' }}>Step {item.step}</div>
                    <h3 className="font-extrabold text-base mb-1" style={{ color: 'var(--ink)' }}>{item.title}</h3>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{item.body}</p>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leaf Points promo ── */}
      <section className="relative z-10 px-4 py-16" style={{ borderTop: '1px solid var(--border)' }}>
        <FadeSection>
          <div className="max-w-2xl mx-auto rounded-3xl p-8 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(15,157,107,0.18) 0%, rgba(20,184,166,0.10) 100%)', border: '1px solid rgba(15,157,107,0.25)' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="font-extrabold text-2xl tracking-tight mb-3" style={{ color: 'var(--ink)' }}>Earn Leaf Points</h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
              Every swap, liquidity deposit, and faucet claim earns leaves. Complete quests to level up
              from <strong style={{ color: 'var(--ink-2)' }}>Seed</strong> all the way to <strong style={{ color: 'var(--accent)' }}>Forest</strong>.
              Top wallets appear on the leaderboard.
            </p>
            <div className="flex justify-center gap-4 text-2xl mb-6">
              {['🌱', '🌿', '🌲', '🌳', '🏕️'].map((e, i) => (
                <span key={i} title={['Seed','Sprout','Sapling','Tree','Forest'][i]}>{e}</span>
              ))}
            </div>
            <button
              onClick={onLaunch}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base font-extrabold"
            >
              Start Earning <Leaf size={18} />
            </button>
          </div>
        </FadeSection>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 px-6 py-8" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="13" fill="#0F9D6B"/>
              <path d="M24 13 C19.5 17.5 17.5 22 19.5 26.5 C21.5 31 27.5 31 29.5 26.5 C31.5 22 28 15.5 24 13Z" fill="white" opacity="0.95"/>
            </svg>
            <span className="font-extrabold text-sm" style={{ color: 'var(--ink)' }}>Eco<span style={{ color: 'var(--accent)' }}>Swap</span></span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>— Arc Testnet prototype</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter"
              className="hover:opacity-70 transition-opacity" style={{ color: 'var(--subtle)' }}>
              <Twitter size={16} />
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord"
              className="hover:opacity-70 transition-opacity" style={{ color: 'var(--subtle)' }}>
              <MessageCircle size={16} />
            </a>
            <a href="https://explorer.testnet.arc.io" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: 'var(--subtle)' }}>
              Explorer <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
