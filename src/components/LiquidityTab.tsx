import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Loader2, CheckCircle2, AlertCircle, ExternalLink, ChevronLeft } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { TokenIcon } from './TokenSelector';
import {
  usePairInfo,
  useLPBalance,
  useTokenBalance,
  useAllPairsLength,
  usePairAtIndex,
  formatTokenAmount,
  ARC_TESTNET_CHAIN_ID,
  useFactoryAddress,
} from '@/hooks/useEcoSwap';
import { ECOSWAP_POOL_ABI } from '@/constants/contracts';
import { addActivity } from '@/hooks/useActivity';

// ─── Pool selector ─────────────────────────────────────────────────────────

function PoolSelector({ onSelect }: { onSelect: (addr: `0x${string}`) => void }) {
  const { length } = useAllPairsLength();
  if (length === 0)
    return (
      <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
        <p className="text-sm">No pools exist yet. Create one first.</p>
      </div>
    );
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>Select a pool</p>
      {Array.from({ length }).map((_, i) => (
        <PoolSelectorRow key={i} index={i} onSelect={onSelect} />
      ))}
    </div>
  );
}

function PoolSelectorRow({ index, onSelect }: { index: number; onSelect: (addr: `0x${string}`) => void }) {
  const { pairAddress } = usePairAtIndex(index);
  const { pairInfo } = usePairInfo(pairAddress);
  if (!pairInfo)
    return <div className="h-14 rounded-2xl animate-pulse" style={{ background: 'var(--surface-muted)' }} />;
  return (
    <button
      onClick={() => onSelect(pairInfo.pairAddress)}
      className="w-full flex items-center gap-3 rounded-2xl p-4 transition-all hover:scale-[1.01]"
      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
    >
      <div className="flex -space-x-2">
        <TokenIcon token={pairInfo.token0Meta} size={28} />
        <TokenIcon token={pairInfo.token1Meta} size={28} />
      </div>
      <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
        {pairInfo.token0Meta.symbol} / {pairInfo.token1Meta.symbol}
      </span>
      <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>
        Select →
      </span>
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

type Mode = 'add' | 'remove';
// Transfer flow: transfer0 → transfer1 → mint
// Remove flow:   approveLP → burn
type Phase =
  | 'idle'
  | 'transferring0'   // sending token0 to pool
  | 'transferring1'   // sending token1 to pool
  | 'minting'         // calling mint()
  | 'approvingLP'     // approving pool to burn LP
  | 'burning'         // calling burn()
  | 'success'
  | 'err';

interface LiquidityTabProps {
  initialPairAddress?: `0x${string}`;
}

export default function LiquidityTab({ initialPairAddress }: LiquidityTabProps) {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const factory = useFactoryAddress();

  const [selectedPair, setSelectedPair] = useState<`0x${string}` | undefined>(initialPairAddress);
  const [mode, setMode] = useState<Mode>('add');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [removePercent, setRemovePercent] = useState(50);
  const [phase, setPhase] = useState<Phase>('idle');
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const [errMsg, setErrMsg] = useState('');

  // Track which step just confirmed so we advance correctly
  const pendingStepRef = useRef<Phase>('idle');

  const { pairInfo } = usePairInfo(selectedPair);
  const { lpBalance, refetch: refetchLP } = useLPBalance(selectedPair, address);
  const { balance: balance0 } = useTokenBalance(pairInfo?.token0, address);

  const decimals0 = pairInfo?.token0Meta.decimals ?? 6;
  const decimals1 = pairInfo?.token1Meta.decimals ?? 6;

  const parsedA0 = amount0 && !isNaN(parseFloat(amount0)) && parseFloat(amount0) > 0
    ? BigInt(Math.floor(parseFloat(amount0) * 10 ** decimals0))
    : 0n;
  const parsedA1 = amount1 && !isNaN(parseFloat(amount1)) && parseFloat(amount1) > 0
    ? BigInt(Math.floor(parseFloat(amount1) * 10 ** decimals1))
    : 0n;
  const lpToRemove = lpBalance ? (lpBalance * BigInt(removePercent)) / 100n : 0n;

  // ── Shared write hooks ──────────────────────────────────────────────────

  // Used for: transfer0, transfer1, approveLP
  const { writeContract: writeStep1, data: step1Hash, isPending: step1Pending, isError: step1Error, error: step1Err } = useWriteContract();
  const { isSuccess: step1Confirmed } = useWaitForTransactionReceipt({ hash: step1Hash });

  // Used for: transfer1 (step2 when step1 = transfer0), burn, mint
  const { writeContract: writeStep2, data: step2Hash, isPending: step2Pending, isError: step2Error, error: step2Err } = useWriteContract();
  const { isSuccess: step2Confirmed } = useWaitForTransactionReceipt({ hash: step2Hash });

  // Used for: mint (step3 after transfer0+transfer1)
  const { writeContract: writeStep3, data: step3Hash, isPending: step3Pending, isError: step3Error, error: step3Err } = useWriteContract();
  const { isSuccess: step3Confirmed } = useWaitForTransactionReceipt({ hash: step3Hash });

  // ── Helpers ─────────────────────────────────────────────────────────────

  const fail = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setErrMsg(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
    setPhase('err');
  };

  const callTransfer = (
    write: typeof writeStep1,
    tokenAddr: `0x${string}`,
    to: `0x${string}`,
    amount: bigint,
    nextPhase: Phase,
  ) => {
    pendingStepRef.current = nextPhase;
    setPhase(nextPhase);
    try {
      write({
        address: tokenAddr,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, amount],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (e) { fail(e); }
  };

  const callMint = (pairAddr: `0x${string}`, to: `0x${string}`) => {
    pendingStepRef.current = 'minting';
    setPhase('minting');
    try {
      writeStep3({
        address: pairAddr,
        abi: ECOSWAP_POOL_ABI,
        functionName: 'mint',
        args: [to],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (e) { fail(e); }
  };

  const callBurn = (pairAddr: `0x${string}`, to: `0x${string}`) => {
    pendingStepRef.current = 'burning';
    setPhase('burning');
    try {
      writeStep2({
        address: pairAddr,
        abi: ECOSWAP_POOL_ABI,
        functionName: 'burn',
        args: [to],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (e) { fail(e); }
  };

  // ── Step progression ─────────────────────────────────────────────────────

  // step1 confirmed: if we just transferred token0, now transfer token1
  //                  if we just approved LP, now burn
  useEffect(() => {
    if (!step1Confirmed || !selectedPair || !address || !pairInfo) return;
    const p = pendingStepRef.current;
    if (p === 'transferring0') {
      // Transfer token1 into pool
      callTransfer(writeStep2, pairInfo.token1, selectedPair, parsedA1, 'transferring1');
    } else if (p === 'approvingLP') {
      // LP tokens are now in the pool — call burn
      callBurn(selectedPair, address);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step1Confirmed]);

  // step2 confirmed: if we just transferred token1, now call mint
  //                  if we just burned, it's done
  useEffect(() => {
    if (!step2Confirmed || !selectedPair || !address) return;
    const p = pendingStepRef.current;
    if (p === 'transferring1') {
      callMint(selectedPair, address);
    } else if (p === 'burning') {
      // burn success
      setPhase('success');
      setLastTxHash(step2Hash);
      void refetchLP();
      if (step2Hash) addActivity({
        type: 'remove_liquidity',
        description: `Removed ${removePercent}% from ${pairInfo?.token0Meta.symbol}/${pairInfo?.token1Meta.symbol}`,
        txHash: step2Hash,
        chainId: ARC_TESTNET_CHAIN_ID,
        explorerBase: 'https://explorer.testnet.arc.io',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step2Confirmed]);

  // step3 confirmed: mint done → success
  useEffect(() => {
    if (!step3Confirmed || !step3Hash || !pairInfo) return;
    setPhase('success');
    setLastTxHash(step3Hash);
    void refetchLP();
    addActivity({
      type: 'add_liquidity',
      description: `Added liquidity to ${pairInfo.token0Meta.symbol}/${pairInfo.token1Meta.symbol}`,
      txHash: step3Hash,
      chainId: ARC_TESTNET_CHAIN_ID,
      explorerBase: 'https://explorer.testnet.arc.io',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step3Confirmed, step3Hash]);

  // Error propagation
  useEffect(() => { if (step1Error && step1Err) fail(step1Err); }, [step1Error, step1Err]);
  useEffect(() => { if (step2Error && step2Err) fail(step2Err); }, [step2Error, step2Err]);
  useEffect(() => { if (step3Error && step3Err) fail(step3Err); }, [step3Error, step3Err]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAmount0Change = (v: string) => {
    setAmount0(v);
    if (pairInfo && pairInfo.reserve0 > 0n && v && !isNaN(parseFloat(v)) && parseFloat(v) > 0) {
      const p0 = BigInt(Math.floor(parseFloat(v) * 10 ** decimals0));
      const a1 = (p0 * pairInfo.reserve1) / pairInfo.reserve0;
      setAmount1(formatUnits(a1, decimals1));
    } else {
      setAmount1('');
    }
  };

  const handleAction = () => {
    if (!selectedPair || !address || !pairInfo) return;
    setErrMsg('');
    if (mode === 'add') {
      if (parsedA0 === 0n || parsedA1 === 0n) return;
      // Step 1: transfer token0 to pool
      callTransfer(writeStep1, pairInfo.token0, selectedPair, parsedA0, 'transferring0');
    } else {
      if (lpToRemove === 0n) return;
      // Transfer LP tokens INTO the pool, then call burn()
      // (same pattern as mint: pool reads its own balances)
      callTransfer(writeStep1, selectedPair, selectedPair, lpToRemove, 'approvingLP');
    }
  };

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;
  const isProcessing = step1Pending || step2Pending || step3Pending ||
    ['transferring0', 'transferring1', 'minting', 'approvingLP', 'burning'].includes(phase);

  const phaseLabel: Record<Phase, string> = {
    idle: mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity',
    transferring0: `Sending ${pairInfo?.token0Meta.symbol ?? 'token'} to pool…`,
    transferring1: `Sending ${pairInfo?.token1Meta.symbol ?? 'token'} to pool…`,
    minting: 'Minting LP tokens…',
    approvingLP: 'Sending LP to pool…',
    burning: 'Burning LP tokens…',
    success: 'Done!',
    err: 'Transaction failed',
  };

  // ── Guard: no factory ───────────────────────────────────────────────────

  if (!factory)
    return (
      <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
        <p className="text-sm">Contracts not yet deployed.</p>
      </div>
    );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-4">
      {!selectedPair ? (
        <PoolSelector onSelect={setSelectedPair} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}
              onClick={() => { setSelectedPair(undefined); setPhase('idle'); setAmount0(''); setAmount1(''); }}
            >
              <ChevronLeft size={14} /> All pools
            </button>
            {pairInfo && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <TokenIcon token={pairInfo.token0Meta} size={22} />
                  <TokenIcon token={pairInfo.token1Meta} size={22} />
                </div>
                <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                  {pairInfo.token0Meta.symbol}/{pairInfo.token1Meta.symbol}
                </span>
              </div>
            )}
          </div>

          {/* Your position */}
          {pairInfo && address && (
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Your position</p>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--ink-2)' }}>LP tokens</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {formatTokenAmount(lpBalance, 18, 6)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--muted)' }}>Pool share</span>
                <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
                  {lpBalance && pairInfo.totalSupply > 0n
                    ? ((Number(lpBalance) / Number(pairInfo.totalSupply)) * 100).toFixed(4)
                    : '0.0000'}%
                </span>
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            {(['add', 'remove'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setPhase('idle'); setAmount0(''); setAmount1(''); setErrMsg(''); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: mode === m ? 'var(--surface-strong)' : 'transparent',
                  color: mode === m ? 'var(--ink)' : 'var(--muted)',
                }}
              >
                {m === 'add' ? <Plus size={14} /> : <Minus size={14} />}
                {m === 'add' ? 'Add' : 'Remove'}
              </button>
            ))}
          </div>

          {/* ADD mode */}
          {mode === 'add' && pairInfo && (
            <div className="space-y-3">
              {/* How it works notice */}
              <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(15,157,107,0.08)', border: '1px solid rgba(15,157,107,0.2)', color: 'var(--accent)' }}>
                Tokens are sent directly to the pool, then LP tokens are minted to you. Three wallet confirmations total.
              </div>

              {/* Token 0 input */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <TokenIcon token={pairInfo.token0Meta} size={22} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{pairInfo.token0Meta.symbol}</span>
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                    Balance: {formatTokenAmount(balance0, decimals0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={amount0}
                    onChange={(e) => handleAmount0Change(e.target.value)}
                    className="flex-1 bg-transparent text-xl font-bold outline-none tabular-nums min-w-0"
                    style={{ color: 'var(--ink)' }}
                    disabled={isProcessing}
                  />
                  <button
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(15,157,107,0.15)', color: 'var(--accent)' }}
                    onClick={() => balance0 && handleAmount0Change(formatUnits(balance0, decimals0))}
                  >MAX</button>
                </div>
              </div>

              {/* Token 1 input */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <TokenIcon token={pairInfo.token1Meta} size={22} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{pairInfo.token1Meta.symbol}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  className="w-full bg-transparent text-xl font-bold outline-none tabular-nums"
                  style={{ color: 'var(--ink)' }}
                  disabled={isProcessing}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {pairInfo.reserve0 > 0n ? 'Auto-calculated from pool ratio' : 'Set initial price (first deposit)'}
                </p>
              </div>

              {/* Step progress */}
              {isProcessing && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                  {(['transferring0', 'transferring1', 'minting'] as Phase[]).map((step, i) => {
                    const stepPhases: Phase[] = ['transferring0', 'transferring1', 'minting'];
                    const currentIdx = stepPhases.indexOf(phase);
                    const stepIdx = i;
                    const done = stepIdx < currentIdx;
                    const active = stepIdx === currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{
                            background: done ? 'var(--accent)' : active ? 'rgba(15,157,107,0.2)' : 'var(--border)',
                            color: done || active ? 'var(--accent)' : 'var(--muted)',
                          }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span style={{ color: active ? 'var(--ink)' : done ? 'var(--accent)' : 'var(--muted)' }}>
                          {step === 'transferring0' && `Send ${pairInfo.token0Meta.symbol} to pool`}
                          {step === 'transferring1' && `Send ${pairInfo.token1Meta.symbol} to pool`}
                          {step === 'minting' && 'Mint LP tokens'}
                        </span>
                        {active && <Loader2 size={12} className="ml-auto animate-spin" style={{ color: 'var(--accent)' }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* REMOVE mode */}
          {mode === 'remove' && pairInfo && (
            <div className="space-y-3">
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-3 font-medium" style={{ color: 'var(--muted)' }}>Amount to remove</p>
                <p className="text-3xl font-bold tabular-nums mb-4" style={{ color: 'var(--ink)' }}>{removePercent}%</p>
                <input
                  type="range" min={1} max={100} value={removePercent}
                  onChange={(e) => setRemovePercent(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                  disabled={isProcessing}
                />
                <div className="flex gap-2 mt-3">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setRemovePercent(pct)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: removePercent === pct ? 'var(--accent)' : 'var(--surface-strong)',
                        color: removePercent === pct ? '#fff' : 'var(--ink-2)',
                      }}
                    >{pct}%</button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted)' }}>LP to burn</span>
                  <span className="tabular-nums font-semibold" style={{ color: 'var(--ink)' }}>
                    {formatTokenAmount(lpToRemove, 18, 6)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {phase === 'success' && (
            <div className="rounded-2xl p-4 text-center space-y-2" style={{ background: 'rgba(15,157,107,0.08)', border: '1px solid var(--accent)' }}>
              <CheckCircle2 size={28} className="mx-auto" style={{ color: 'var(--accent)' }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                {mode === 'add' ? 'Liquidity added!' : 'Liquidity removed!'}
              </p>
              {lastTxHash && (
                <a
                  href={`https://explorer.testnet.arc.io/tx/${lastTxHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs"
                  style={{ color: 'var(--accent)' }}
                >
                  View on explorer <ExternalLink size={11} />
                </a>
              )}
              <button
                className="mt-2 text-xs font-medium underline"
                style={{ color: 'var(--muted)' }}
                onClick={() => { setPhase('idle'); setAmount0(''); setAmount1(''); }}
              >Add more</button>
            </div>
          )}

          {/* Error state */}
          {phase === 'err' && (
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} style={{ color: '#EF4444' }} />
                <p className="font-semibold text-sm" style={{ color: '#EF4444' }}>Transaction failed</p>
              </div>
              {errMsg && <p className="text-xs" style={{ color: 'var(--muted)' }}>{errMsg}</p>}
              <button
                className="text-xs font-medium underline"
                style={{ color: 'var(--muted)' }}
                onClick={() => { setPhase('idle'); setErrMsg(''); }}
              >Try again</button>
            </div>
          )}

          {/* Wrong chain */}
          {isWrongChain && (
            <button
              onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
              className="w-full py-3 rounded-2xl text-sm font-semibold"
              style={{ background: '#F59E0B', color: '#fff' }}
            >
              Switch to Arc Testnet
            </button>
          )}

          {/* Action button */}
          {!isWrongChain && phase !== 'success' && (
            <button
              onClick={handleAction}
              disabled={
                isProcessing ||
                phase === 'err' ||
                !address ||
                (mode === 'add' && (parsedA0 === 0n || parsedA1 === 0n)) ||
                (mode === 'remove' && lpToRemove === 0n)
              }
              className="w-full py-4 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: isProcessing
                  ? 'var(--surface-strong)'
                  : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                color: isProcessing ? 'var(--muted)' : '#fff',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              {isProcessing
                ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />{phaseLabel[phase]}</span>
                : phaseLabel[phase]}
            </button>
          )}
        </>
      )}
    </div>
  );
}
