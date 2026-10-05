import { useState, useCallback, useEffect, useRef } from 'react';
import { Settings, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, ExternalLink, Info, ArrowUpDown, RefreshCw } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';
import TokenSelector, { TokenPill } from './TokenSelector';
import { Tooltip } from './ui/Tooltip';
import { FEATURED_TOKENS, type Token } from '@/constants/tokens';
import {
  useFactoryAddress, usePairAddress, usePairInfo,
  useTokenBalance,
  getAmountOut, getPriceImpact, formatTokenAmount, ARC_TESTNET_CHAIN_ID,
} from '@/hooks/useEcoSwap';
import { ECOSWAP_POOL_ABI } from '@/constants/contracts';
import { addActivity } from '@/hooks/useActivity';
import { buildTxExplorerUrl } from '@/onchain-facts';
import { awardLeaves } from '@/hooks/useLeafPoints';


// Transfer-first swap: step1 = transfer tokenIn to pool, step2 = call swap()
type TxPhase = 'idle' | 'transferring' | 'swapping' | 'done' | 'err';
const SLIPPAGE_PRESETS = ['0.1', '0.5', '1.0'];

export default function SwapTab({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const factory = useFactoryAddress();

  const [tokenIn, setTokenIn] = useState<Token>(FEATURED_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(FEATURED_TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [selectorOpen, setSelectorOpen] = useState<'in' | 'out' | null>(null);
  const [phase, setPhase] = useState<TxPhase>('idle');
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [customSlippage, setCustomSlippage] = useState('');
  const [deadline, setDeadline] = useState('20');
  const [flipped, setFlipped] = useState(false);
  const swapContextRef = useRef({ amountIn: '', symbolIn: '', symbolOut: '', amountOut: '' });

  const { pairAddress, refetch: refetchPair } = usePairAddress(tokenIn.address, tokenOut.address);
  const { pairInfo } = usePairInfo(
    pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' ? pairAddress : undefined,
  );
  const { balance: balanceIn } = useTokenBalance(tokenIn.address, address);

  const isToken0In = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
  const reserveIn = pairInfo ? (isToken0In ? pairInfo.reserve0 : pairInfo.reserve1) : 0n;
  const reserveOut = pairInfo ? (isToken0In ? pairInfo.reserve1 : pairInfo.reserve0) : 0n;

  const parsedAmountIn = amountIn && !isNaN(parseFloat(amountIn)) ? parseUnits(amountIn, tokenIn.decimals) : 0n;
  const amountOutRaw = getAmountOut(parsedAmountIn, reserveIn, reserveOut);
  const amountOutDisplay = formatUnits(amountOutRaw, tokenOut.decimals);
  const priceImpact = getPriceImpact(parsedAmountIn, reserveIn, reserveOut);
  const pairExists = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
  const hasEnoughBalance = balanceIn !== undefined && parsedAmountIn <= balanceIn;

  const effectiveSlippage = parseFloat(customSlippage || slippage) || 0.5;
  const minReceived = amountOutRaw > 0n
    ? formatUnits(amountOutRaw * BigInt(Math.floor((1 - effectiveSlippage / 100) * 10000)) / 10000n, tokenOut.decimals)
    : '0';

  // Step 1: transfer tokenIn into pool
  const { writeContract: writeTransfer, data: transferTxHash, isPending: transferPending, isError: transferError } = useWriteContract();
  const { isSuccess: transferConfirmed } = useWaitForTransactionReceipt({ hash: transferTxHash });

  // Step 2: call swap()
  const { writeContract: writeSwap, data: swapTxHash, isPending: swapWalletPending, isError: swapError } = useWriteContract();
  const { isSuccess: swapConfirmed } = useWaitForTransactionReceipt({ hash: swapTxHash });

  // transfer confirmed → call swap
  useEffect(() => {
    if (!transferConfirmed || phase !== 'transferring') return;
    if (!pairAddress || !address || amountOutRaw === 0n) return;
    setPhase('swapping');
    const a0Out = isToken0In ? 0n : amountOutRaw;
    const a1Out = isToken0In ? amountOutRaw : 0n;
    writeSwap({
      address: pairAddress,
      abi: ECOSWAP_POOL_ABI,
      functionName: 'swap',
      args: [a0Out, a1Out, address, '0x'],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferConfirmed]);

  // swap confirmed → done
  useEffect(() => {
    if (!swapConfirmed || !swapTxHash || phase !== 'swapping') return;
    setPhase('done');
    setLastTxHash(swapTxHash);
    addActivity({
      type: 'swap',
      description: `Swapped ${swapContextRef.current.amountIn} ${swapContextRef.current.symbolIn} → ~${swapContextRef.current.amountOut} ${swapContextRef.current.symbolOut}`,
      txHash: swapTxHash,
      chainId: ARC_TESTNET_CHAIN_ID,
      explorerBase: 'https://explorer.testnet.arc.io',
    });
    if (address) awardLeaves(address, 'swap', swapTxHash);
    void refetchPair();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapConfirmed, swapTxHash]);

  // error handling
  useEffect(() => {
    if (transferError && phase === 'transferring') setPhase('err');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferError]);
  useEffect(() => {
    if (swapError && phase === 'swapping') setPhase('err');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapError]);

  const handleFlip = () => {
    setFlipped((f) => !f);
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setPhase('idle');
  };

  const handleAction = useCallback(() => {
    if (!address || !pairAddress || !parsedAmountIn) return;
    swapContextRef.current = { amountIn, symbolIn: tokenIn.symbol, symbolOut: tokenOut.symbol, amountOut: parseFloat(amountOutDisplay).toFixed(4) };
    // Step 1: transfer tokenIn into the pool — pool reads its own balance to compute the swap
    setPhase('transferring');
    writeTransfer({
      address: tokenIn.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [pairAddress, parsedAmountIn],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
    // Step 2 (swap) is triggered in the useEffect when transferConfirmed
  }, [address, pairAddress, parsedAmountIn, isToken0In, amountOutRaw, amountIn, amountOutDisplay, tokenIn, tokenOut, writeTransfer]);

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;
  const isProcessing = phase === 'transferring' || phase === 'swapping' || transferPending || swapWalletPending;
  const impactNum = parseFloat(priceImpact);
  const impactColor = impactNum < 1 ? 'var(--success)' : impactNum < 5 ? 'var(--warning)' : 'var(--danger)';

  const getButtonLabel = (): string => {
    if (!address) return 'Connect Wallet';
    if (isWrongChain) return 'Switch to Arc Testnet';
    if (!amountIn || parseFloat(amountIn) === 0) return 'Enter an Amount';
    if (!pairExists) return 'No Pool — Create One';
    if (!hasEnoughBalance) return `Insufficient ${tokenIn.symbol}`;
    if (transferPending || phase === 'transferring') return `Sending ${tokenIn.symbol} to pool…`;
    if (swapWalletPending || phase === 'swapping') return 'Swapping…';
    if (phase === 'done') return 'Swap Again';
    return `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`;
  };

  const handleButton = () => {
    if (!address) return;
    if (isWrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return; }
    if (phase === 'done') { setPhase('idle'); setLastTxHash(undefined); setAmountIn(''); return; }
    if (!pairExists || !hasEnoughBalance || !amountIn || isProcessing) return;
    handleAction();
  };

  const isButtonDisabled = !address ? false : isWrongChain ? false
    : (!amountIn || parseFloat(amountIn) === 0 || !pairExists || !hasEnoughBalance || isProcessing);

  if (!factory) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
        <RefreshCw size={28} className="mx-auto mb-3 opacity-30 animate-spin" />
        <p className="text-sm">Contracts not deployed yet.</p>
      </div>
    );
  }

  const rate = reserveIn > 0n
    ? parseFloat(formatUnits(reserveOut * parseUnits('1', tokenIn.decimals) / reserveIn, tokenOut.decimals)).toFixed(4)
    : null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>Swap</h2>
          {rate && (
            <span
              className="inline-flex items-center tabular text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(15,157,107,0.12)',
                border: '1px solid rgba(15,157,107,0.22)',
                color: 'var(--accent)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              1 {tokenIn.symbol} ≈ {rate} {tokenOut.symbol}
            </span>
          )}
        </div>
        <Tooltip text="Transaction settings">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="w-9 h-9 flex items-center justify-center rounded-2xl transition-all"
            style={{
              background: showSettings ? 'var(--surface-hover)' : 'var(--surface-muted)',
              border: '1px solid var(--border)',
              color: showSettings ? 'var(--accent)' : 'var(--muted)',
            }}
            aria-label="Transaction settings"
          >
            <Settings size={15} />
          </button>
        </Tooltip>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="mb-5 rounded-2xl p-4 space-y-4 quote-details-enter"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-xs font-bold" style={{ color: 'var(--ink-2)' }}>Slippage tolerance</span>
              <Tooltip text="Your trade reverts if price moves unfavorably by more than this %" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SLIPPAGE_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setSlippage(p); setCustomSlippage(''); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: slippage === p && !customSlippage ? 'var(--grad-btn)' : 'var(--surface-strong)',
                    color: slippage === p && !customSlippage ? '#fff' : 'var(--ink-2)',
                    border: slippage === p && !customSlippage ? 'none' : '1px solid var(--border)',
                    boxShadow: slippage === p && !customSlippage ? '0 2px 12px rgba(15,157,107,0.25)' : 'none',
                  }}
                >{p}%</button>
              ))}
              <div className="relative">
                <input
                  type="number"
                  placeholder="Custom %"
                  value={customSlippage}
                  onChange={(e) => setCustomSlippage(e.target.value)}
                  className="w-24 pl-2 pr-5 py-1.5 rounded-xl text-xs bg-transparent outline-none text-right tabular glass-input"
                  style={{ color: 'var(--ink)' }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'var(--muted)' }}>%</span>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-xs font-bold" style={{ color: 'var(--ink-2)' }}>Transaction deadline</span>
              <Tooltip text="Your transaction reverts if pending longer than this" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-16 px-2 py-1.5 rounded-xl text-xs text-center tabular bg-transparent outline-none glass-input"
                style={{ color: 'var(--ink)' }}
              />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>minutes</span>
            </div>
          </div>
        </div>
      )}

      {/* Pay field */}
      <div
        className="glass-input rounded-2xl p-4 mb-1"
        style={{ background: 'var(--surface-input)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>You pay</span>
          {address && balanceIn !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs tabular" style={{ color: 'var(--muted)' }}>
                {formatTokenAmount(balanceIn, tokenIn.decimals, 4)} {tokenIn.symbol}
              </span>
              <button
                onClick={() => balanceIn && setAmountIn(formatUnits(balanceIn, tokenIn.decimals))}
                className="text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all hover:scale-105"
                style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}
              >MAX</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="number"
            min="0"
            placeholder="0"
            value={amountIn}
            onChange={(e) => { setAmountIn(e.target.value); setPhase('idle'); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleButton(); }}
            className="flex-1 min-w-0 bg-transparent outline-none font-extrabold tabular"
            style={{ color: 'var(--ink)', fontSize: 'clamp(20px, 5vw, 32px)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, width: 0 }}
          />
          <TokenPill token={tokenIn} onClick={() => setSelectorOpen('in')} />
        </div>
      </div>

      {/* Flip button — brand green, ArrowUpDown icon */}
      <div className="flex justify-center my-[-1px] relative z-10">
        <button
          onClick={handleFlip}
          className={`flip-btn ${flipped ? 'flipped' : ''}`}
          aria-label="Flip tokens"
          style={{
            background: 'var(--grad-btn)',
            border: '2px solid var(--bg-card)',
            color: '#fff',
            boxShadow: '0 2px 12px rgba(15,157,107,0.35)',
          }}
        >
          <ArrowUpDown size={15} className="flip-icon" />
        </button>
      </div>

      {/* Receive field */}
      <div
        className="glass-input rounded-2xl p-4 mt-1 mb-4"
        style={{ background: 'var(--surface-input)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>You receive</span>
          {pairExists && amountOutRaw > 0n && (
            <span className="text-[11px] font-bold tabular px-1.5 py-0.5 rounded-lg" style={{ background: `${impactColor}18`, color: impactColor }}>
              {priceImpact}% impact
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-1 min-w-0 font-extrabold tabular truncate"
            style={{
              color: pairExists && amountOutRaw > 0n ? 'var(--ink)' : 'var(--subtle)',
              fontSize: 'clamp(20px, 5vw, 32px)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
            }}
          >
            {pairExists && amountOutRaw > 0n ? parseFloat(amountOutDisplay).toFixed(6) : '0'}
          </div>
          <TokenPill token={tokenOut} onClick={() => setSelectorOpen('out')} />
        </div>
      </div>

      {/* High-impact warning */}
      {impactNum >= 5 && parsedAmountIn > 0n && (
        <div className="rounded-2xl px-4 py-3 mb-3 flex items-center gap-2.5"
          style={{ background: 'var(--danger-bg)', border: '1px solid rgba(240,82,82,0.20)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
            High price impact ({priceImpact}%) — you may lose significant value.
          </span>
        </div>
      )}

      {/* No pool notice */}
      {!pairExists && amountIn && (
        <div className="rounded-2xl px-4 py-3 mb-3 flex items-center gap-2.5"
          style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <Info size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <p className="text-xs font-medium" style={{ color: 'var(--warning)' }}>
            No pool for this pair yet. Create one in the Create tab.
          </p>
        </div>
      )}

      {/* Quote details collapsible */}
      {pairExists && parsedAmountIn > 0n && (
        <div className="mb-4">
          <button
            onClick={() => setShowDetails((s) => !s)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all"
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <span className="text-xs font-medium tabular" style={{ color: 'var(--muted)' }}>
              1 {tokenIn.symbol} ≈ {rate ?? '—'} {tokenOut.symbol}
              <span className="ml-2 font-normal" style={{ color: 'var(--subtle)' }}>· 0.3% fee</span>
            </span>
            <span style={{ color: 'var(--muted)' }}>
              {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </button>
          {showDetails && (
            <div
              className="mt-1 rounded-2xl px-4 py-3 space-y-2.5 quote-details-enter"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
            >
              <QuoteRow label="Price impact" tooltip="How much this trade moves the pool price"
                value={<span style={{ color: impactColor }}>{priceImpact}%</span>} />
              <QuoteRow label="Min. received" tooltip={`Minimum received with ${effectiveSlippage}% slippage`}
                value={`${parseFloat(minReceived).toFixed(6)} ${tokenOut.symbol}`} />
              <QuoteRow label="LP fee"
                value={`${(parseFloat(amountIn || '0') * 0.003).toFixed(6)} ${tokenIn.symbol}`} />
              <QuoteRow label="Route"
                value={<span style={{ color: 'var(--accent-teal)' }}>{tokenIn.symbol} → {tokenOut.symbol}</span>} />
              <QuoteRow label="Gas cost" tooltip="Arc uses USDC as gas — fees are very small"
                value={<span style={{ color: 'var(--success)' }}>{'<'} 0.01 USDC</span>} />
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleButton}
        disabled={isButtonDisabled}
        className="btn-primary w-full py-4 flex items-center justify-center gap-2.5"
        style={{ fontSize: 16, borderRadius: 'var(--radius-btn)', fontVariantNumeric: 'tabular-nums' }}
      >
        {isProcessing && (
          <RefreshCw size={17} className="leaf-spinner" />
        )}
        {getButtonLabel()}
      </button>

      {/* Success receipt */}
      {phase === 'done' && lastTxHash && (
        <div
          className="mt-4 rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.20)' }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)' }}>
            {/* Leaf icon on success */}
            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>Swap confirmed 🌿</p>
            <p className="text-xs mt-0.5 truncate tabular" style={{ color: 'var(--muted)' }}>
              {swapContextRef.current.amountIn} {swapContextRef.current.symbolIn} → {swapContextRef.current.amountOut} {swapContextRef.current.symbolOut}
            </p>
          </div>
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, lastTxHash)}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent-teal)' }}
          >
            View <ExternalLink size={11} />
          </a>
        </div>
      )}

      {/* Error */}
      {phase === 'err' && (
        <div className="mt-4 rounded-2xl p-3.5 flex items-center gap-2.5"
          style={{ background: 'var(--danger-bg)', border: '1px solid rgba(240,82,82,0.18)' }}>
          <AlertTriangle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p className="text-xs flex-1" style={{ color: 'var(--danger)' }}>
            Transaction failed or rejected. Please try again.
          </p>
          <button
            onClick={() => setPhase('idle')}
            className="text-xs px-2 py-1 rounded-lg font-semibold"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(240,82,82,0.2)' }}
          >Dismiss</button>
        </div>
      )}

      {/* Token selector modal */}
      {selectorOpen && (
        <TokenSelector
          selected={selectorOpen === 'in' ? tokenIn : tokenOut}
          exclude={selectorOpen === 'in' ? tokenOut : tokenIn}
          userAddress={address}
          onSelect={(t) => { if (selectorOpen === 'in') setTokenIn(t); else setTokenOut(t); setAmountIn(''); setPhase('idle'); }}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </div>
  );
}

function QuoteRow({ label, value, tooltip }: { label: string; value: React.ReactNode; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      <span className="font-semibold tabular" style={{ color: 'var(--ink-2)' }}>{value}</span>
    </div>
  );
}
