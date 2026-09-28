import { useRef } from 'react';
import { X, Twitter, Download, Leaf, ExternalLink } from 'lucide-react';
import { markQuestComplete, getCompletedQuestIds } from '@/hooks/useQuests';

export interface ShareSwapData {
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: string;
  amountOut: string;
  leavesEarned: number;
  txHash?: string;
}

interface ShareSwapModalProps {
  data: ShareSwapData;
  onClose: () => void;
}

export default function ShareSwapModal({ data, onClose }: ShareSwapModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const xText = encodeURIComponent(
    `Just swapped ${data.amountIn} ${data.tokenInSymbol} → ${data.amountOut} ${data.tokenOutSymbol} on EcoSwap 🌿\n\nBuilt on @arc — gas paid in USDC. Earned ${data.leavesEarned} 🍃 leaves!\n\nTry it: https://ecoswap.netlify.app\n\n#EcoSwap #Arc #DeFi`,
  );
  const xUrl = `https://x.com/intent/post?text=${xText}`;

  const handleDownload = () => {
    const card = cardRef.current;
    if (!card) return;
    // Graceful fallback — html2canvas not bundled; users can screenshot instead
    alert('Screenshot the card to save it, or use the Post on X button to share!');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden page-enter"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-elevated)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--ink)' }}>Share Your Swap</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Shareable card */}
        <div className="px-5 pb-5">
          <div
            ref={cardRef}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #07110F 0%, #0B2018 50%, #0D1A2B 100%)',
              border: '1px solid rgba(15,157,107,0.35)',
            }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="flex items-center gap-2 mb-5">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="21" stroke="rgba(20,184,166,0.3)" strokeWidth="1.5" />
                <path d="M24 3 A21 21 0 0 1 45 24" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <polygon points="45,24 40.5,17.5 40.5,30.5" fill="#14B8A6"/>
                <path d="M24 45 A21 21 0 0 1 3 24" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <polygon points="3,24 7.5,17.5 7.5,30.5" fill="#14B8A6"/>
                <circle cx="24" cy="24" r="13" fill="#0F9D6B"/>
                <path d="M24 13 C19.5 17.5 17.5 22 19.5 26.5 C21.5 31 27.5 31 29.5 26.5 C31.5 22 28 15.5 24 13Z" fill="white" opacity="0.95"/>
                <line x1="24" y1="13" x2="24" y2="30" stroke="#0D8A5D" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
              <span className="font-extrabold text-base" style={{ color: '#fff' }}>
                Eco<span style={{ color: '#0F9D6B' }}>Swap</span>
              </span>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                TESTNET
              </span>
            </div>

            <div className="space-y-1 mb-5">
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Swapped</div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-extrabold tabular" style={{ color: '#fff', fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
                    {parseFloat(data.amountIn).toFixed(4)}
                  </div>
                  <div className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{data.tokenInSymbol}</div>
                </div>
                <div style={{ color: '#14B8A6', fontSize: 22 }}>→</div>
                <div>
                  <div className="font-extrabold tabular" style={{ color: '#0F9D6B', fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
                    {parseFloat(data.amountOut).toFixed(4)}
                  </div>
                  <div className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{data.tokenOutSymbol}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(15,157,107,0.15)', border: '1px solid rgba(15,157,107,0.2)' }}>
              <Leaf size={14} style={{ color: '#0F9D6B' }} />
              <span className="text-sm font-bold" style={{ color: '#0F9D6B' }}>+{data.leavesEarned} leaves earned</span>
            </div>

            <div className="mt-3 text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              ecoswap.netlify.app • Arc Testnet
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <a
              href={xUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-85"
              style={{ background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
              onClick={() => {
                if (!getCompletedQuestIds().includes('share_swap')) markQuestComplete('share_swap');
              }}
            >
              <Twitter size={16} />
              Post on X
            </a>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}
              title="Screenshot to save"
            >
              <Download size={16} />
            </button>
          </div>

          {data.txHash && (
            <a
              href={`https://explorer.testnet.arc.io/tx/${data.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs"
              style={{ color: 'var(--muted)' }}
            >
              View on explorer <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
