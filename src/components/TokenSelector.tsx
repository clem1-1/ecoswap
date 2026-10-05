import { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, X, ChevronDown, Star } from 'lucide-react';
import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { FEATURED_TOKENS, type Token } from '@/constants/tokens';
import { ARC_TESTNET_CHAIN_ID, useTokenBalance, formatTokenAmount } from '@/hooks/useEcoSwap';

/* ── Token Icon — real logo with gradient-circle fallback ── */
export function TokenIcon({ token, size = 32 }: { token: Token; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);

  const colors: Record<string, string[]> = {
    USDC: ['#2775CA', '#1A56DB'],
    EURC: ['#0052B4', '#003f8a'],
    USYC: ['#7C3AED', '#5B21B6'],
  };
  const pair = colors[token.symbol] ?? [token.color ?? '#3D5C50', '#14B8A6'];
  const label = token.symbol.slice(0, 1).toUpperCase();

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    flexGrow: 0,
    position: 'relative',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Show real logo if available and not broken
  if (token.logoURI && !imgFailed) {
    return (
      <div aria-label={token.symbol} style={{ ...containerStyle, background: 'transparent' }}>
        <img
          src={token.logoURI}
          alt={token.symbol}
          width={size}
          height={size}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  // Fallback: gradient circle with first letter
  return (
    <div
      aria-label={token.symbol}
      style={{
        ...containerStyle,
        background: `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`,
        boxShadow: `0 2px 8px ${pair[0]}40`,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.42,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        fontFamily: 'inherit',
        display: 'block',
      }}>
        {label}
      </span>
    </div>
  );
}

/* ── Token Row in list ── */
function TokenRow({
  token, userAddress, selected, onSelect, onClose,
}: {
  token: Token;
  userAddress?: `0x${string}`;
  selected: boolean;
  onSelect: (t: Token) => void;
  onClose: () => void;
}) {
  const { balance } = useTokenBalance(token.address, userAddress);
  return (
    <button
      onClick={() => { saveRecent(token); onSelect(token); onClose(); }}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all table-row-hover"
      style={{
        background: selected ? 'var(--surface-hover)' : 'transparent',
        border: selected ? '1px solid var(--border-strong)' : '1px solid transparent',
      }}
    >
      <TokenIcon token={token} size={38} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{token.symbol}</span>
          {token.verified && (
            <Star size={10} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} aria-label="Verified" />
          )}
          {!token.verified && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              Unverified
            </span>
          )}
        </div>
        <div className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>{token.name}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold tabular" style={{ color: 'var(--ink-2)' }}>
          {userAddress ? (balance !== undefined ? formatTokenAmount(balance, token.decimals, 4) : '—') : ''}
        </div>
        {selected && (
          <div className="flex justify-end mt-1">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
          </div>
        )}
      </div>
    </button>
  );
}

/* ── Custom token loader (ERC-20 read from address) ── */
function CustomTokenLoader({
  address, userAddress, onLoad, onSelect, onClose,
}: {
  address: string;
  userAddress?: `0x${string}`;
  onLoad: (t: Token) => void;
  onSelect: (t: Token) => void;
  onClose: () => void;
}) {
  const { data: symbol } = useReadContract({ address: address as `0x${string}`, abi: erc20Abi, functionName: 'symbol', chainId: ARC_TESTNET_CHAIN_ID });
  const { data: name }   = useReadContract({ address: address as `0x${string}`, abi: erc20Abi, functionName: 'name', chainId: ARC_TESTNET_CHAIN_ID });
  const { data: decimals } = useReadContract({ address: address as `0x${string}`, abi: erc20Abi, functionName: 'decimals', chainId: ARC_TESTNET_CHAIN_ID });

  const handleLoad = useCallback((t: Token) => onLoad(t), [onLoad]);

  useEffect(() => {
    if (symbol && name && decimals !== undefined) {
      handleLoad({ address, symbol, name, decimals, verified: false });
    }
  }, [symbol, name, decimals, address, handleLoad]);

  if (!symbol) {
    return (
      <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--muted)' }}>
        {name === undefined && symbol === undefined
          ? <><span className="skeleton inline-block w-32 h-4 rounded" /></>
          : 'Token not found on Arc Testnet.'}
      </div>
    );
  }

  const token: Token = { address, symbol, name: name ?? '', decimals: decimals ?? 18, verified: false };

  return (
    <div className="space-y-1">
      <div className="mx-1 px-3 py-2.5 rounded-2xl flex items-start gap-2"
        style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.18)' }}>
        <AlertTriangle size={12} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
        <span className="text-xs leading-relaxed" style={{ color: 'var(--warning)' }}>
          This token is <strong>not on the EcoSwap curated list</strong>. Anyone can create an ERC-20 token with any name. Trade with caution.
        </span>
      </div>
      <TokenRow token={token} userAddress={userAddress} selected={false} onSelect={onSelect} onClose={onClose} />
    </div>
  );
}

/* ── Modal ── */
interface TokenSelectorProps {
  selected?: Token;
  onSelect: (token: Token) => void;
  exclude?: Token;
  onClose: () => void;
  userAddress?: `0x${string}`;
}

// Persist up to 5 recently used tokens in localStorage
function loadRecents(): Token[] {
  try { return JSON.parse(localStorage.getItem('ecoswap_recent_tokens') ?? '[]') as Token[]; }
  catch { return []; }
}
function saveRecent(token: Token) {
  const prev = loadRecents().filter((t) => t.address.toLowerCase() !== token.address.toLowerCase());
  localStorage.setItem('ecoswap_recent_tokens', JSON.stringify([token, ...prev].slice(0, 5)));
}

export default function TokenSelector({ selected, onSelect, exclude, onClose, userAddress }: TokenSelectorProps) {
  const [query, setQuery] = useState('');
  const [customToken, setCustomToken] = useState<Token | null>(null);
  const [loadingAddress, setLoadingAddress] = useState('');
  const [recentTokens] = useState<Token[]>(() => loadRecents());

  const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

  const filtered = FEATURED_TOKENS.filter(
    (t) =>
      t.address.toLowerCase() !== exclude?.address.toLowerCase() &&
      (t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.address.toLowerCase().includes(query.toLowerCase())),
  );

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setCustomToken(null);
    if (isAddress(q) && !FEATURED_TOKENS.find((t) => t.address.toLowerCase() === q.toLowerCase())) {
      setLoadingAddress(q.toLowerCase());
    } else {
      setLoadingAddress('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[400px] overflow-hidden page-enter"
        style={{
          background: 'var(--surface-strong)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'clamp(0px, 4vw, 24px) clamp(0px, 4vw, 24px) 0 0',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-elevated)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--ink)' }}>Select Token</span>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="glass-input flex items-center gap-2.5 px-3.5 py-3">
            <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              placeholder="Search name, symbol, or paste address…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--ink)', fontFamily: 'inherit' }}
            />
            {query && (
              <button onClick={() => handleQueryChange('')} style={{ color: 'var(--muted)' }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 pb-6">
          {!loadingAddress && (
            <>
              {/* Recent tokens quick-pick row */}
              {recentTokens.length > 0 && !query && (
                <div className="px-2 pb-3 pt-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: 'var(--subtle)' }}>
                    Recent
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {recentTokens
                      .filter((t) => t.address.toLowerCase() !== exclude?.address.toLowerCase())
                      .slice(0, 4)
                      .map((t) => (
                        <button
                          key={t.address}
                          onClick={() => { saveRecent(t); onSelect(t); onClose(); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl transition-all hover:scale-105"
                          style={{
                            background: 'var(--surface-muted)',
                            border: '1px solid var(--border)',
                            color: 'var(--ink)',
                          }}
                        >
                          <TokenIcon token={t} size={18} />
                          <span className="text-xs font-bold">{t.symbol}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div className="px-2 pb-2 pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
                  ✦ Featured tokens
                </span>
              </div>
              {filtered.map((token) => (
                <TokenRow
                  key={token.address}
                  token={token}
                  userAddress={userAddress}
                  selected={selected?.address.toLowerCase() === token.address.toLowerCase()}
                  onSelect={onSelect}
                  onClose={onClose}
                />
              ))}
              {filtered.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                    No results. Try pasting a contract address.
                  </p>
                </div>
              )}
            </>
          )}

          {loadingAddress && (
            <>
              <div className="px-2 pb-2 pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
                  Custom token
                </span>
              </div>
              <CustomTokenLoader
                address={loadingAddress}
                userAddress={userAddress}
                onLoad={(t) => setCustomToken(t)}
                onSelect={onSelect}
                onClose={onClose}
              />
              {customToken && (
                <TokenRow token={customToken} userAddress={userAddress} selected={false} onSelect={onSelect} onClose={onClose} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Token Pill (compact, used in swap fields) ── */
export function TokenPill({ token, onClick }: { token: Token; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="token-pill"
      aria-label={`Select ${token.symbol}`}
    >
      <TokenIcon token={token} size={24} />
      <span className="font-extrabold text-sm tracking-tight" style={{ color: 'var(--ink)' }}>
        {token.symbol}
      </span>
      {!token.verified && (
        <AlertTriangle size={10} style={{ color: 'var(--warning)' }} />
      )}
      <ChevronDown size={13} style={{ color: 'var(--muted)' }} />
    </button>
  );
}
