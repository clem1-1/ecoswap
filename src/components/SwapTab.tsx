import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowUpDown, Info, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';
import TokenSelector, { TokenIcon } from './TokenSelector';
import { FEATURED_TOKENS, type Token } from '@/constants/tokens';
import {
  useFactoryAddress,
  usePairAddress,
  usePairInfo,
  useTokenBalance,
  useTokenAllowance,
  getAmountOut,
  getPriceImpact,
  formatTokenAmount,
  ARC_TESTNET_CHAIN_ID,
} from '@/hooks/useEcoSwap';
import { ECOSWAP_POOL_ABI } from '@/constants/contracts';
import { addActivity } from '@/hooks/useActivity';
import { buildTxExplorerUrl } from '@/onchain-facts';

type TxPhase = 'idle' | 'awaitApprove' | 'awaitSwap' | 'done' | 'err';

export default function SwapTab() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const factory = useFactoryAddress();

  const [tokenIn, setTokenIn] = useState<Token>(FEATURED_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(FEATURED_TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [selectorOpen, setSelectorOpen] = useState<'in' | 'out' | null>(null);
  const [phase, setPhase] = useState<TxPhase>('idle');
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  // Snapshot values captured when swap is initiated (for activity recording)
  const swapContextRef = useRef({ amountIn: '', symbolIn: '', symbolOut: '', amountOut: '' });

  const { pairAddress, refetch: refetchPair } = usePairAddress(tokenIn.address, tokenOut.address);
  const { pairInfo } = usePairInfo(
    pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000'
      ? pairAddress
      : undefined,
  );
  const { balance: balanceIn } = useTokenBalance(tokenIn.address, address);
  const { allowance, refetch: refetchAllowance } = useTokenAllowance(
    tokenIn.address,
    address,
    pairAddress,
  );

  const isToken0In = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
  const reserveIn = pairInfo ? (isToken0In ? pairInfo.reserve0 : pairInfo.reserve1) : 0n;
  const reserveOut = pairInfo ? (isToken0In ? pairInfo.reserve1 : pairInfo.reserve0) : 0n;

  const parsedAmountIn =
    amountIn && !isNaN(parseFloat(amountIn)) ? parseUnits(amountIn, tokenIn.decimals) : 0n;
  const amountOutRaw = getAmountOut(parsedAmountIn, reserveIn, reserveOut);
  const amountOutDisplay = formatUnits(amountOutRaw, tokenOut.decimals);
  const priceImpact = getPriceImpact(parsedAmountIn, reserveIn, reserveOut);
  const pairExists =
    pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
  const needsApproval =
    parsedAmountIn > 0n && (allowance === undefined || allowance < parsedAmountIn);
  const hasEnoughBalance = balanceIn !== undefined && parsedAmountIn <= balanceIn;

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: approveWalletPending,
  } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const {
    writeContract: writeSwap,
    data: swapTxHash,
    isPending: swapWalletPending,
  } = useWriteContract();
  const { isSuccess: swapConfirmed, isError: swapFailed } = useWaitForTransactionReceipt({
    hash: swapTxHash,
  });

  // After approval, execute swap
  useEffect(() => {
    if (!approveConfirmed || phase !== 'awaitApprove') return;
    if (!pairAddress || !address || amountOutRaw === 0n) return;
    void refetchAllowance();
    setPhase('awaitSwap');
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
  }, [approveConfirmed]);

  // After swap confirmed
  useEffect(() => {
    if (!swapConfirmed || !swapTxHash || phase !== 'awaitSwap') return;
    setPhase('done');
    setLastTxHash(swapTxHash);
    addActivity({
      type: 'swap',
      description: `Swapped ${swapContextRef.current.amountIn} ${swapContextRef.current.symbolIn} for ~${swapContextRef.current.amountOut} ${swapContextRef.current.symbolOut}`,
      txHash: swapTxHash,
      chainId: ARC_TESTNET_CHAIN_ID,
      explorerBase: 'https://explorer.testnet.arc.io',
    });
    void refetchPair();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapConfirmed, swapTxHash]);

  // After swap failed
  useEffect(() => {
    if (!swapFailed || phase !== 'awaitSwap') return;
    setPhase('err');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapFailed]);

  const handleFlip = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setPhase('idle');
  };

  const handleAction = useCallback(() => {
    if (!address || !pairAddress || !parsedAmountIn) return;
    // Snapshot context for activity recording
    swapContextRef.current = {
      amountIn,
      symbolIn: tokenIn.symbol,
      symbolOut: tokenOut.symbol,
      amountOut: parseFloat(amountOutDisplay).toFixed(4),
    };
    if (needsApproval) {
      setPhase('awaitApprove');
      writeApprove({
        address: tokenIn.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [pairAddress, parsedAmountIn],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } else {
      setPhase('awaitSwap');
      const a0Out = isToken0In ? 0n : amountOutRaw;
      const a1Out = isToken0In ? amountOutRaw : 0n;
      writeSwap({
        address: pairAddress,
        abi: ECOSWAP_POOL_ABI,
        functionName: 'swap',
        args: [a0Out, a1Out, address, '0x'],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    }
  }, [
    address,
    pairAddress,
    parsedAmountIn,
    needsApproval,
    isToken0In,
    amountOutRaw,
    amountIn,
    amountOutDisplay,
    tokenIn,
    tokenOut,
    writeApprove,
    writeSwap,
  ]);

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;
  const isProcessing =
    phase === 'awaitApprove' || phase === 'awaitSwap' || approveWalletPending || swapWalletPending;

  const getButtonLabel = (): string => {
    if (!address) return 'Connect wallet';
    if (isWrongChain) return 'Switch to Arc Testnet';
    if (!amountIn || parseFloat(amountIn) === 0) return 'Enter an amount';
    if (!pairExists) return 'No pool — create one first';
    if (!hasEnoughBalance) return `Insufficient ${tokenIn.symbol}`;
    if (approveWalletPending || phase === 'awaitApprove') return `Approving ${tokenIn.symbol}...`;
    if (needsApproval) return `Approve ${tokenIn.symbol}`;
    if (swapWalletPending || phase === 'awaitSwap') return 'Swapping...';
    return `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`;
  };

  const handleButton = () => {
    if (!address) return;
    if (isWrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID });
      return;
    }
    if (!pairExists || !hasEnoughBalance || !amountIn || phase === 'done') return;
    handleAction();
  };

  const isButtonDisabled =
    !address ||
    (!isWrongChain &&
      (!amountIn ||
        parseFloat(amountIn) === 0 ||
        !pairExists ||
        !hasEnoughBalance ||
        isProcessing));

  const impactNum = parseFloat(priceImpact);
  const impactColor =
    impactNum < 1 ? 'var(--success)' : impactNum < 3 ? '#E8A507' : 'var(--danger)';

  if (!factory) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
        <p className="text-sm">Contracts not yet deployed.</p>
        <p className="text-xs mt-1">Deploy the factory to enable trading.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="rounded-2xl p-4 mb-1"
        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            You pay
          </span>
          {address && (
            <button
              className="text-xs"
              style={{ color: 'var(--accent-hover)' }}
              onClick={() =>
                balanceIn && setAmountIn(formatUnits(balanceIn, tokenIn.decimals))
              }
            >
              Balance: {formatTokenAmount(balanceIn, tokenIn.decimals)} {tokenIn.symbol}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            placeholder="0.00"
            value={amountIn}
            onChange={(e) => {
              setAmountIn(e.target.value);
              setPhase('idle');
            }}
            className="flex-1 bg-transparent outline-none text-2xl font-semibold tabular-nums"
            style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}
          />
          <button
            onClick={() => setSelectorOpen('in')}
            className="flex items-center gap-2 rounded-xl px-3 py-2 hover:opacity-80 transition-opacity flex-shrink-0"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
          >
            <TokenIcon token={tokenIn} size={22} />
            <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
              {tokenIn.symbol}
            </span>
            {!tokenIn.verified && (
              <span
                className="text-xs px-1 rounded"
                style={{ background: 'rgba(186,43,76,0.10)', color: 'var(--danger)' }}
              >
                !
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex justify-center my-1">
        <button
          onClick={handleFlip}
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          <ArrowUpDown size={18} color="var(--ink-2)" />
        </button>
      </div>

      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            You receive
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 text-2xl font-semibold tabular-nums"
            style={{
              color: pairExists && amountOutRaw > 0n ? 'var(--ink)' : 'var(--subtle)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {pairExists && amountOutRaw > 0n
              ? parseFloat(amountOutDisplay).toFixed(6)
              : '0.000000'}
          </div>
          <button
            onClick={() => setSelectorOpen('out')}
            className="flex items-center gap-2 rounded-xl px-3 py-2 hover:opacity-80 transition-opacity flex-shrink-0"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
          >
            <TokenIcon token={tokenOut} size={22} />
            <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
              {tokenOut.symbol}
            </span>
            {!tokenOut.verified && (
              <span
                className="text-xs px-1 rounded"
                style={{ background: 'rgba(186,43,76,0.10)', color: 'var(--danger)' }}
              >
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {pairExists && parsedAmountIn > 0n && (
        <div
          className="rounded-xl p-3 mb-4 space-y-2"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>Price impact</span>
            <span className="font-semibold tabular-nums" style={{ color: impactColor }}>
              {priceImpact}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>LP fee (0.3%)</span>
            <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
              {(parseFloat(amountIn) * 0.003).toFixed(6)} {tokenIn.symbol}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>Route</span>
            <span style={{ color: 'var(--ink-2)' }}>
              {tokenIn.symbol} → {tokenOut.symbol}
            </span>
          </div>
        </div>
      )}

      {!pairExists && amountIn && (
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-2"
          style={{ background: 'rgba(186,43,76,0.06)', border: '1px solid rgba(186,43,76,0.15)' }}
        >
          <Info size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs" style={{ color: 'var(--danger)' }}>
            No liquidity pool exists for this pair. Create one in the Pools tab.
          </p>
        </div>
      )}

      <button
        onClick={handleButton}
        disabled={isButtonDisabled}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: 'var(--accent)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {isProcessing && <Loader2 size={18} className="animate-spin" />}
        {getButtonLabel()}
      </button>

      {phase === 'done' && lastTxHash && (
        <div
          className="mt-3 rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(26,128,71,0.08)', border: '1px solid rgba(26,128,71,0.20)' }}
        >
          <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <span className="text-xs flex-1" style={{ color: 'var(--success)' }}>
            Swap confirmed!
          </span>
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, lastTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--success)' }}
          >
            View <ExternalLink size={11} />
          </a>
          <button
            onClick={() => { setPhase('idle'); setLastTxHash(undefined); setAmountIn(''); }}
            className="text-xs underline ml-1"
            style={{ color: 'var(--success)' }}
          >
            New swap
          </button>
        </div>
      )}

      {phase === 'err' && (
        <div
          className="mt-3 rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(186,43,76,0.08)', border: '1px solid rgba(186,43,76,0.20)' }}
        >
          <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span className="text-xs flex-1" style={{ color: 'var(--danger)' }}>
            Transaction failed.
          </span>
          <button
            className="text-xs underline"
            style={{ color: 'var(--danger)' }}
            onClick={() => setPhase('idle')}
          >
            Dismiss
          </button>
        </div>
      )}

      {selectorOpen && (
        <TokenSelector
          selected={selectorOpen === 'in' ? tokenIn : tokenOut}
          exclude={selectorOpen === 'in' ? tokenOut : tokenIn}
          onSelect={(t) => {
            if (selectorOpen === 'in') setTokenIn(t);
            else setTokenOut(t);
            setAmountIn('');
            setPhase('idle');
          }}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </div>
  );
}
