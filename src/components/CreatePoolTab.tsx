import { useState, useEffect } from 'react';
import { PlusCircle, ArrowRight, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { erc20Abi, parseUnits } from 'viem';
import TokenSelector, { TokenIcon } from './TokenSelector';
import { FEATURED_TOKENS, type Token } from '@/constants/tokens';
import {
  useFactoryAddress,
  usePairAddress,
  useTokenBalance,
  formatTokenAmount,
  ARC_TESTNET_CHAIN_ID,
} from '@/hooks/useEcoSwap';
import { ECOSWAP_FACTORY_ABI } from '@/constants/contracts';
import { addActivity } from '@/hooks/useActivity';
import { buildTxExplorerUrl } from '@/onchain-facts';

// Transfer-first deposit: step1 = transfer token0, step2 = transfer token1, step3 = mint
type Step = 'idle' | 'creating' | 'transferring0' | 'transferring1' | 'depositing' | 'done' | 'error';

interface CreatePoolTabProps {
  onPoolCreated?: (pairAddress: `0x${string}`) => void;
}

export default function CreatePoolTab({ onPoolCreated }: CreatePoolTabProps) {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const factory = useFactoryAddress();

  const [tokenA, setTokenA] = useState<Token>(FEATURED_TOKENS[0]);
  const [tokenB, setTokenB] = useState<Token>(FEATURED_TOKENS[1]);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [selectorOpen, setSelectorOpen] = useState<'a' | 'b' | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [newPairAddress, setNewPairAddress] = useState<`0x${string}` | undefined>();
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const [errorMsg, setErrorMsg] = useState('');

  const { pairAddress } = usePairAddress(tokenA.address, tokenB.address);
  const pairAlreadyExists =
    pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';

  const [token0, token1] =
    tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];

  const parsed0 =
    amount0 && !isNaN(parseFloat(amount0)) ? parseUnits(amount0, token0.decimals) : 0n;
  const parsed1 =
    amount1 && !isNaN(parseFloat(amount1)) ? parseUnits(amount1, token1.decimals) : 0n;

  const { balance: balance0 } = useTokenBalance(token0.address, address);

  const { writeContract: createPairWrite, data: createTxHash, isPending: createPending } =
    useWriteContract();
  const { isSuccess: createConfirmed, data: createReceipt, isError: createFailed } =
    useWaitForTransactionReceipt({ hash: createTxHash });

  // transfer0: send token0 into the new pool
  const { writeContract: transfer0Write, data: transfer0Hash, isPending: transfer0Pending } = useWriteContract();
  const { isSuccess: transfer0Confirmed } = useWaitForTransactionReceipt({ hash: transfer0Hash });

  // transfer1: send token1 into the new pool
  const { writeContract: transfer1Write, data: transfer1Hash, isPending: transfer1Pending } = useWriteContract();
  const { isSuccess: transfer1Confirmed } = useWaitForTransactionReceipt({ hash: transfer1Hash });

  // mint: call pool.mint(user) after both tokens are in
  const { writeContract: depositWrite, data: depositHash, isPending: depositPending } = useWriteContract();
  const { isSuccess: depositConfirmed, isError: depositFailed } = useWaitForTransactionReceipt({ hash: depositHash });

  // createPair confirmed → extract pair address → transfer token0 to pool
  useEffect(() => {
    if (!createConfirmed || !createReceipt || step !== 'creating') return;
    const PAIR_CREATED_TOPIC = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';
    const log = createReceipt.logs?.find((l) => l.topics?.[0]?.toLowerCase() === PAIR_CREATED_TOPIC);
    // pair address is the 3rd word in the log data (padded address)
    const pairAddr = log ? (('0x' + log.data.slice(26, 66)) as `0x${string}`) : undefined;
    if (!pairAddr) { setStep('error'); setErrorMsg('Could not find new pair address in receipt.'); return; }
    setNewPairAddress(pairAddr);
    addActivity({ type: 'create_pool', description: `Created ${token0.symbol}/${token1.symbol} pool`, txHash: createTxHash, chainId: ARC_TESTNET_CHAIN_ID, explorerBase: 'https://explorer.testnet.arc.io' });
    if (parsed0 > 0n) {
      setStep('transferring0');
      transfer0Write({ address: token0.address as `0x${string}`, abi: erc20Abi, functionName: 'transfer', args: [pairAddr, parsed0], chainId: ARC_TESTNET_CHAIN_ID });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createConfirmed, createReceipt]);

  useEffect(() => {
    if (createFailed && step === 'creating') { setStep('error'); setErrorMsg('Failed to create pool. Please try again.'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFailed]);

  // transfer0 confirmed → transfer token1 to pool
  useEffect(() => {
    if (!transfer0Confirmed || step !== 'transferring0' || !newPairAddress) return;
    if (parsed1 > 0n) {
      setStep('transferring1');
      transfer1Write({ address: token1.address as `0x${string}`, abi: erc20Abi, functionName: 'transfer', args: [newPairAddress, parsed1], chainId: ARC_TESTNET_CHAIN_ID });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer0Confirmed]);

  // transfer1 confirmed → call mint
  useEffect(() => {
    if (!transfer1Confirmed || step !== 'transferring1' || !newPairAddress || !address) return;
    setStep('depositing');
    depositWrite({
      address: newPairAddress,
      abi: [{ inputs: [{ internalType: 'address', name: 'to', type: 'address' }], name: 'mint', outputs: [{ internalType: 'uint256', name: 'liquidity', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' }] as const,
      functionName: 'mint',
      args: [address],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer1Confirmed]);

  // mint confirmed → done
  useEffect(() => {
    if (!depositConfirmed || !depositHash || step !== 'depositing') return;
    setStep('done');
    setLastTxHash(depositHash);
    addActivity({ type: 'add_liquidity', description: `Added initial liquidity to ${token0.symbol}/${token1.symbol} pool`, txHash: depositHash, chainId: ARC_TESTNET_CHAIN_ID, explorerBase: 'https://explorer.testnet.arc.io' });
    if (newPairAddress && onPoolCreated) onPoolCreated(newPairAddress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositConfirmed, depositHash]);

  useEffect(() => {
    if (depositFailed && step === 'depositing') { setStep('error'); setErrorMsg('Failed to mint LP tokens.'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositFailed]);

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;
  const isProcessing = ['creating', 'transferring0', 'transferring1', 'depositing'].includes(step);

  const handleCreate = () => {
    if (!factory) return;
    setStep('creating');
    createPairWrite({
      address: factory,
      abi: ECOSWAP_FACTORY_ABI,
      functionName: 'createPair',
      args: [tokenA.address as `0x${string}`, tokenB.address as `0x${string}`],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  };

  const steps = [
    {
      label: 'Create pool contract',
      active: step === 'creating' || createPending,
      done: ['transferring0', 'transferring1', 'depositing', 'done'].includes(step),
    },
    {
      label: `Send ${token0.symbol} to pool`,
      active: step === 'transferring0' || transfer0Pending,
      done: ['transferring1', 'depositing', 'done'].includes(step),
    },
    {
      label: `Send ${token1.symbol} to pool`,
      active: step === 'transferring1' || transfer1Pending,
      done: ['depositing', 'done'].includes(step),
    },
    {
      label: 'Mint LP tokens',
      active: step === 'depositing' || depositPending,
      done: step === 'done',
    },
  ];

  if (step === 'done' && newPairAddress) {
    return (
      <div className="w-full text-center space-y-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(26,128,71,0.10)' }}
        >
          <CheckCircle2 size={28} style={{ color: 'var(--success)' }} />
        </div>
        <h2
          className="font-bold text-xl"
          style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Pool Created
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {token0.symbol}/{token1.symbol} pool is live with your initial liquidity.
        </p>
        {lastTxHash && (
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, lastTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: 'var(--accent-hover)' }}
          >
            View transaction <ExternalLink size={13} />
          </a>
        )}
        <button
          onClick={() => {
            setStep('idle');
            setAmount0('');
            setAmount1('');
            setNewPairAddress(undefined);
          }}
          className="w-full py-3 rounded-2xl font-semibold text-sm"
          style={{
            background: 'var(--surface-muted)',
            color: 'var(--ink)',
            border: '1px solid var(--border)',
          }}
        >
          Create another pool
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h2
          className="font-semibold text-base"
          style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Create a new pool
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Set initial prices by depositing both tokens. You'll receive LP tokens.
        </p>
      </div>

      {pairAlreadyExists && (
        <div
          className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(232,165,7,0.08)', border: '1px solid rgba(232,165,7,0.20)' }}
        >
          <AlertCircle size={14} style={{ color: '#E8A507', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: '#E8A507' }}>
            This pair already has a pool. Use Add Liquidity instead.
          </p>
        </div>
      )}

      {/* Token A */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Token A</span>
          {address && balance0 !== undefined && (
            <button
              className="text-xs"
              style={{ color: 'var(--accent-hover)' }}
              onClick={() =>
                setAmount0(formatTokenAmount(balance0, token0.decimals, 6).replace(/,/g, ''))
              }
            >
              Balance: {formatTokenAmount(balance0, token0.decimals)}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            placeholder="0.00"
            value={amount0}
            onChange={(e) => setAmount0(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-transparent outline-none text-2xl font-semibold tabular-nums disabled:opacity-50"
            style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}
          />
          <button
            onClick={() => setSelectorOpen('a')}
            disabled={isProcessing}
            className="flex items-center gap-2 rounded-xl px-3 py-2 hover:opacity-80 transition-opacity flex-shrink-0 disabled:opacity-50"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
          >
            <TokenIcon token={tokenA} size={22} />
            <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
              {tokenA.symbol}
            </span>
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <PlusCircle size={20} color="var(--subtle)" />
      </div>

      {/* Token B */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Token B</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            placeholder="0.00"
            value={amount1}
            onChange={(e) => setAmount1(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-transparent outline-none text-2xl font-semibold tabular-nums disabled:opacity-50"
            style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif" }}
          />
          <button
            onClick={() => setSelectorOpen('b')}
            disabled={isProcessing}
            className="flex items-center gap-2 rounded-xl px-3 py-2 hover:opacity-80 transition-opacity flex-shrink-0 disabled:opacity-50"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
          >
            <TokenIcon token={tokenB} size={22} />
            <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
              {tokenB.symbol}
            </span>
          </button>
        </div>
      </div>

      {amount0 && amount1 && parseFloat(amount0) > 0 && parseFloat(amount1) > 0 && (
        <div
          className="rounded-xl p-3 flex items-center justify-between"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Initial price</span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
            1 {token0.symbol} = {(parseFloat(amount1) / parseFloat(amount0)).toFixed(6)}{' '}
            {token1.symbol}
          </span>
        </div>
      )}

      {isProcessing && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: s.done ? 'var(--success)' : s.active ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {s.done ? (
                  <CheckCircle2 size={12} color="#fff" />
                ) : s.active ? (
                  <Loader2 size={12} color="#fff" className="animate-spin" />
                ) : (
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{i + 1}</span>
                )}
              </div>
              <span
                className="text-xs font-medium flex-1"
                style={{ color: s.done || s.active ? 'var(--ink)' : 'var(--muted)' }}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && <ArrowRight size={12} color="var(--subtle)" />}
            </div>
          ))}
        </div>
      )}

      {step === 'error' && (
        <div
          className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(186,43,76,0.08)', border: '1px solid rgba(186,43,76,0.20)' }}
        >
          <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
          <span className="text-xs flex-1" style={{ color: 'var(--danger)' }}>
            {errorMsg}
          </span>
          <button
            className="text-xs underline"
            style={{ color: 'var(--danger)' }}
            onClick={() => setStep('idle')}
          >
            Reset
          </button>
        </div>
      )}

      {!isProcessing && step !== 'done' && (
        <button
          onClick={
            isWrongChain ? () => switchChain({ chainId: ARC_TESTNET_CHAIN_ID }) : handleCreate
          }
          disabled={
            !address ||
            !!pairAlreadyExists ||
            !amount0 ||
            !amount1 ||
            parseFloat(amount0) === 0 ||
            parseFloat(amount1) === 0
          }
          className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {isWrongChain ? 'Switch to Arc Testnet' : 'Create Pool & Deposit Liquidity'}
        </button>
      )}

      {selectorOpen && (
        <TokenSelector
          selected={selectorOpen === 'a' ? tokenA : tokenB}
          exclude={selectorOpen === 'a' ? tokenB : tokenA}
          onSelect={(t) => {
            if (selectorOpen === 'a') setTokenA(t);
            else setTokenB(t);
          }}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </div>
  );
}
