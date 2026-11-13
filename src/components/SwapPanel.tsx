import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { LineChart, Settings, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, ExternalLink, Info, ArrowUpDown, RefreshCw, X } from 'lucide-react';
import { useAccount, useWriteContract, useSwitchChain, usePublicClient } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits, maxUint256 } from 'viem';
import TokenSelector, { TokenPill } from './TokenSelector';
import { Tooltip } from './ui/Tooltip';
import { FEATURED_TOKENS, type Token } from '@/constants/tokens';
import {
  useFactoryAddress, usePairAddress, usePairInfo,
  useTokenBalance,
  getAmountOut, getPriceImpact, formatTokenAmount, ARC_TESTNET_CHAIN_ID,
} from '@/hooks/useEcoSwap';
import {
  ECOSWAP_POOL_ABI,
  UNIV2_ROUTER_ABI, UNIV2_ROUTER,
  UNIV3_ROUTER_ABI, UNIV3_ROUTER, UNITFLOW_ROUTER,
  XYLO_STABLE_POOL_ABI, XYLO_STABLE_POOL_ADDRESS,
} from '@/constants/contracts';
import { addActivity } from '@/hooks/useActivity';
import { buildTxExplorerUrl } from '@/onchain-facts';
import { awardLeaves } from '@/hooks/useLeafPoints';
import RouteSelector from './RouteSelector';
import { fetchAllLPRoutes, type RouteOption } from '@/lib/routeEngine';
import { usePythPrice, deriveMarketRate, formatOracleDelta } from '@/lib/usePythPrice';

// ── Transaction lifecycle ─────────────────────────────────────────────────────
type TxPhase = 'idle' | 'quoting' | 'approving' | 'submitting' | 'confirming' | 'done' | 'err';
const SLIPPAGE_PRESETS = ['0.1', '0.5', '1.0'];

type StepState = 'pending' | 'active' | 'done' | 'err';

function TxLifecycleStepper({ phase, txHash, error }: {
  phase: TxPhase;
  txHash?: `0x${string}`;
  error?: string;
}) {
  const steps = ['Quote', 'Sign', 'Submit', 'Confirm'];
  const states: StepState[] = [
    // Quote: done once we leave idle/quoting
    phase === 'idle' || phase === 'quoting' ? (phase === 'quoting' ? 'active' : 'pending') : 'done',
    // Sign: active during approving/submitting (wallet open), done after
    phase === 'approving' || phase === 'submitting' ? 'active' : phase === 'idle' || phase === 'quoting' ? 'pending' : phase === 'err' ? 'err' : 'done',
    // Submit: active during confirming, done after
    phase === 'confirming' ? 'active' : phase === 'done' ? 'done' : phase === 'err' ? 'err' : 'pending',
    // Confirm: done when done, err when err
    phase === 'done' ? 'done' : phase === 'err' ? 'err' : 'pending',
  ];

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Transaction status</span>
        {txHash && (
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, txHash)}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-[11px]"
            style={{ color: 'var(--accent-teal)' }}
          >
            View on explorer <ExternalLink size={9} className="ml-0.5" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-0">
        {steps.map((label, i) => {
          const s = states[i];
          const isLast = i === steps.length - 1;
          const dotColor = s === 'done' ? 'var(--success)' : s === 'active' ? 'var(--accent)' : s === 'err' ? 'var(--danger)' : 'var(--surface-strong)';
          const lineColor = states[i + 1] === 'done' || s === 'done' ? 'var(--success)' : 'var(--border)';
          return (
            <div key={label} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: dotColor,
                    border: s === 'pending' ? '2px solid var(--border)' : 'none',
                    boxShadow: s === 'active' ? '0 0 0 3px rgba(15,157,107,0.2)' : 'none',
                  }}
                >
                  {s === 'done' && <CheckCircle2 size={12} color="#fff" />}
                  {s === 'active' && <RefreshCw size={10} color="#fff" className="animate-spin" />}
                  {s === 'err'  && <AlertTriangle size={10} color="#fff" />}
                  {s === 'pending' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--subtle)' }} />}
                </div>
                <span className="text-[10px] font-semibold mt-1 text-center leading-tight" style={{
                  color: s === 'done' ? 'var(--success)' : s === 'active' ? 'var(--accent)' : s === 'err' ? 'var(--danger)' : 'var(--subtle)',
                }}>{label}</span>
              </div>
              {!isLast && (
                <div className="flex-1 h-0.5 mx-1 mt-[-10px] rounded-full transition-all duration-500"
                  style={{ background: lineColor }} />
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <p className="text-xs mt-2 font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
    </div>
  );
}

interface SwapTabProps {
  onNavigate?: (tab: string) => void;
  chartOpen?: boolean;
  onToggleChart?: () => void;
  onPairChange?: (tokenIn: Token, tokenOut: Token) => void;
}

export default function SwapTab({ onNavigate: _onNavigate, chartOpen = false, onToggleChart, onPairChange }: SwapTabProps) {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const factory = useFactoryAddress();
  const publicClient = usePublicClient();

  const [tokenIn, setTokenIn] = useState<Token>(FEATURED_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(FEATURED_TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [selectorOpen, setSelectorOpen] = useState<'in' | 'out' | null>(null);
  const [phase, setPhase] = useState<TxPhase>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txError, setTxError] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [customSlippage, setCustomSlippage] = useState('');
  const [deadline, setDeadline] = useState('20');
  const swapContextRef = useRef({ amountIn: '', symbolIn: '', symbolOut: '', amountOut: '' });

  // Tell the page which pair is selected so the price chart can follow it.
  useEffect(() => { onPairChange?.(tokenIn, tokenOut); }, [tokenIn, tokenOut, onPairChange]);

  // ── Route aggregator ─────────────────────────────────────────────────────
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<RouteOption['id'] | null>(null);
  const routeFetchRef = useRef(0);

  // ── Pyth oracle ──────────────────────────────────────────────────────────
  const oracleFeedKeys = useMemo(() => {
    const keys: ('EURC/USD' | 'BTC/USD' | 'ETH/USD' | 'USDC/USD')[] = ['USDC/USD'];
    if (tokenIn.symbol === 'EURC'   || tokenOut.symbol === 'EURC')   keys.push('EURC/USD');
    if (tokenIn.symbol === 'cirBTC' || tokenOut.symbol === 'cirBTC') keys.push('BTC/USD');
    if (tokenIn.symbol === 'WETH'   || tokenOut.symbol === 'WETH')   keys.push('ETH/USD');
    return keys;
  }, [tokenIn.symbol, tokenOut.symbol]);
  const { prices: oraclePrices } = usePythPrice(oracleFeedKeys);
  const marketRate = useMemo(
    () => deriveMarketRate(oraclePrices, tokenIn.symbol, tokenOut.symbol),
    [oraclePrices, tokenIn.symbol, tokenOut.symbol],
  );

  // ── EcoSwap pool state ───────────────────────────────────────────────────
  const { pairAddress, refetch: refetchPair } = usePairAddress(tokenIn.address, tokenOut.address);
  const { pairInfo } = usePairInfo(
    pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' ? pairAddress : undefined,
  );
  const { balance: balanceIn } = useTokenBalance(tokenIn.address, address);
  const { balance: balanceOut } = useTokenBalance(tokenOut.address, address);

  const isToken0In = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
  const reserveIn = pairInfo ? (isToken0In ? pairInfo.reserve0 : pairInfo.reserve1) : 0n;
  const reserveOut = pairInfo ? (isToken0In ? pairInfo.reserve1 : pairInfo.reserve0) : 0n;

  const parsedAmountIn = amountIn && !isNaN(parseFloat(amountIn)) ? parseUnits(amountIn, tokenIn.decimals) : 0n;
  const amountOutRaw = getAmountOut(parsedAmountIn, reserveIn, reserveOut);

  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? null;
  const amountOutDisplay = selectedRoute?.isAvailable && selectedRoute.expectedOutputAmount !== '—'
    ? selectedRoute.expectedOutputAmount
    : formatUnits(amountOutRaw, tokenOut.decimals);
  const priceImpact = selectedRoute?.isAvailable
    ? selectedRoute.priceImpactPercentage
    : getPriceImpact(parsedAmountIn, reserveIn, reserveOut);
  const oracleDelta = useMemo(() => {
    const outNum = parseFloat(amountOutDisplay);
    const inNum  = parseFloat(amountIn);
    if (!outNum || !inNum || !marketRate) return null;
    return formatOracleDelta(outNum, inNum, marketRate);
  }, [amountOutDisplay, amountIn, marketRate]);

  const pairExists = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
  const hasEnoughBalance = balanceIn !== undefined && parsedAmountIn <= balanceIn;
  const effectiveSlippage = parseFloat(customSlippage || slippage) || 0.5;
  const minReceived = selectedRoute?.isAvailable && selectedRoute.minimumReceived !== '—'
    ? selectedRoute.minimumReceived
    : amountOutRaw > 0n
      ? formatUnits(amountOutRaw * BigInt(Math.floor((1 - effectiveSlippage / 100) * 10000)) / 10000n, tokenOut.decimals)
      : '0';

  // ── Single async write hook ───────────────────────────────────────────────
  const { writeContractAsync } = useWriteContract();

  // ── Fetch routes ──────────────────────────────────────────────────────────
  const fetchRoutes = useCallback(async (
    ai: string, tIn: Token, tOut: Token,
  ) => {
    if (!factory || !publicClient || !ai || isNaN(parseFloat(ai)) || parseFloat(ai) <= 0) {
      setRoutes([]); setSelectedRouteId(null); return;
    }
    const fetchId = ++routeFetchRef.current;
    setRoutesLoading(true);
    try {
      const result = await fetchAllLPRoutes({
        amountIn: ai,
        tokenIn:          tIn.address  as `0x${string}`,
        tokenOut:         tOut.address as `0x${string}`,
        tokenInSymbol:    tIn.symbol,
        tokenOutSymbol:   tOut.symbol,
        tokenInDecimals:  tIn.decimals,
        tokenOutDecimals: tOut.decimals,
        client:           publicClient,
      });
      if (fetchId !== routeFetchRef.current) return;
      const BRIDGE_IDS = new Set(['cctp-bridge', 'synapse', 'layerzero']);
      const swapRoutes = result.filter(r => !BRIDGE_IDS.has(r.id));
      const bestOut = swapRoutes.filter(r => r.isAvailable).reduce<number>((max, r) => {
        const v = parseFloat(r.expectedOutputAmount);
        return isNaN(v) ? max : Math.max(max, v);
      }, 0);
      const tagged = swapRoutes.map(r => ({
        ...r,
        isBestReturn: r.isAvailable && Math.abs(parseFloat(r.expectedOutputAmount) - bestOut) < 0.000001,
      }));
      setRoutes(tagged);
      const best = tagged.find(r => r.isBestReturn && r.isAvailable) ?? tagged.find(r => r.isAvailable);
      setSelectedRouteId(prev => (prev && tagged.find(r => r.id === prev)?.isAvailable) ? prev : (best?.id ?? null));
    } catch {
      if (fetchId !== routeFetchRef.current) return;
      setRoutes([]);
    } finally {
      if (fetchId === routeFetchRef.current) setRoutesLoading(false);
    }
  }, [factory, publicClient]);

  // Trigger route fetch on amount/token change
  const lastFetchParamsRef = useRef('');
  const triggerRouteFetch = useCallback((ai: string, tIn: Token, tOut: Token) => {
    const key = `${ai}:${tIn.address}:${tOut.address}`;
    if (key === lastFetchParamsRef.current) return;
    lastFetchParamsRef.current = key;
    void fetchRoutes(ai, tIn, tOut);
  }, [fetchRoutes]);

  // ── Core async swap pipeline ─────────────────────────────────────────────
  const handleAction = useCallback(async () => {
    if (!address || !parsedAmountIn || !publicClient) return;
    const route = routes.find(r => r.id === selectedRouteId);
    const routeId = route?.id ?? 'ecoswap-direct';

    // Reject unavailable routes immediately — no UI state change
    if (routeId === 'synapse' || routeId === 'layerzero') {
      setTxError('This route is not yet live on Arc Testnet.'); return;
    }
    if (routeId === 'cctp-bridge') {
      setTxError('Use the Bridge tab to cross-chain transfer.'); return;
    }

    const deadlineSecs = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadline) * 60);
    const slipFactor   = BigInt(Math.floor((1 - effectiveSlippage / 100) * 10000));
    const amountOutParsed = parseUnits(amountOutDisplay || '0', tokenOut.decimals);
    const amountOutMin    = amountOutParsed * slipFactor / 10000n;

    swapContextRef.current = {
      amountIn,
      symbolIn:  tokenIn.symbol,
      symbolOut: tokenOut.symbol,
      amountOut: parseFloat(amountOutDisplay).toFixed(4),
    };

    setTxHash(undefined);
    setTxError(undefined);
    setPhase('quoting');

    try {
      // ── EcoSwap: transfer→swap ──────────────────────────────────────────
      if (routeId === 'ecoswap-v2' || routeId === 'ecoswap-direct' || routeId === 'ecoswap-multihop' || routeId === 'ecoswap-split') {
        if (!pairAddress) throw new Error('No EcoSwap pool for this pair.');
        if (amountOutRaw === 0n) throw new Error('Pool has no liquidity.');

        console.info('[EcoSwap] Step 1: transfer tokens to pool', pairAddress);
        setPhase('approving'); // "Sign" step — wallet opens for transfer
        const transferHash = await writeContractAsync({
          address: tokenIn.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [pairAddress, parsedAmountIn],
          gas: 300000n,
        });
        console.info('[EcoSwap] Transfer submitted:', transferHash);

        setPhase('submitting'); // waiting for transfer to confirm
        await publicClient.waitForTransactionReceipt({ hash: transferHash });
        console.info('[EcoSwap] Transfer confirmed. Step 2: calling swap()');

        const a0Out = isToken0In ? 0n : amountOutRaw;
        const a1Out = isToken0In ? amountOutRaw : 0n;

        setPhase('confirming'); // wallet opens for swap
        const swapHash = await writeContractAsync({
          address: pairAddress,
          abi: ECOSWAP_POOL_ABI,
          functionName: 'swap',
          args: [a0Out, a1Out, address, '0x'],
          gas: 300000n,
        });
        console.info('[EcoSwap] Swap submitted:', swapHash);

        await publicClient.waitForTransactionReceipt({ hash: swapHash });
        console.info('[EcoSwap] Swap confirmed!');

        setTxHash(swapHash);
        setPhase('done');
        addActivity({ type: 'swap', description: `Swapped ${swapContextRef.current.amountIn} ${swapContextRef.current.symbolIn} → ~${swapContextRef.current.amountOut} ${swapContextRef.current.symbolOut}`, txHash: swapHash, chainId: ARC_TESTNET_CHAIN_ID, explorerBase: 'https://explorer.testnet.arc.io' });
        if (address) awardLeaves(address, 'swap', swapHash);
        void refetchPair();
        return;
      }

      // ── Uniswap V2: approve→swapExactTokensForTokens ───────────────────
      if (routeId === 'uniswap-v2' || routeId === 'univ2-direct') {
        console.info('[UniV2] Step 1: approve router');
        setPhase('approving');
        const approveHash = await writeContractAsync({
          address: tokenIn.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [UNIV2_ROUTER as `0x${string}`, maxUint256],
          gas: 150000n,
        });
        setPhase('submitting');
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.info('[UniV2] Approved. Step 2: swap');

        setPhase('confirming');
        const swapHash = await writeContractAsync({
          address: UNIV2_ROUTER,
          abi: UNIV2_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [parsedAmountIn, amountOutMin, [tokenIn.address as `0x${string}`, tokenOut.address as `0x${string}`], address, deadlineSecs],
          gas: 500000n,
        });
        await publicClient.waitForTransactionReceipt({ hash: swapHash });

        setTxHash(swapHash);
        setPhase('done');
        addActivity({ type: 'swap', description: `Swapped ${swapContextRef.current.amountIn} ${swapContextRef.current.symbolIn} → ~${swapContextRef.current.amountOut} ${swapContextRef.current.symbolOut}`, txHash: swapHash, chainId: ARC_TESTNET_CHAIN_ID, explorerBase: 'https://explorer.testnet.arc.io' });
        if (address) awardLeaves(address, 'swap', swapHash);
        void refetchPair();
        return;
      }

      // ── XyloNet StableSwap: approve→swap ───────────────────────────────
      if (routeId === 'xylo-stable' || routeId === 'xylonet-stable') {
        console.info('[XyloNet] Step 1: approve pool');
        setPhase('approving');
        const approveHash = await writeContractAsync({
          address: tokenIn.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [XYLO_STABLE_POOL_ADDRESS as `0x${string}`, maxUint256],
          gas: 150000n,
        });
        setPhase('submitting');
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.info('[XyloNet] Approved. Step 2: swap');

        setPhase('confirming');
        const swapHash = await writeContractAsync({
          address: XYLO_STABLE_POOL_ADDRESS,
          abi: XYLO_STABLE_POOL_ABI,
          functionName: 'swap',
          args: [tokenIn.address as `0x${string}`, tokenOut.address as `0x${string}`, parsedAmountIn, amountOutMin, address, deadlineSecs],
          gas: 500000n,
        });
        await publicClient.waitForTransactionReceipt({ hash: swapHash });

        setTxHash(swapHash);
        setPhase('done');
        addActivity({ type: 'swap', description: `Swapped ${swapContextRef.current.amountIn} ${swapContextRef.current.symbolIn} → ~${swapContextRef.current.amountOut} ${swapContextRef.current.symbolOut}`, txHash: swapHash, chainId: ARC_TESTNET_CHAIN_ID, explorerBase: 'https://explorer.testnet.arc.io' });
        if (address) awardLeaves(address, 'swap', swapHash);
        void refetchPair();
        return;
      }

      // ── Uniswap V3 / UnitFlow V3: approve→exactInputSingle ─────────────
      if (routeId === 'uniswap-v3' || routeId === 'univ3-direct' || routeId === 'unitflow-v3') {
        const router  = (routeId === 'uniswap-v3' || routeId === 'univ3-direct') ? UNIV3_ROUTER : UNITFLOW_ROUTER;
        const feeTier = 3000;
        console.info(`[${routeId}] Step 1: approve router`);
        setPhase('approving');
        const approveHash = await writeContractAsync({
          address: tokenIn.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [router as `0x${string}`, maxUint256],
          gas: 150000n,
        });
        setPhase('submitting');
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        setPhase('confirming');
        const swapHash = await writeContractAsync({
          address: router,
          abi: UNIV3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          gas: 500000n,
          args: [{
            tokenIn:           tokenIn.address  as `0x${string}`,
            tokenOut:          tokenOut.address as `0x${string}`,
            fee:               feeTier,
            recipient:         address,
            deadline:          deadlineSecs,
            amountIn:          parsedAmountIn,
            amountOutMinimum:  amountOutMin,
            sqrtPriceLimitX96: 0n,
          }],
        });
        await publicClient.waitForTransactionReceipt({ hash: swapHash });

        setTxHash(swapHash);
        setPhase('done');
        addActivity({ type: 'swap', description: `Swapped ${swapContextRef.current.amountIn} ${swapContextRef.current.symbolIn} → ~${swapContextRef.current.amountOut} ${swapContextRef.current.symbolOut}`, txHash: swapHash, chainId: ARC_TESTNET_CHAIN_ID, explorerBase: 'https://explorer.testnet.arc.io' });
        if (address) awardLeaves(address, 'swap', swapHash);
        void refetchPair();
        return;
      }

      // ── Intent solver — use best available live route ───────────────────
      if (routeId === 'intent-solver') {
        const fallback = routes.find(r => r.isAvailable && r.id !== 'intent-solver' && r.id !== 'cctp-bridge');
        if (!fallback) throw new Error('No live route available for intent solver.');
        setSelectedRouteId(fallback.id);
        setPhase('idle');
        return;
      }

      throw new Error(`Unknown route: ${routeId}`);

    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      console.error('CRITICAL DEX ERROR:', err);
      // User rejection — reset quietly
      const isRejected = raw.includes('rejected') || raw.includes('denied') || raw.includes('cancelled') || raw.includes('user rejected');
      setTxError(isRejected ? 'Transaction rejected in wallet.' : `Failed: ${raw.slice(0, 120)}`);
      setPhase('err');
    }
  }, [
    address, parsedAmountIn, publicClient, routes, selectedRouteId,
    pairAddress, amountOutRaw, isToken0In, amountIn, amountOutDisplay,
    tokenIn, tokenOut, deadline, effectiveSlippage,
    writeContractAsync, refetchPair,
  ]);

  const handleFlip = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setPhase('idle');
    setTxHash(undefined);
    setTxError(undefined);
    setRoutes([]);
    setSelectedRouteId(null);
    lastFetchParamsRef.current = '';
  };

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;
  const isProcessing = phase === 'quoting' || phase === 'approving' || phase === 'submitting' || phase === 'confirming';
  const impactNum = parseFloat(priceImpact);
  const impactColor = impactNum < 1 ? 'var(--success)' : impactNum < 5 ? 'var(--warning)' : 'var(--danger)';

  const hasValidRoute = selectedRouteId !== null && routes.find(r => r.id === selectedRouteId)?.isAvailable === true;
  const selectedNeedsEcoSwapPool = !selectedRouteId || selectedRouteId.startsWith('ecoswap');
  const canSwap = hasEnoughBalance
    && !!amountIn && parseFloat(amountIn) > 0
    && (hasValidRoute || routes.length === 0)
    && (!selectedNeedsEcoSwapPool || !!pairExists);

  const getButtonLabel = (): string => {
    if (!address) return 'Connect Wallet';
    if (isWrongChain) return 'Switch to Arc Testnet';
    if (!amountIn || parseFloat(amountIn) === 0) return 'Enter an Amount';
    if (routes.length > 0 && !hasValidRoute) return 'Select a Route Above';
    if (selectedNeedsEcoSwapPool && !pairExists) return 'No EcoSwap Pool — Pick Another Route';
    if (!hasEnoughBalance) return `Insufficient ${tokenIn.symbol}`;
    if (phase === 'approving') return selectedNeedsEcoSwapPool ? `Sending ${tokenIn.symbol} to pool…` : 'Approve in Wallet…';
    if (phase === 'submitting') return 'Waiting for Approval…';
    if (phase === 'confirming') return 'Confirm Swap in Wallet…';
    if (phase === 'done') return 'Swap Again';
    return `Swap via ${selectedRoute?.name ?? 'Best Route'}`;
  };

  const handleButton = () => {
    if (!address) return;
    if (isWrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return; }
    if (phase === 'done') { setPhase('idle'); setTxHash(undefined); setTxError(undefined); setAmountIn(''); return; }
    if (!canSwap || isProcessing) return;
    void handleAction();
  };

  const isButtonDisabled = !address ? false : isWrongChain ? false : (!canSwap || isProcessing);

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>Swap</h2>
          {rate && (
            <span
              className="inline-flex items-center tabular text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
            >
              1 {tokenIn.symbol} ≈ {rate} {tokenOut.symbol} · 0.3% fee
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onToggleChart && (
            <button
              onClick={onToggleChart}
              className="p-2 rounded-xl transition-colors"
              style={{ background: chartOpen ? 'var(--bg-hover)' : 'transparent', color: chartOpen ? 'var(--ink)' : 'var(--ink-2)' }}
              aria-label={chartOpen ? 'Hide price chart' : 'Show price chart'}
              aria-pressed={chartOpen}
              title="Price chart"
            >
              <LineChart size={16} />
            </button>
          )}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="p-2 rounded-xl transition-colors"
            style={{ background: showSettings ? 'var(--surface-muted)' : 'transparent', color: 'var(--ink-2)' }}
            aria-label="Swap settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-2xl p-4 mb-4 space-y-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Slippage tolerance</span>
            <Tooltip text="Max price movement you accept. Higher = less likely to fail.">
              <Info size={13} style={{ color: 'var(--subtle)' }} />
            </Tooltip>
          </div>
          <div className="flex gap-2">
            {SLIPPAGE_PRESETS.map(p => (
              <button
                key={p}
                onClick={() => { setSlippage(p); setCustomSlippage(''); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: slippage === p && !customSlippage ? 'var(--accent)' : 'var(--surface)',
                  color: slippage === p && !customSlippage ? '#fff' : 'var(--ink-2)',
                }}
              >{p}%</button>
            ))}
            <input
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold outline-none min-w-0"
              style={{ background: 'var(--surface)', color: 'var(--ink)', border: customSlippage ? '1.5px solid var(--accent)' : '1px solid var(--border)' }}
              placeholder="Custom %"
              value={customSlippage}
              onChange={e => { setCustomSlippage(e.target.value); setSlippage(''); }}
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs" style={{ color: 'var(--ink-2)' }}>Deadline</span>
            <input
              className="w-16 px-2 py-1 rounded-lg text-xs text-center outline-none"
              style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)' }}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>minutes</span>
          </div>
        </div>
      )}

      {/* Token In */}
      <div className="rounded-2xl p-4 pb-3 mb-0.5" style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>You pay</span>
          {balanceIn !== undefined && (
            <button
              className="text-[11px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--muted)' }}
              onClick={() => setAmountIn(formatTokenAmount(balanceIn, tokenIn.decimals))}
            >
              {formatTokenAmount(balanceIn, tokenIn.decimals)} <span style={{ color: 'var(--accent)' }}>MAX</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            className="flex-1 font-bold bg-transparent outline-none tabular min-w-0"
            style={{ color: 'var(--ink)', fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.03em' }}
            placeholder="0"
            value={amountIn}
            onChange={e => {
              setAmountIn(e.target.value);
              triggerRouteFetch(e.target.value, tokenIn, tokenOut);
            }}
            onKeyDown={e => e.key === 'Enter' && canSwap && !isProcessing && handleButton()}
          />
          <TokenPill token={tokenIn} onClick={() => setSelectorOpen('in')} />
        </div>
      </div>

      {/* Flip */}
      <div className="flex justify-center relative z-10 -my-[1px]">
        <button
          onClick={handleFlip}
          className="flip-btn"
          style={{ width: 34, height: 34, borderRadius: 10 }}
        >
          <ArrowUpDown size={14} />
        </button>
      </div>

      {/* Token Out */}
      <div className="rounded-2xl p-4 pb-3 mt-0.5 mb-4" style={{ background: 'var(--surface-input)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>You receive</span>
          {balanceOut !== undefined && (
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
              {formatTokenAmount(balanceOut, tokenOut.decimals)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex-1 font-bold tabular"
            style={{ color: parsedAmountIn > 0n ? 'var(--ink)' : 'var(--subtle)', fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.03em' }}
          >
            {parsedAmountIn > 0n ? parseFloat(amountOutDisplay).toFixed(6) : '0'}
          </span>
          <TokenPill token={tokenOut} onClick={() => setSelectorOpen('out')} />
        </div>
      </div>

      {/* Route selector */}
      {(routes.length > 0 || routesLoading) && (
        <div className="mb-4">
          <RouteSelector
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            isLoading={routesLoading}
            tokenOutSymbol={tokenOut.symbol}
          />
        </div>
      )}

      {/* High impact warning */}
      {impactNum >= 3 && parsedAmountIn > 0n && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={14} color="var(--danger)" />
          <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
            High price impact: {parseFloat(priceImpact).toFixed(2)}%
          </span>
        </div>
      )}

      {/* Quote breakdown */}
      {parsedAmountIn > 0n && amountOutDisplay !== '0.0' && (
        <div className="mb-4">
          <button
            className="flex items-center justify-between w-full text-xs px-1 mb-2"
            onClick={() => setShowDetails(d => !d)}
          >
            <span style={{ color: 'var(--ink-2)' }}>Quote details</span>
            {showDetails ? <ChevronUp size={13} style={{ color: 'var(--subtle)' }} /> : <ChevronDown size={13} style={{ color: 'var(--subtle)' }} />}
          </button>
          {showDetails && (
            <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--ink-2)' }}>Min received</span>
                <span className="font-semibold tabular" style={{ color: 'var(--ink)' }}>{parseFloat(minReceived).toFixed(6)} {tokenOut.symbol}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--ink-2)' }}>Price impact</span>
                <span className="font-semibold tabular" style={{ color: impactColor }}>{parseFloat(priceImpact).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--ink-2)' }}>Slippage</span>
                <span className="font-semibold tabular" style={{ color: 'var(--ink)' }}>{effectiveSlippage}%</span>
              </div>
              {marketRate && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--ink-2)' }}>Oracle rate</span>
                  <span className="font-semibold tabular" style={{ color: 'var(--ink)' }}>
                    1 {tokenIn.symbol} = {marketRate.toFixed(6)} {tokenOut.symbol}
                  </span>
                </div>
              )}
              {oracleDelta && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--ink-2)' }}>vs. market</span>
                  <span className="font-semibold tabular" style={{ color: oracleDelta.isAbove ? 'var(--success)' : 'var(--danger)' }}>
                    {oracleDelta.isAbove ? '+' : ''}{oracleDelta.label}
                  </span>
                </div>
              )}
              {selectedRoute && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--ink-2)' }}>Gas estimate</span>
                  <span className="font-semibold tabular" style={{ color: 'var(--ink)' }}>{selectedRoute.estimatedGasFeeUsd}</span>
                </div>
              )}
              {selectedRoute && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--ink-2)' }}>Est. time</span>
                  <span className="font-semibold tabular" style={{ color: 'var(--ink)' }}>~{selectedRoute.estimatedTimeSeconds}s</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transaction lifecycle stepper */}
      {phase !== 'idle' && (
        <div className="mb-4">
          <TxLifecycleStepper phase={phase} txHash={txHash} error={txError} />
        </div>
      )}

      {/* Error dismiss (err state only) */}
      {phase === 'err' && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} color="var(--danger)" />
            <span className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
              {txError ?? 'Transaction failed or rejected. Please try again.'}
            </span>
          </div>
          <button
            onClick={() => { setPhase('idle'); setTxError(undefined); }}
            className="text-xs font-semibold px-3 py-1 rounded-lg ml-2"
            style={{ background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Swap button */}
      <button
        onClick={handleButton}
        disabled={isButtonDisabled}
        className="w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 active:scale-[0.98]"
        style={{
          background: isButtonDisabled ? 'var(--surface-strong)' : 'linear-gradient(135deg, var(--accent), var(--accent-teal))',
          color: isButtonDisabled ? 'var(--subtle)' : '#fff',
          cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
          boxShadow: isButtonDisabled ? 'none' : '0 4px 20px rgba(15,157,107,0.35)',
        }}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            {getButtonLabel()}
          </span>
        ) : getButtonLabel()}
      </button>

      {/* Token selector modals */}
      {selectorOpen && (
        <TokenSelector
          selected={selectorOpen === 'in' ? tokenIn : tokenOut}
          onSelect={(t) => {
            if (selectorOpen === 'in') {
              setTokenIn(t);
              triggerRouteFetch(amountIn, t, tokenOut);
            } else {
              setTokenOut(t);
              triggerRouteFetch(amountIn, tokenIn, t);
            }
            setSelectorOpen(null);
          }}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </div>
  );
}
