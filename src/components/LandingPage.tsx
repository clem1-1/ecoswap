import { useEffect, useRef, useState } from 'react';
import { LogoMark, LogoWordmark } from './Logo';
import { ArrowRight, ExternalLink, Twitter, MessageCircle, Zap, Shield, Layers } from 'lucide-react';

/* ─────────────────────────────────────────────
   Scroll-triggered fade-up
───────────────────────────────────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Fade({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Ticker tape — protocol names scrolling
───────────────────────────────────────────── */
const TICKER_ITEMS = [
  'EcoSwap AMM', 'Uniswap V2', 'Uniswap V3', 'XyloNet StableSwap',
  'UnitFlow V3', 'CCTP Bridge', 'Live Price Feeds', 'Arc Testnet',
];

function TickerTape() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="relative overflow-hidden py-3" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div
        className="flex gap-8 whitespace-nowrap"
        style={{ animation: 'ticker 28s linear infinite', display: 'inline-flex' }}
      >
        {items.map((name, i) => (
          <span key={i} className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <span className="w-1 h-1 rounded-full inline-block" style={{ background: 'var(--accent)', opacity: 0.6 }} />
            {name}
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Feature card
───────────────────────────────────────────── */
function FeatureCard({ icon, title, body, delay }: { icon: React.ReactNode; title: string; body: string; delay: number }) {
  return (
    <Fade delay={delay}>
      <div
        className="rounded-2xl p-6 h-full flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--surface-input)', border: '1px solid var(--border-strong)' }}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-[15px] mb-1.5" style={{ color: 'var(--ink)' }}>{title}</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
        </div>
      </div>
    </Fade>
  );
}

/* ─────────────────────────────────────────────
   Step row
───────────────────────────────────────────── */
function StepRow({ num, title, body, delay }: { num: string; title: string; body: string; delay: number }) {
  return (
    <Fade delay={delay} className="flex items-start gap-5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
        style={{ background: 'var(--grad-btn)', color: '#fff' }}
      >
        {num}
      </div>
      <div className="pt-0.5">
        <div className="font-bold text-[15px] mb-1" style={{ color: 'var(--ink)' }}>{title}</div>
        <div className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</div>
      </div>
    </Fade>
  );
}

/* ─────────────────────────────────────────────
   Main
───────────────────────────────────────────── */
interface LandingPageProps {
  onLaunch: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Single centered radial glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(15,157,107,0.12) 0%, rgba(20,184,166,0.05) 50%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Nav bar ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size={40} />
          <LogoWordmark size={22} />
        </div>
        <div className="flex items-center gap-3">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)', color: '#F59E0B' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: '#F59E0B' }} />
            Testnet
          </span>
          <button
            onClick={onLaunch}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--grad-btn)', color: '#fff', boxShadow: 'var(--shadow-btn)' }}
          >
            Launch App
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-20 text-center">

        {/* Eyebrow */}
        <Fade>
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--muted)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
            Built on Arc · USDC as native gas
          </div>
        </Fade>

        {/* Headline */}
        <Fade delay={80}>
          <h1
            className="font-extrabold tracking-tight leading-[1.08]"
            style={{
              color: 'var(--ink)',
              fontSize: 'clamp(2.4rem, 7vw, 4.5rem)',
              maxWidth: 720,
              letterSpacing: '-0.03em',
            }}
          >
            The Best Rate.<br />
            <span style={{
              background: 'linear-gradient(90deg, #0F9D6B 0%, #14B8A6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Every Swap.
            </span>
          </h1>
        </Fade>

        {/* Sub */}
        <Fade delay={160}>
          <p
            className="mt-5 text-base leading-relaxed"
            style={{ color: 'var(--muted)', maxWidth: 460 }}
          >
            EcoSwap routes across EcoSwap AMM, Uniswap, XyloNet, and more — always finding
            the best price on Arc Testnet. Fees paid entirely in USDC.
          </p>
        </Fade>

        {/* CTAs */}
        <Fade delay={240}>
          <div className="mt-9 flex flex-wrap gap-3 justify-center">
            <button
              onClick={onLaunch}
              className="btn-primary flex items-center gap-2 px-7 py-3.5 text-[15px] font-bold"
            >
              Launch App <ArrowRight size={16} />
            </button>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[15px] font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--bg-elevated)', color: 'var(--ink-2)', border: '1px solid var(--border-strong)' }}
            >
              Get Testnet USDC <ExternalLink size={14} />
            </a>
          </div>
        </Fade>

        {/* Protocol logos row */}
        <Fade delay={320}>
          <div className="mt-12 flex flex-wrap gap-2 justify-center">
            {[
              { name: 'EcoSwap AMM', color: '#0F9D6B' },
              { name: 'Uniswap V2 / V3', color: '#FF007A' },
              { name: 'XyloNet Stable', color: '#6366F1' },
              { name: 'CCTP Bridge', color: '#2775CA' },
              { name: 'Live Price Feeds', color: '#E6B800' },
            ].map((p) => (
              <span
                key={p.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                style={{ background: `${p.color}12`, border: `1px solid ${p.color}28`, color: p.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.color }} />
                {p.name}
              </span>
            ))}
          </div>
        </Fade>
      </section>

      {/* ── Ticker ── */}
      <div className="relative z-10">
        <TickerTape />
      </div>

      {/* ── Feature grid ── */}
      <section className="relative z-10 px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <Fade>
            <p className="text-center text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
              Why EcoSwap
            </p>
            <h2 className="text-center font-extrabold text-2xl tracking-tight mb-10" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              DEX infrastructure for Arc
            </h2>
          </Fade>
          <div className="grid sm:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Zap size={18} style={{ color: 'var(--accent-teal)' }} />}
              title="Best-Price Routing"
              body="Queries EcoSwap, Uniswap V2/V3, XyloNet, and UnitFlow simultaneously. You always execute on the cheapest path."
              delay={0}
            />
            <FeatureCard
              icon={<Shield size={18} style={{ color: 'var(--accent)' }} />}
              title="USDC-Native Gas"
              body="Arc charges gas in USDC — no volatile gas token, no estimating. Predictable fees on every transaction."
              delay={80}
            />
            <FeatureCard
              icon={<Layers size={18} style={{ color: '#A78BFA' }} />}
              title="15-Chain Bridge"
              body="Instantly bridge USDC and EURC to Ethereum, Base, Arbitrum, Solana, and 11 more via Circle CCTP V2."
              delay={160}
            />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 px-4 py-20" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto">
          <Fade>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
              Get started
            </p>
            <h2 className="font-extrabold text-2xl tracking-tight mb-10" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              Three steps, under a minute
            </h2>
          </Fade>
          <div className="flex flex-col gap-7">
            <StepRow num="1" title="Connect your wallet" body="MetaMask, Coinbase Wallet, or any WalletConnect-compatible wallet. One click." delay={0} />
            <StepRow num="2" title="Get test USDC" body="Use the built-in faucet or visit faucet.circle.com to get free USDC and EURC on Arc Testnet." delay={80} />
            <StepRow num="3" title="Swap or bridge" body="Pick tokens, see routes ranked by rate, and execute. Earn Leaf Points on every action." delay={160} />
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="relative z-10 px-4 py-20">
        <Fade>
          <div
            className="max-w-2xl mx-auto rounded-3xl p-10 text-center relative overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
            }}
          >
            {/* Corner glow */}
            <div aria-hidden="true" style={{
              position: 'absolute', top: -60, right: -60, width: 200, height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(20,184,166,0.14) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div className="flex justify-center mb-6">
              <LogoMark size={96} />
            </div>
            <h2 className="font-extrabold text-2xl tracking-tight mb-3" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              Ready to swap?
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--muted)', maxWidth: 340, margin: '0 auto 2rem' }}>
              EcoSwap is live on Arc Testnet. Connect a wallet and start in seconds — tokens have no real-world value.
            </p>
            <button
              onClick={onLaunch}
              className="btn-primary inline-flex items-center gap-2.5 px-8 py-4 text-base font-bold"
            >
              Open EcoSwap <ArrowRight size={18} />
            </button>
          </div>
        </Fade>
      </section>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-6"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <LogoWordmark size={15} />
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>· Arc Testnet</span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="https://x.com/EcoSwapDEX"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted)' }}
          >
            <Twitter size={12} /> @EcoSwapDEX
          </a>
          <a
            href="https://discord.gg/ecoswap"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted)' }}
          >
            <MessageCircle size={12} /> Discord
          </a>
          <a
            href="https://explorer.testnet.arc.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted)' }}
          >
            Explorer <ExternalLink size={10} />
          </a>
        </div>
      </footer>
    </div>
  );
}
