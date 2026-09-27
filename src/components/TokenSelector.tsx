import { useState, useEffect } from 'react';
import { Search, AlertTriangle, X } from 'lucide-react';
import { FEATURED_TOKENS, type Token } from '@/constants/tokens';
import { ARC_TESTNET_CHAIN_ID } from '@/hooks/useEcoSwap';
import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';

interface TokenSelectorProps {
  selected?: Token;
  onSelect: (token: Token) => void;
  exclude?: Token;
  onClose: () => void;
}

function TokenIcon({ token, size = 32 }: { token: Token; size?: number }) {
  const bg = token.color ?? '#6B6580';
  const label = token.symbol.slice(0, 3).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35, fontFamily: "'DM Sans', sans-serif" }}
    >
      {label}
    </div>
  );
}

function CustomTokenLoader({ address, onLoad }: { address: string; onLoad: (token: Token) => void }) {
  const { data: symbol } = useReadContract({
    address: address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'symbol',
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  const { data: name } = useReadContract({
    address: address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'name',
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  const { data: decimals } = useReadContract({
    address: address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
    chainId: ARC_TESTNET_CHAIN_ID,
  });

  useEffect(() => {
    if (symbol && name && decimals !== undefined) {
      onLoad({
        address,
        symbol: symbol,
        name: name,
        decimals: decimals,
        verified: false,
        color: '#6B6580',
      });
    }
  }, [symbol, name, decimals, address, onLoad]);

  if (!symbol) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--muted)' }}>
        Loading token info...
      </div>
    );
  }
  return null;
}

export function TokenIcon2({ token, size = 32 }: { token: Token; size?: number }) {
  return <TokenIcon token={token} size={size} />;
}

export default function TokenSelector({ selected, onSelect, exclude, onClose }: TokenSelectorProps) {
  const [query, setQuery] = useState('');
  const [customToken, setCustomToken] = useState<Token | null>(null);
  const [loadingAddress, setLoadingAddress] = useState('');

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

  const handleCustomLoaded = (token: Token) => {
    setCustomToken(token);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(18,45,69,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-0 overflow-hidden"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="font-semibold text-base" style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}>
            Select token
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:opacity-70 transition-opacity"
            style={{ background: 'var(--surface-muted)' }}
          >
            <X size={16} color="var(--ink-2)" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
          >
            <Search size={16} color="var(--muted)" />
            <input
              autoFocus
              type="text"
              placeholder="Search name or paste address"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
        </div>

        {/* Token list */}
        <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {/* Featured tokens section */}
          <div className="px-5 pb-1">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
              Featured tokens
            </span>
          </div>
          {filtered.map((token) => (
            <button
              key={token.address}
              onClick={() => { onSelect(token); onClose(); }}
              className="w-full flex items-center gap-3 px-5 py-3 hover:opacity-80 transition-opacity text-left"
              style={{ background: selected?.address === token.address ? 'var(--surface-muted)' : 'transparent' }}
            >
              <TokenIcon token={token} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm tabular-nums" style={{ color: 'var(--ink)' }}>
                  {token.symbol}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{token.name}</div>
              </div>
              {selected?.address === token.address && (
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
              )}
            </button>
          ))}

          {filtered.length === 0 && !loadingAddress && (
            <div className="px-5 py-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
              No featured tokens match your search.
            </div>
          )}

          {/* Custom address loader */}
          {loadingAddress && (
            <CustomTokenLoader address={loadingAddress} onLoad={handleCustomLoaded} />
          )}

          {customToken && (
            <div>
              <div className="px-5 pb-1 mt-2">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
                  Custom token
                </span>
              </div>
              <div
                className="mx-5 mb-3 p-3 rounded-xl flex items-start gap-2"
                style={{ background: 'rgba(186,43,76,0.08)', border: '1px solid rgba(186,43,76,0.20)' }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                <span className="text-xs" style={{ color: 'var(--danger)' }}>
                  This token is not on the curated EcoSwap list. Trade with caution.
                </span>
              </div>
              <button
                onClick={() => { onSelect(customToken); onClose(); }}
                className="w-full flex items-center gap-3 px-5 py-3 hover:opacity-80 transition-opacity text-left"
              >
                <TokenIcon token={customToken} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{customToken.symbol}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(186,43,76,0.10)', color: 'var(--danger)', fontSize: '10px' }}
                    >
                      Unverified
                    </span>
                  </div>
                  <div className="text-xs font-mono truncate" style={{ color: 'var(--muted)' }}>
                    {customToken.address.slice(0, 10)}...{customToken.address.slice(-8)}
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="h-safe-bottom" />
      </div>
    </div>
  );
}

export { TokenIcon };
