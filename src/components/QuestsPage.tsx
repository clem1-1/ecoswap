import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle2, Leaf, Trophy } from 'lucide-react';
import { useQuests, markQuestComplete, getCompletedQuestIds } from '@/hooks/useQuests';
import { awardQuestLeaves } from '@/hooks/useLeafPoints';
import { useActivity } from '@/hooks/useActivity';
import { useTheme } from '@/hooks/useTheme';

const FAUCET_KEY = 'ecoswap-faucet-last-claim';

/* ── Leaf particle burst ── */
// Pre-compute particles at module level to avoid Math.random during render
const BURST_PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * 360;
  const dist = 40 + (i % 3) * 10; // deterministic, no Math.random
  const tx = Math.cos((angle * Math.PI) / 180) * dist;
  const ty = Math.sin((angle * Math.PI) / 180) * dist;
  return { tx, ty, delay: i * 40, key: i };
});

function LeafBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = BURST_PARTICLES;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-50" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.key}
          style={{
            position: 'absolute',
            fontSize: '16px',
            animation: `leafBurst 600ms ease-out ${p.delay}ms forwards`,
            ['--tx' as string]: `${p.tx}px`,
            ['--ty' as string]: `${p.ty}px`,
          }}
        >🍃</span>
      ))}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  onboarding:  'var(--accent-teal)',
  trading:     'var(--accent)',
  liquidity:   '#818CF8',
  exploration: 'var(--warning)',
  social:      '#F472B6',
};

export default function QuestsPage({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { address, isConnected } = useAccount();
  const { items } = useActivity();
  const { theme } = useTheme();
  const [faucetClaimed] = useState(() => Boolean(localStorage.getItem(FAUCET_KEY)));
  const [completedIds, setCompletedIds] = useState<string[]>(() => getCompletedQuestIds());
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const quests = useQuests({
    isConnected,
    activityItems: items,
    theme,
    faucetClaimed,
  });

  const totalCompleted = quests.filter((q) => q.status === 'completed').length;
  const overallProgress = Math.round((totalCompleted / quests.length) * 100);

  // Auto-award leaves when quest becomes completed for the first time
  const prevCompleted = completedIds;
  const handleAutoComplete = useCallback(() => {
    if (!address) return;
    quests.forEach((q) => {
      if (q.status === 'completed' && !prevCompleted.includes(q.id)) {
        markQuestComplete(q.id);
        awardQuestLeaves(address, q.id, `Quest: ${q.title}`, q.leafReward);
        setCelebrating(q.id);
        setCompletedIds(getCompletedQuestIds());
        setTimeout(() => setCelebrating(null), 1200);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quests, address]);

  useEffect(() => { handleAutoComplete(); }, [handleAutoComplete]);

  // Poll every 3s to pick up theme toggle / share completions
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const nextQuest = quests.find((q) => q.status === 'not_started');

  if (!isConnected) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-5xl mb-2">🗺️</div>
        <h2 className="font-extrabold text-xl" style={{ color: 'var(--ink)' }}>Testnet Quests</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Connect your wallet to track quest progress and earn Leaf Points.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <style>{`
        @keyframes leafBurst {
          0%   { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.4); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>Quests</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {totalCompleted}/{quests.length} completed
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl" style={{ background: 'rgba(15,157,107,0.12)', border: '1px solid rgba(15,157,107,0.2)' }}>
          <Trophy size={14} style={{ color: 'var(--accent)' }} />
          <span className="font-extrabold text-sm tabular" style={{ color: 'var(--accent)' }}>{totalCompleted}</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>done</span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${overallProgress}%`, background: 'var(--grad-btn)' }}
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{overallProgress}% complete</p>
      </div>

      {/* Next quest suggestion */}
      {nextQuest && (
        <div
          className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
          style={{ background: 'rgba(15,157,107,0.08)', border: '1px solid rgba(15,157,107,0.2)' }}
        >
          <span className="text-2xl">{nextQuest.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>Next Quest</p>
            <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{nextQuest.title}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{nextQuest.description}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="font-extrabold text-sm tabular" style={{ color: 'var(--accent)' }}>+{nextQuest.leafReward}</span>
            <Leaf size={13} style={{ color: 'var(--accent)' }} />
          </div>
        </div>
      )}

      {/* Quest cards by category */}
      {(['onboarding', 'trading', 'liquidity', 'exploration', 'social'] as const).map((cat) => {
        const catQuests = quests.filter((q) => q.category === cat);
        if (catQuests.length === 0) return null;
        const catLabel: Record<string, string> = {
          onboarding: '🚀 Getting Started',
          trading: '🔄 Trading',
          liquidity: '💧 Liquidity',
          exploration: '🎨 Exploration',
          social: '🐦 Social',
        };
        return (
          <div key={cat} className="space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-widest px-1" style={{ color: 'var(--subtle)' }}>
              {catLabel[cat]}
            </p>
            {catQuests.map((quest) => {
              const done = quest.status === 'completed';
              const isCelebrating = celebrating === quest.id;
              return (
                <div
                  key={quest.id}
                  className="relative rounded-2xl px-4 py-4 transition-all overflow-hidden"
                  style={{
                    background: done ? 'rgba(15,157,107,0.08)' : 'var(--surface-muted)',
                    border: done ? '1px solid rgba(15,157,107,0.25)' : '1px solid var(--border)',
                    opacity: 1,
                  }}
                >
                  <LeafBurst active={isCelebrating} />
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: done ? 'rgba(15,157,107,0.15)' : 'var(--surface-hover)' }}
                    >
                      {done ? '✅' : quest.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{quest.title}</span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${CATEGORY_COLORS[quest.category]}18`, color: CATEGORY_COLORS[quest.category] }}
                        >
                          {quest.category}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{quest.description}</p>

                      {/* Manual quest actions */}
                      {quest.id === 'try_other_theme' && !done && (
                        <button
                          className="mt-2 text-xs font-bold px-2 py-1 rounded-xl transition-all"
                          style={{ background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                          onClick={() => {
                            markQuestComplete('try_other_theme');
                            if (address) awardQuestLeaves(address, 'try_other_theme', 'Quest: Try the Other Theme', 5);
                            setCompletedIds(getCompletedQuestIds());
                            setCelebrating('try_other_theme');
                            setTimeout(() => setCelebrating(null), 1200);
                          }}
                        >
                          Mark as done (toggle theme first)
                        </button>
                      )}
                      {quest.id === 'share_swap' && !done && (
                        <button
                          className="mt-2 text-xs font-bold px-2 py-1 rounded-xl transition-all"
                          style={{ background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                          onClick={() => {
                            window.open('https://x.com/intent/post?text=Just+swapped+on+%23EcoSwap+on+%40arc+testnet+🌿+%7C+ecoswap.netlify.app', '_blank', 'noopener');
                            markQuestComplete('share_swap');
                            if (address) awardQuestLeaves(address, 'share_swap', 'Quest: Share Your Swap on X', 15);
                            setCompletedIds(getCompletedQuestIds());
                            setCelebrating('share_swap');
                            setTimeout(() => setCelebrating(null), 1200);
                          }}
                        >
                          Post on X →
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-sm tabular" style={{ color: done ? 'var(--accent)' : 'var(--muted)' }}>
                          {done ? '+' : ''}{quest.leafReward}
                        </span>
                        <Leaf size={13} style={{ color: done ? 'var(--accent)' : 'var(--muted)' }} />
                      </div>
                      {done && <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
