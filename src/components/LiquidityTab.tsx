import { useState, useEffect } from 'react';
import { Minus, Plus, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { TokenIcon } from './TokenSelector';
import {
  usePairInfo,
  useLPBalance,
  useTokenBalance,
  useTokenAllowance,
  useAllPairsLength,
  usePairAtIndex,
  formatTokenAmount,
  ARC_TESTNET_CHAIN_ID,
  useFactoryAddress,
} from '@/hooks/useEcoSwap';
import { ECOSWAP_POOL_ABI } from '@/constants/contracts';
import { addActivity } from '@/hooks/useActivity';
import { buildTxExplorerUrl } from '@/onchain-facts';

type Mode = 'add' | 'remove';
type Phase = 'idle' | 'approving' | 'approvingLP' | 'pending' | 'success' | 'err';

function PoolSelector({ onSelect }: { onSelect: (addr: `0x${string}`) => void }) {
  const { length } = useAllPairsLength();
  if (length === 0)
    return (
      <div className="text-center py-6" style={{ color: 'var(--muted)' }}>
        <p className="text-sm">No pools exist yet. Create one first.</p>
      </div>
    );
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Select a pool</p>
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
    return <div className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-muted)' }} />;
  return (
    <button
      onClick={() => onSelect(pairInfo.pairAddress)}
      className="w-full flex items-center gap-3 rounded-xl p-3 hover:opacity-80 transition-opacity"
      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
    >
      <div className="flex -space-x-2">
        <TokenIcon token={pairInfo.token0Meta} size={26} />
        <TokenIcon token={pairInfo.token1Meta} size={26} />
      </div>
      <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
        {pairInfo.token0Meta.symbol} / {pairInfo.token1Meta.symbol}
      </span>
    </button>
  );
}

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

  const { pairInfo } = usePairInfo(selectedPair);
  const { lpBalance, refetch: refetchLP } = useLPBalance(selectedPair, address);
  const { balance: balance0 } = useTokenBalance(pairInfo?.token0, address);
  const { allowance: allow0 } = useTokenAllowance(pairInfo?.token0, address, selectedPair);
  const { allowance: allow1 } = useTokenAllowance(pairInfo?.token1, address, selectedPair);
  const { allowance: lpAllow } = useTokenAllowance(selectedPair, address, selectedPair);

  const decimals0 = pairInfo?.token0Meta.decimals ?? 6;
  const decimals1 = pairInfo?.token1Meta.decimals ?? 6;

  // Parse amounts safely
  const parsedA0 = amount0 && !isNaN(parseFloat(amount0)) && parseFloat(amount0) > 0
    ? BigInt(Math.floor(parseFloat(amount0) * 10 ** decimals0))
    : 0n;
  const parsedA1 = amount1 && !isNaN(parseFloat(amount1)) && parseFloat(amount1) > 0
    ? BigInt(Math.floor(parseFloat(amount1) * 10 ** decimals1))
    : 0n;
  const lpToRemove = lpBalance ? (lpBalance * BigInt(removePercent)) / 100n : 0n;

  const needsApprove0 = parsedA0 > 0n && (allow0 === undefined || allow0 < parsedA0);
  const needsApprove1 = parsedA1 > 0n && (allow1 === undefined || allow1 < parsedA1);
  const needsLPApprove = lpToRemove > 0n && (lpAllow === undefined || lpAllow < lpToRemove);

  // approve write (shared for token0, token1, and LP)
  const { writeContract: writeApprove, data: approveTxHash } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });

  // action write (mint or burn)
  const { writeContract: writeAction, data: actionTxHash, isPending: actionPending } = useWriteContract();
  const { isSuccess: actionConfirmed, isError: actionFailed } = useWaitForTransactionReceipt({ hash: actionTxHash });

  const doMint = (pairAddr: `0x${string}`, to: `0x${string}`) => {
    setPhase('pending');
    writeAction({
      address: pairAddr,
      abi: ECOSWAP_POOL_ABI,
      functionName: 'mint',
      args: [to],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  };

  const doBurn = (pairAddr: `0x${string}`, to: `0x${string}`) => {
    setPhase('pending');
    writeAction({
      address: pairAddr,
      abi: ECOSWAP_POOL_ABI,
      functionName: 'burn',
      args: [to],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  };

  // approve confirmed → next step
  useEffect(() => {
    if (!approveConfirmed) return;
    if (!selectedPair || !address || !pairInfo) return;
    if (phase === 'approving') {
      // Check if token1 still needs approval
      if (needsApprove1) {
        writeApprove({
          address: pairInfo.token1,
          abi: erc20Abi,
          functionName: 'approve',
          args: [selectedPair, parsedA1],
          chainId: ARC_TESTNET_CHAIN_ID,
        });
      } else {
        doMint(selectedPair, address);
      }
    } else if (phase === 'approvingLP') {
      doBurn(selectedPair, address);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

  // action confirmed → success
  useEffect(() => {
    if (!actionConfirmed || !actionTxHash || phase !== 'pending') return;
    setPhase('success');
    setLastTxHash(actionTxHash);
    void refetchLP();
    addActivity({
      type: mode === 'add' ? 'add_liquidity' : 'remove_liquidity',
      description:
        mode === 'add'
          ? `Added liquidity to ${pairInfo?.token0Meta.symbol}/${pairInfo?.token1Meta.symbol}`
          : `Removed ${removePercent}% from ${pairInfo?.token0Meta.symbol}/${pairInfo?.token1Meta.symbol}`,
      txHash: actionTxHash,
      chainId: ARC_TESTNET_CHAIN_ID,
      explorerBase: 'https://explorer.testnet.arc.io',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConfirmed, actionTxHash]);

  useEffect(() => {
    if (actionFailed && (phase === 'pending' || phase === 'approving' || phase === 'approvingLP')) {
      setPhase('err');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFailed]);

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
    if (mode === 'add') {
      if (needsApprove0) {
        setPhase('approving');
        writeApprove({
          address: pairInfo.token0,
          abi: erc20Abi,
          functionName: 'approve',
          args: [selectedPair, parsedA0],
          chainId: ARC_TESTNET_CHAIN_ID,
        });
      } else if (needsApprove1) {
        setPhase('approving');
        writeApprove({
          address: pairInfo.token1,
          abi: erc20Abi,
          functionName: 'approve',
          args: [selectedPair, parsedA1],
          chainId: ARC_TESTNET_CHAIN_ID,
        });
      } else {
        doMint(selectedPair, address);
      }
    } else {
      if (needsLPApprove) {
        setPhase('approvingLP');
        writeApprove({
          address: selectedPair,
          abi: erc20Abi,
          functionName: 'approve',
          args: [selectedPair, lpToRemove],
          chainId: ARC_TESTNET_CHAIN_ID,
        });
      } else {
        doBurn(selectedPair, address);
      }
    }
  };

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;
  const isProcessing = ['approving', 'approvingLP', 'pending'].includes(phase) || actionPending;

  if (!factory)
    return (
      <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
        <p className="text-sm">Contracts not yet deployed.</p>
      </div>
    );

  return (
    <div className="w-full space-y-4">
      {!selectedPair ? (
        <PoolSelector onSelect={setSelectedPair} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <button
              className="text-xs"
              style={{ color: 'var(--accent-hover)' }}
              onClick={() => { setSelectedPair(undefined); setPhase('idle'); }}
            >
              ← All pools
            </button>
            {pairInfo && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <TokenIcon token={pairInfo.token0Meta} size={22} />
                  <TokenIcon token={pairInfo.token1Meta} size={22} />
                </div>
                <span className="font-semibold text-sm" style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {pairInfo.token0Meta.symbol}/{pairInfo.token1Meta.symbol}
                </span>
              </div>
            )}
          </div>

          {pairInfo && address && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Your position</p>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--ink-2)' }}>LP tokens</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {formatTokenAmount(lpBalance, 18, 6)}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span style={{ color: 'var(--muted)' }}>Pool share</span>
                <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
                  {lpBalance && pairInfo.totalSupply > 0n
                    ? ((Number(lpBalance) / Number(pairInfo.totalSupply)) * 100).toFixed(4)
                    : '0.0000'}%
                </span>
              </div>
            </div>
          )}

          <div className="flex rounded-xl p-1" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            {(['add', 'remove'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setPhase('idle'); setAmount0(''); setAmount1(''); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: mode === m ? 'var(--surface-strong)' : 'transparent',
                  color: mode === m ? 'var(--ink)' : 'var(--muted)',
                  boxShadow: mode === m ? '0 1px 3px rgba(18,45,69,0.08)' : 'none',
                }}
              >
                {m === 'add' ? <Plus size={14} /> : <Minus size={14} />}
                {m === 'add' ? 'Add' : 'Remove'}
              </button>
            ))}
          </div>

          {mode === 'add' && pairInfo && (
            <div className="space-y-3">
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TokenIcon token={pairInfo.token0Meta} size={22} />
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{pairInfo.token0Meta.symbol}</span>
                  </div>
                  {balance0 !== undefined && (
                    <button className="text-xs" style={{ color: 'var(--accent-hover)' }}
                      onClick={() => handleAmount0Change(formatUnits(balance0, decimals0))}>
                      Max: {formatTokenAmount(balance0, decimals0)}
                    </button>
                  )}
                </div>
                <input
                  type="number" min="0" value={amount0} onChange={(e) => handleAmount0Change(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent outline-none text-xl font-semibold tabular-nums"
                  style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}
                />
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <TokenIcon token={pairInfo.token1Meta} size={22} />
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{pairInfo.token1Meta.symbol}</span>
                </div>
                <div className="text-xl font-semibold tabular-nums"
                  style={{ color: amount1 ? 'var(--ink)' : 'var(--subtle)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {amount1 ? parseFloat(amount1).toFixed(6) : '0.000000'}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Auto-calculated to maintain pool ratio</p>
              </div>
            </div>
          )}

          {mode === 'remove' && pairInfo && (
            <div className="space-y-3">
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Amount to remove</span>
                  <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}>{removePercent}%</span>
                </div>
                <input type="range" min="1" max="100" value={removePercent}
                  onChange={(e) => setRemovePercent(parseInt(e.target.value))} className="w-full accent-green-600" />
                <div className="flex justify-between mt-2">
                  {[25, 50, 75, 100].map((p) => (
                    <button key={p} onClick={() => setRemovePercent(p)} className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: removePercent === p ? 'var(--accent)' : 'var(--surface-strong)', color: removePercent === p ? '#fff' : 'var(--ink-2)', border: '1px solid var(--border)' }}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>You receive (estimated)</p>
                {pairInfo.totalSupply > 0n && lpBalance !== undefined && lpBalance > 0n ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--ink-2)' }}>{pairInfo.token0Meta.symbol}</span>
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                        {formatTokenAmount((lpToRemove * pairInfo.reserve0) / pairInfo.totalSupply, decimals0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--ink-2)' }}>{pairInfo.token1Meta.symbol}</span>
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                        {formatTokenAmount((lpToRemove * pairInfo.reserve1) / pairInfo.totalSupply, decimals1)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>No LP position to remove.</p>
                )}
              </div>
            </div>
          )}

          {phase === 'success' && lastTxHash && (
            <div className="rounded-xl p-3 flex items-center gap-2"
              style={{ background: 'rgba(26,128,71,0.08)', border: '1px solid rgba(26,128,71,0.20)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <span className="text-xs flex-1" style={{ color: 'var(--success)' }}>Transaction confirmed!</span>
              <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, lastTxHash)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
                View <ExternalLink size={11} />
              </a>
            </div>
          )}

          {phase === 'err' && (
            <div className="rounded-xl p-3 flex items-center gap-2"
              style={{ background: 'rgba(186,43,76,0.08)', border: '1px solid rgba(186,43,76,0.20)' }}>
              <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
              <span className="text-xs flex-1" style={{ color: 'var(--danger)' }}>Transaction failed.</span>
              <button className="text-xs underline" style={{ color: 'var(--danger)' }} onClick={() => setPhase('idle')}>Retry</button>
            </div>
          )}

          <button
            onClick={isWrongChain ? () => switchChain({ chainId: ARC_TESTNET_CHAIN_ID }) : handleAction}
            disabled={!address || (!isWrongChain && (isProcessing || (mode === 'add' && parsedA0 === 0n) || (mode === 'remove' && (lpBalance === undefined || lpBalance === 0n))))}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {isProcessing && <Loader2 size={18} className="animate-spin" />}
            {isWrongChain ? 'Switch to Arc Testnet' : mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
          </button>
        </>
      )}
    </div>
  );
}
