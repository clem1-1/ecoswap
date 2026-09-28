import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Leaf, Trophy, Clock, Star, ChevronRight } from 'lucide-react';
import { useLeafPoints, getLeaderboard } from '@/hooks/useLeafPoints';
import { getLevel, getNextLevel, getLevelProgress, LEVELS } from '@/constants/leafPoints';

/* ── Tree illustration that grows with level ── */
function TreeIllustration({ level }: { level: number }) {
  // levels 0–4, tree gets bigger and greener
  const stages = [
    // Seed
    <svg key={0} viewBox="0 0 80 80" width={80} height={80}>
      <ellipse cx="40" cy="65" rx="18" ry="4" fill="rgba(15,157,107,0.15)" />
      <ellipse cx="40" cy="55" rx="8" ry="6" fill="#0F9D6B" opacity="0.7" />
      <line x1="40" y1="62" x2="40" y2="70" stroke="#6B4226" strokeWidth="2.5" strokeLinecap="round" />
    </svg>,
    // Sprout
    <svg key={1} viewBox="0 0 80 80" width={80} height={80}>
      <ellipse cx="40" cy="70" rx="22" ry="4" fill="rgba(15,157,107,0.15)" />
      <line x1="40" y1="45" x2="40" y2="72" stroke="#6B4226" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="32" cy="52" rx="9" ry="6" fill="#4ADE80" transform="rotate(-30 32 52)" />
      <ellipse cx="48" cy="52" rx="9" ry="6" fill="#22C55E" transform="rotate(30 48 52)" />
      <ellipse cx="40" cy="44" rx="10" ry="8" fill="#16A34A" />
    </svg>,
    // Sapling
    <svg key={2} viewBox="0 0 80 80" width={80} height={80}>
      <ellipse cx="40" cy="72" rx="26" ry="5" fill="rgba(15,157,107,0.2)" />
      <line x1="40" y1="36" x2="40" y2="74" stroke="#6B4226" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="60" x2="28" y2="52" stroke="#6B4226" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="40" y1="54" x2="52" y2="46" stroke="#6B4226" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="24" cy="48" rx="12" ry="9" fill="#4ADE80" />
      <ellipse cx="54" cy="42" rx="12" ry="9" fill="#22C55E" />
      <ellipse cx="40" cy="34" rx="16" ry="12" fill="#16A34A" />
    </svg>,
    // Tree
    <svg key={3} viewBox="0 0 80 80" width={80} height={80}>
      <ellipse cx="40" cy="74" rx="28" ry="5" fill="rgba(15,157,107,0.25)" />
      <line x1="40" y1="28" x2="40" y2="76" stroke="#5C3317" strokeWidth="5" strokeLinecap="round" />
      <line x1="40" y1="56" x2="24" y2="46" stroke="#5C3317" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="48" x2="56" y2="38" stroke="#5C3317" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="20" cy="42" rx="14" ry="11" fill="#4ADE80" />
      <ellipse cx="58" cy="34" rx="14" ry="11" fill="#22C55E" />
      <ellipse cx="40" cy="26" rx="20" ry="16" fill="#16A34A" />
      <ellipse cx="40" cy="20" rx="14" ry="11" fill="#0F9D6B" />
    </svg>,
    // Forest
    <svg key={4} viewBox="0 0 80 80" width={80} height={80}>
      <ellipse cx="40" cy="75" rx="34" ry="5" fill="rgba(15,157,107,0.3)" />
      {/* left small tree */}
      <line x1="16" y1="50" x2="16" y2="76" stroke="#5C3317" strokeWidth="3" />
      <ellipse cx="16" cy="44" rx="10" ry="8" fill="#22C55E" />
      {/* right small tree */}
      <line x1="64" y1="50" x2="64" y2="76" stroke="#5C3317" strokeWidth="3" />
      <ellipse cx="64" cy="44" rx="10" ry="8" fill="#16A34A" />
      {/* main tree */}
      <line x1="40" y1="24" x2="40" y2="76" stroke="#5C3317" strokeWidth="5" strokeLinecap="round" />
      <line x1="40" y1="54" x2="24" y2="44" stroke="#5C3317" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="44" x2="56" y2="34" stroke="#5C3317" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="18" cy="38" rx="14" ry="11" fill="#4ADE80" />
      <ellipse cx="60" cy="30" rx="14" ry="11" fill="#22C55E" />
      <ellipse cx="40" cy="22" rx="20" ry="16" fill="#16A34A" />
      <ellipse cx="40" cy="13" rx="15" ry="12" fill="#0F9D6B" />
      <ellipse cx="40" cy="7" rx="9" ry="7" fill="#14B8A6" />
    </svg>,
  ];
  return <div className="flex justify-center">{stages[Math.min(level, 4)]}</div>;
}

type RewardsTab = 'overview' | 'history' | 'leaderboard';

export default function RewardsPage() {
  const { address, isConnected } = useAccount();
  const store = useLeafPoints(address);
  const [activeTab, setActiveTab] = useState<RewardsTab>('overview');

  const level = getLevel(store.total);
  const nextLevel = getNextLevel(store.total);
  const progress = getLevelProgress(store.total);
  const leaderboard = getLeaderboard();

  if (!isConnected) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-5xl mb-2">🌱</div>
        <h2 className="font-extrabold text-xl" style={{ color: 'var(--ink)' }}>Leaf Points</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Connect your wallet to start earning leaves for every action on EcoSwap.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        {(['overview', 'history', 'leaderboard'] as RewardsTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
            style={{
              background: activeTab === t ? 'var(--surface-strong)' : 'transparent',
              color: activeTab === t ? 'var(--ink)' : 'var(--muted)',
              boxShadow: activeTab === t ? 'var(--glow-card)' : 'none',
            }}
          >{t}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Summary card */}
          <div
            className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15,157,107,0.18) 0%, rgba(20,184,166,0.12) 100%)',
              border: '1px solid rgba(15,157,107,0.25)',
            }}
          >
            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <TreeIllustration level={level.id} />

            <div className="mt-4">
              <div className="text-5xl font-extrabold tabular tracking-tight" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                {store.total.toLocaleString()}
              </div>
              <div className="text-sm font-semibold mt-1 flex items-center justify-center gap-1.5" style={{ color: 'var(--ink-2)' }}>
                <Leaf size={14} style={{ color: 'var(--accent)' }} />
                Leaves
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-2xl">{level.emoji}</span>
              <span className="font-extrabold text-lg tracking-tight" style={{ color: level.color }}>{level.name}</span>
            </div>

            {nextLevel && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
                  <span>{level.name}</span>
                  <span>{nextLevel.name} — {nextLevel.minLeaves} leaves</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: 'var(--grad-btn)' }}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {nextLevel.minLeaves - store.total} leaves to {nextLevel.name}
                </p>
              </div>
            )}

            {!nextLevel && (
              <div className="mt-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--grad-btn)', color: '#fff' }}>
                  Max Level Reached 🏕️
                </span>
              </div>
            )}
          </div>

          {/* All levels */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {LEVELS.map((l, i) => {
              const isCurrentLevel = l.id === level.id;
              const isUnlocked = store.total >= l.minLeaves;
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: isCurrentLevel ? 'rgba(15,157,107,0.08)' : 'transparent',
                    borderBottom: i < LEVELS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span className="text-xl w-8 text-center">{l.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm flex items-center gap-2" style={{ color: isUnlocked ? l.color : 'var(--subtle)' }}>
                      {l.name}
                      {isCurrentLevel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{l.minLeaves.toLocaleString()} leaves</div>
                  </div>
                  {isUnlocked && <Star size={14} style={{ color: l.color, fill: l.color }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {store.history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🌱</div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>No leaves earned yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Start swapping, adding liquidity, or claiming from the faucet!</p>
            </div>
          ) : (
            store.history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(15,157,107,0.12)' }}
                >
                  <Leaf size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{entry.label}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="font-extrabold tabular" style={{ color: 'var(--accent)' }}>+{entry.amount}</span>
                  <Leaf size={12} style={{ color: 'var(--accent)' }} />
                  {entry.bonus && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                      Bonus
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-2">
          <p className="text-xs px-1" style={{ color: 'var(--muted)' }}>
            Top wallets on this browser session (local storage). A backend leaderboard is flagged as a future upgrade.
          </p>
          {leaderboard.length === 0 ? (
            <div className="text-center py-10">
              <Trophy size={28} className="mx-auto mb-2" style={{ color: 'var(--subtle)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No entries yet — be the first!</p>
            </div>
          ) : (
            leaderboard.map((entry, i) => {
              const lv = getLevel(entry.total);
              const isSelf = address?.toLowerCase() === entry.address.toLowerCase();
              return (
                <div
                  key={entry.address}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{
                    background: isSelf ? 'rgba(15,157,107,0.1)' : 'var(--surface-muted)',
                    border: isSelf ? '1px solid rgba(15,157,107,0.3)' : '1px solid var(--border)',
                  }}
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                    style={{ background: i < 3 ? ['#FFD700','#C0C0C0','#CD7F32'][i] : 'var(--surface-hover)', color: i < 3 ? '#000' : 'var(--muted)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold" style={{ color: isSelf ? 'var(--accent)' : 'var(--ink)' }}>
                        {entry.address.slice(0, 6)}…{entry.address.slice(-4)}
                      </span>
                      {isSelf && <span className="text-[10px] font-bold px-1 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>You</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{lv.emoji} {lv.name}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="font-extrabold tabular text-sm" style={{ color: 'var(--accent)' }}>
                      {entry.total.toLocaleString()}
                    </span>
                    <Leaf size={12} style={{ color: 'var(--accent)' }} />
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--subtle)' }} />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        <div className="flex items-start gap-2">
          <Clock size={13} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--ink-2)' }}>Storage: localStorage</strong> — points are stored locally per wallet address.
            Leaves are only awarded after transactions are confirmed on-chain. A backend leaderboard syncing across devices is planned.
          </p>
        </div>
      </div>
    </div>
  );
}
