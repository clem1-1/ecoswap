import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, Clock, Droplets, AlertTriangle } from 'lucide-react';
import { useAccount } from 'wagmi';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'ecoswap-faucet-last-claim';

function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* Circular countdown ring */
function CooldownRing({ remaining, total }: { remaining: number; total: number }) {
  const pct = 1 - remaining / total;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[-90deg]">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke="var(--accent-teal)"
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Clock size={14} style={{ color: 'var(--muted)' }} />
        <span className="text-xs font-bold tabular mt-0.5" style={{ color: 'var(--ink-2)' }}>
          {formatTime(remaining)}
        </span>
      </div>
    </div>
  );
}

export default function FaucetPage() {
  const { address } = useAccount();
  const [lastClaim, setLastClaim] = useState<number | null>(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? parseInt(v, 10) : null;
  });
  const [claimed, setClaimed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = lastClaim ? Math.max(0, COOLDOWN_MS - (now - lastClaim)) : 0;
  const canClaim = remaining === 0;

  const handleClaim = () => {
    if (!canClaim) return;
    const ts = Date.now();
    localStorage.setItem(STORAGE_KEY, String(ts));
    setLastClaim(ts);
    setClaimed(true);
    window.open('https://faucet.circle.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full space-y-5">
      {/* Hero */}
      <div className="text-center pt-2 pb-1">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 relative"
          style={{
            background: 'radial-gradient(circle at 40% 40%, rgba(15,157,107,0.25), rgba(20,184,166,0.10))',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 0 32px rgba(15,157,107,0.20)',
          }}
        >
          <Droplets size={34} style={{ color: 'var(--accent)' }} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            ✦
          </span>
        </div>
        <h2 className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>
          Testnet Faucet
        </h2>
        <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>
          Get free USDC &amp; EURC to test EcoSwap on Arc Testnet
        </p>
      </div>

      {/* Testnet notice */}
      <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
        style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.18)' }}>
        <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs font-medium" style={{ color: 'var(--warning)' }}>
          Testnet tokens have <strong>no real value</strong> and cannot be used on mainnet.
        </p>
      </div>

      {/* Cooldown ring or available tokens */}
      {!canClaim && lastClaim ? (
        <div className="rounded-3xl p-6 text-center"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--muted)' }}>
            Next claim available in
          </p>
          <CooldownRing remaining={remaining} total={COOLDOWN_MS} />
          <p className="text-xs mt-3" style={{ color: 'var(--subtle)' }}>
            You claimed recently — come back tomorrow!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {[
            { symbol: 'USDC', name: 'USD Coin', color: '#2775CA', note: 'Used for gas + swaps on Arc' },
            { symbol: 'EURC', name: 'Euro Coin', color: '#1A56DB', note: 'Euro stablecoin' },
          ].map((t) => (
            <div key={t.symbol}
              className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                style={{ background: t.color, boxShadow: `0 2px 12px ${t.color}40` }}
              >
                {t.symbol.slice(0, 3)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{t.symbol}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{t.note}</div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.18)' }}>
                Available
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Success state */}
      {claimed && (
        <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
          style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.18)' }}>
          <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>Faucet opened 🌿</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Paste your address on Circle Faucet and pick Arc Testnet.</p>
          </div>
        </div>
      )}

      {/* Claim button */}
      <button
        onClick={handleClaim}
        disabled={!canClaim || !address}
        className="btn-primary w-full py-4 flex items-center justify-center gap-2.5"
        style={{ borderRadius: 'var(--radius-btn)', fontSize: 15, fontWeight: 700 }}
      >
        <Droplets size={17} />
        {!address
          ? 'Connect Wallet First'
          : !canClaim
          ? `Cooldown — ${formatTime(remaining)}`
          : 'Claim Testnet Tokens'}
        <ExternalLink size={14} />
      </button>

      {/* Wallet address display */}
      {address && (
        <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
          Claiming for:{' '}
          <span className="font-mono tabular font-semibold" style={{ color: 'var(--ink-2)' }}>
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
        </p>
      )}

      {/* How it works */}
      <div className="rounded-2xl px-4 py-4 space-y-2"
        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-extrabold uppercase tracking-wide mb-3" style={{ color: 'var(--ink-2)' }}>
          How it works
        </p>
        <ol className="space-y-2.5">
          {[
            'Connect your wallet above',
            'Click "Claim Testnet Tokens" — Circle Faucet opens',
            'Paste your wallet address and select Arc Testnet',
            'Tokens arrive in about 10 seconds',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(15,157,107,0.12)', color: 'var(--accent)' }}
              >{i + 1}</span>
              <span className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <a
        href="https://faucet.circle.com"
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs py-1 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--muted)' }}
      >
        Open Circle Faucet directly <ExternalLink size={10} />
      </a>
    </div>
  );
}
