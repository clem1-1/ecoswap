import { useState, useCallback, useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Zap, ExternalLink, Info, RefreshCw, ArrowUpDown } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, usePublicClient } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';
import TokenSelector, { TokenPill } from './TokenSelector';
import { Tooltip } from './ui/Tooltip';
import { FEATURED_TOKENS, type Token } from '@/constants/tokens';
import {
  useFactoryAddress, usePairAddress, usePairInfo,
  useTokenBalance, getAmountOut, formatTokenAmount, ARC_TESTNET_CHAIN_ID,
} from '@/hooks/useEcoSwap';
import { ECOSWAP_POOL_ABI } from '@/constants/contracts';
import { addActivity } from '@/hooks/useActivity';
import { buildTxExplorerUrl } from '@/onchain-facts';
import { addLimitOrder, cancelLimitOrder, isOrderTriggered, useLimitOrders, type LimitOrder } from '@/hooks/useLimitOrders';
import { usePythPrice, deriveMarketRate } from '@/lib/usePythPrice';
import { fetchAllLPRoutes } from '@/lib/routeEngine';

type PlacePhase = 'idle' | 'transferring' | 'swapping' | 'done' | 'err';

const EXPIRY_OPTIONS = [
  { label: '1h',  ms: 60 * 60 * 1000 },
  { label: '6h',  ms: 6 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7d',  ms: 7 * 24 * 60 * 60 * 1000 },
];

function OrderStatusBadge({ status, triggered }: { status: LimitOrder['status']; triggered?: boolean }) {
  if (status === 'open' && triggered) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse"
        style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' }}>
        <Zap size={9} /> TRIGGERED
      </span>
    );
  }
  const map = {
    open:      { bg: 'rgba(15,157,107,0.12)', color: 'var(--success)',  label: 'OPEN' },
    filled:    { bg: 'rgba(16,185,129,0.12)', color: '#10B981',          label: 'FILLED' },
    cancelled: { bg: 'rgba(100,116,139,0.12)', color: 'var(--muted)',   label: 'CANCELLED' },
    expired:   { bg: 'rgba(240,82,82,0.12)',  color: 'var(--danger)',    label: 'EXPIRED' },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function OrderCard({
  order,
  now,
  onExecute,
  onCancel,
}: {
  order: LimitOrder;
  now: number;
  onExecute: (order: LimitOrder) => void | Promise<void>;
  onCancel: (id: string) => void;
}) {
  const current = order.currentPrice ? parseFloat(order.currentPrice) : null;
  const target = parseFloat(order.targetPrice);
  const triggered = current !== null && isOrderTriggered(order, current);
  const timeLeft = order.expiresAt - now;
  const timeLeftStr = timeLeft > 0
    ? timeLeft > 3_600_000
      ? `${Math.floor(timeLeft / 3_600_000)}h left`
      : `${Math.floor(timeLeft / 60_000)}m left`
    : 'expired';

  const progress = current !== null && target > 0
    ? Math.min(100, (current / target) * 100)
    : 0;

  return (
    <div
      className="rounded-2xl p-4 space-y-3 transition-all"
      style={{
        background: triggered ? 'rgba(245,158,11,0.06)' : 'var(--surface-muted)',
        border: `1px solid ${triggered ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(15,157,107,0.1)' }}>
            <ArrowUpDown size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>
              {order.amountIn} {order.symbolIn} → {order.symbolOut}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Target: 1 {order.symbolIn} = {order.targetPrice} {order.symbolOut}
            </p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} triggered={triggered} />
      </div>

      {/* Progress bar — how close current price is to target */}
      {order.status === 'open' && current !== null && (
        <div>
          <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
            <span>Current: {current.toFixed(4)} {order.symbolOut}/{order.symbolIn}</span>
            <span className="tabular">{progress.toFixed(0)}% to target</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-strong)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: triggered ? 'var(--warning)' : 'var(--grad-btn)',
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--subtle)' }}>
          <span><Clock size={10} className="inline mr-0.5" />{timeLeftStr}</span>
          {order.filledTxHash && (
            <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, order.filledTxHash)}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5" style={{ color: 'var(--accent-teal)' }}>
              Tx <ExternalLink size={9} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'open' && triggered && (
            <button
              onClick={() => { void onExecute(order); }}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
              style={{ background: 'var(--warning)', color: '#000' }}
            >
              Execute Now
            </button>
          )}
          {order.status === 'open' && (
            <button
              onClick={() => onCancel(order.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
              title="Cancel order"
            >
              <XCircle size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LimitOrderTab() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const factory = useFactoryAddress();
  const publicClient = usePublicClient();

  const [tokenIn, setTokenIn] = useState<Token>(FEATURED_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(FEATURED_TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [expiryMs, setExpiryMs] = useState(EXPIRY_OPTIONS[2].ms); // 24h default
  const [selectorOpen, setSelectorOpen] = useState<'in' | 'out' | null>(null);
  const [activeTab, setActiveTab] = useState<'place' | 'orders'>('place');
  const [phase, setPhase] = useState<PlacePhase>('idle');
  const [executingOrder, setExecutingOrder] = useState<LimitOrder | null>(null);

  const { pairAddress } = usePairAddress(tokenIn.address, tokenOut.address);
  const { pairInfo } = usePairInfo(
    pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' ? pairAddress : undefined,
  );
  const { balance: balanceIn } = useTokenBalance(tokenIn.address, address);
  const { orders, markFilled } = useLimitOrders(publicClient ?? undefined);

  const pairExists = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
  const isToken0In = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
  const reserveIn = pairInfo ? (isToken0In ? pairInfo.reserve0 : pairInfo.reserve1) : 0n;
  const reserveOut = pairInfo ? (isToken0In ? pairInfo.reserve1 : pairInfo.reserve0) : 0n;

  // Current pool spot price for reference
  const spotPrice = reserveIn > 0n
    ? parseFloat(formatUnits(reserveOut * parseUnits('1', tokenIn.decimals) / reserveIn, tokenOut.decimals))
    : null;

  // Pyth oracle price
  const pythFeedKeys = useMemo<('EURC/USD' | 'BTC/USD' | 'ETH/USD' | 'USDC/USD')[]>(() => {
    const k: ('EURC/USD' | 'BTC/USD' | 'ETH/USD' | 'USDC/USD')[] = ['USDC/USD'];
    if (tokenIn.symbol === 'EURC'   || tokenOut.symbol === 'EURC')   k.push('EURC/USD');
    if (tokenIn.symbol === 'cirBTC' || tokenOut.symbol === 'cirBTC') k.push('BTC/USD');
    if (tokenIn.symbol === 'WETH'   || tokenOut.symbol === 'WETH')   k.push('ETH/USD');
    return k;
  }, [tokenIn.symbol, tokenOut.symbol]);
  const { prices: oraclePrices, loading: oracleLoading } = usePythPrice(pythFeedKeys);
  const oracleRate = useMemo(
    () => deriveMarketRate(oraclePrices, tokenIn.symbol, tokenOut.symbol),
    [oraclePrices, tokenIn.symbol, tokenOut.symbol],
  );

  const parsedAmountIn = amountIn && !isNaN(parseFloat(amountIn))
    ? parseUnits(amountIn, tokenIn.decimals) : 0n;

  // Derived minAmountOut from target price × amountIn × (1 - 0.5% slippage)
  const targetPriceFloat = parseFloat(targetPrice) || 0;
  const minAmountOut = targetPriceFloat > 0 && parseFloat(amountIn) > 0
    ? (parseFloat(amountIn) * targetPriceFloat * 0.995).toFixed(tokenOut.decimals > 6 ? 8 : 6)
    : '0';

  // Execution via transfer→swap (same flow as SwapTab)
  const { writeContract: writeTransfer, data: transferTxHash, isPending: transferPending, isError: transferError } = useWriteContract();
  const { isSuccess: transferConfirmed } = useWaitForTransactionReceipt({ hash: transferTxHash });
  const { writeContract: writeSwap, data: swapTxHash, isPending: swapWalletPending, isError: swapError } = useWriteContract();
  const { isSuccess: swapConfirmed } = useWaitForTransactionReceipt({ hash: swapTxHash });

  const handlePlace = useCallback(() => {
    if (!address || !pairAddress || !pairExists || !amountIn || !targetPrice) return;
    if (!parsedAmountIn || parseFloat(targetPrice) <= 0) return;

    addLimitOrder({
      tokenIn: tokenIn.address as `0x${string}`,
      tokenOut: tokenOut.address as `0x${string}`,
      symbolIn: tokenIn.symbol,
      symbolOut: tokenOut.symbol,
      decimalsIn: tokenIn.decimals,
      decimalsOut: tokenOut.decimals,
      amountIn,
      targetPrice,
      minAmountOut,
      pairAddress: pairAddress,
      expiresAt: Date.now() + expiryMs,
    });
    setAmountIn('');
    setTargetPrice('');
    setActiveTab('orders');
  }, [address, pairAddress, pairExists, amountIn, targetPrice, parsedAmountIn, minAmountOut, tokenIn, tokenOut, expiryMs]);

  // Best route amountOut for the executing order — fetched just before execution
  const [executingAmtOut, setExecutingAmtOut] = useState(0n);

  const handleExecute = useCallback(async (order: LimitOrder) => {
    if (!address || !order.pairAddress || !publicClient) return;

    // Fetch best route for this specific order's token pair
    let bestAmtOut = 0n;
    let orderIsToken0In = order.tokenIn.toLowerCase() < order.tokenOut.toLowerCase();
    try {
      const routes = await fetchAllLPRoutes({
        amountIn: order.amountIn,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        tokenInSymbol: order.symbolIn,
        tokenOutSymbol: order.symbolOut,
        tokenInDecimals: order.decimalsIn,
        tokenOutDecimals: order.decimalsOut,
        client: publicClient,
      });
      const best = routes.find((r) => r.isAvailable && r.isBestReturn) ?? routes.find((r) => r.isAvailable);
      if (best && best.expectedOutputAmount !== '—') {
        bestAmtOut = parseUnits(best.expectedOutputAmount, order.decimalsOut);
      }
    } catch { /* fall through to pool math */ }

    // Fallback: read reserves from the order's specific pool
    if (bestAmtOut === 0n) {
      try {
        const reserves = await publicClient.readContract({
          address: order.pairAddress,
          abi: ECOSWAP_POOL_ABI,
          functionName: 'getReserves',
        }) as [bigint, bigint, number];
        const rIn  = orderIsToken0In ? reserves[0] : reserves[1];
        const rOut = orderIsToken0In ? reserves[1] : reserves[0];
        bestAmtOut = getAmountOut(parseUnits(order.amountIn, order.decimalsIn), rIn, rOut);
      } catch { return; }
    }

    if (bestAmtOut === 0n) return;

    setExecutingAmtOut(bestAmtOut);
    setExecutingOrder(order);
    setPhase('transferring');

    writeTransfer({
      address: order.tokenIn,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [order.pairAddress, parseUnits(order.amountIn, order.decimalsIn)],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  }, [address, publicClient, writeTransfer]);

  // Transfer confirmed → call swap (use executingAmtOut from best route)
  if (transferConfirmed && phase === 'transferring' && executingOrder) {
    const order = executingOrder;
    const orderToken0In = order.tokenIn.toLowerCase() < order.tokenOut.toLowerCase();
    const a0Out = orderToken0In ? 0n : executingAmtOut;
    const a1Out = orderToken0In ? executingAmtOut : 0n;
    setPhase('swapping');
    writeSwap({
      address: order.pairAddress,
      abi: ECOSWAP_POOL_ABI,
      functionName: 'swap',
      args: [a0Out, a1Out, address!, '0x'],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  }

  // Swap confirmed → mark filled
  if (swapConfirmed && swapTxHash && phase === 'swapping' && executingOrder) {
    const order = executingOrder;
    setPhase('done');
    setExecutingOrder(null);
    markFilled(order.id, swapTxHash);
    addActivity({
      type: 'swap',
      description: `Limit order filled: ${order.amountIn} ${order.symbolIn} → ${order.symbolOut}`,
      txHash: swapTxHash,
      chainId: ARC_TESTNET_CHAIN_ID,
      explorerBase: 'https://explorer.testnet.arc.io',
    });
  }

  if (transferError && phase === 'transferring') setPhase('err');
  if (swapError && phase === 'swapping') setPhase('err');

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;
  const isProcessing = phase === 'transferring' || phase === 'swapping' || transferPending || swapWalletPending;
  const canPlace = !!address && !isWrongChain && !!pairExists && !!amountIn && parseFloat(amountIn) > 0
    && !!targetPrice && parseFloat(targetPrice) > 0
    && balanceIn !== undefined && parsedAmountIn <= balanceIn;

  const openCount = orders.filter((o) => o.status === 'open').length;
  // Stable timestamp for rendering time-remaining — refreshes only when orders list changes
  const [nowMs] = useState(() => Date.now());

  if (!factory) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
        <RefreshCw size={28} className="mx-auto mb-3 opacity-30 animate-spin" />
        <p className="text-sm">Contracts not deployed yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>Limit Orders</h2>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          {(['place', 'orders'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all relative"
              style={{
                background: activeTab === t ? 'var(--surface-strong)' : 'transparent',
                color: activeTab === t ? 'var(--ink)' : 'var(--muted)',
                border: activeTab === t ? '1px solid var(--border-strong)' : '1px solid transparent',
              }}
            >
              {t === 'orders' ? 'My Orders' : 'Place Order'}
              {t === 'orders' && openCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'place' ? (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
            style={{ background: 'rgba(15,157,107,0.06)', border: '1px solid rgba(15,157,107,0.15)' }}>
            <Info size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              Set a target price and your order executes automatically when the pool price reaches it.
              Orders are monitored in your browser — keep this tab open or execute manually when triggered.
            </p>
          </div>

          {/* Token In */}
          <div className="glass-input rounded-2xl p-4" style={{ background: 'var(--surface-input)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>You sell</span>
              {address && balanceIn !== undefined && (
                <span className="text-xs tabular" style={{ color: 'var(--muted)' }}>
                  {formatTokenAmount(balanceIn, tokenIn.decimals, 4)} {tokenIn.symbol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number" min="0" placeholder="0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none font-extrabold tabular"
                style={{ color: 'var(--ink)', fontSize: 'clamp(20px,5vw,28px)', fontVariantNumeric: 'tabular-nums', width: 0 }}
              />
              <TokenPill token={tokenIn} onClick={() => setSelectorOpen('in')} />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
              <ArrowUpDown size={13} style={{ color: 'var(--muted)' }} />
            </div>
          </div>

          {/* Token Out */}
          <div className="glass-input rounded-2xl p-4" style={{ background: 'var(--surface-input)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>You receive</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 font-extrabold tabular" style={{ color: 'var(--subtle)', fontSize: 'clamp(20px,5vw,28px)', fontVariantNumeric: 'tabular-nums' }}>
                {targetPriceFloat > 0 && parseFloat(amountIn) > 0
                  ? (parseFloat(amountIn) * targetPriceFloat).toFixed(4)
                  : '0'}
              </div>
              <TokenPill token={tokenOut} onClick={() => setSelectorOpen('out')} />
            </div>
          </div>

          {/* Target price input */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Target price</span>
                <Tooltip text="Your order executes when the pool price reaches this rate" />
              </div>
              {spotPrice !== null && (
                <button
                  onClick={() => setTargetPrice(spotPrice.toFixed(6))}
                  className="text-[11px] px-2 py-0.5 rounded-lg font-semibold"
                  style={{ background: 'var(--surface-strong)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                >
                  Use market ({spotPrice.toFixed(4)})
                </button>
              )}
              {oracleRate !== null && (
                <button
                  onClick={() => setTargetPrice(oracleRate.toFixed(6))}
                  className="text-[11px] px-2 py-1 rounded-lg font-semibold"
                  style={{ background: 'rgba(20,184,166,0.12)', color: 'var(--accent-teal)', border: '1px solid rgba(20,184,166,0.25)' }}
                >
                  {oracleLoading ? 'Loading…' : `Use oracle (${oracleRate.toFixed(4)})`}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" placeholder="0.0000"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="flex-1 bg-transparent outline-none font-bold tabular text-lg glass-input rounded-xl px-3 py-2"
                style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}
              />
              <span className="text-sm font-medium flex-shrink-0 px-2" style={{ color: 'var(--muted)' }}>
                {tokenOut.symbol}/{tokenIn.symbol}
              </span>
            </div>
            {/* Rate comparison row */}
            <div className="flex items-center justify-between text-[11px] px-1">
              {spotPrice !== null && (
                <span style={{ color: 'var(--muted)' }}>
                  Pool: <span className="tabular-nums font-semibold" style={{ color: 'var(--ink-2)' }}>{spotPrice.toFixed(4)}</span>
                </span>
              )}
              {oracleRate !== null && (
                <span style={{ color: 'var(--muted)' }}>
                  Market price: <span className="tabular-nums font-semibold" style={{ color: 'var(--accent-teal)' }}>{oracleRate.toFixed(4)}</span>
                </span>
              )}
            </div>
            {targetPriceFloat > 0 && spotPrice !== null && (
              <p className="text-[11px]" style={{ color: targetPriceFloat < spotPrice ? 'var(--success)' : 'var(--warning)' }}>
                {targetPriceFloat < spotPrice
                  ? `${((1 - targetPriceFloat / spotPrice) * 100).toFixed(1)}% below pool — order will trigger when price drops`
                  : `${((targetPriceFloat / spotPrice - 1) * 100).toFixed(1)}% above pool — order triggers immediately (consider a market swap)`}
              </p>
            )}
            {targetPriceFloat > 0 && oracleRate !== null && (
              <p className="text-[11px]" style={{ color: targetPriceFloat < oracleRate ? 'var(--success)' : 'var(--warning)' }}>
                vs market: {targetPriceFloat < oracleRate
                  ? `${((1 - targetPriceFloat / oracleRate) * 100).toFixed(1)}% below oracle price`
                  : `${((targetPriceFloat / oracleRate - 1) * 100).toFixed(1)}% above oracle price`}
              </p>
            )}
          </div>

          {/* Expiry */}
          <div>
            <span className="text-xs font-semibold mb-2 block" style={{ color: 'var(--ink-2)' }}>Order expires in</span>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setExpiryMs(opt.ms)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: expiryMs === opt.ms ? 'var(--grad-btn)' : 'var(--surface-muted)',
                    color: expiryMs === opt.ms ? '#fff' : 'var(--muted)',
                    border: expiryMs === opt.ms ? 'none' : '1px solid var(--border)',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Place button */}
          <button
            onClick={isWrongChain ? () => switchChain({ chainId: ARC_TESTNET_CHAIN_ID }) : canPlace ? handlePlace : undefined}
            disabled={!address ? false : isWrongChain ? false : !canPlace}
            className="btn-primary w-full py-4"
            style={{ fontSize: 16, borderRadius: 'var(--radius-btn)' }}
          >
            {!address ? 'Connect Wallet'
              : isWrongChain ? 'Switch to Arc Testnet'
              : !pairExists ? 'No Pool for This Pair'
              : !amountIn || parseFloat(amountIn) === 0 ? 'Enter Amount'
              : !targetPrice || parseFloat(targetPrice) === 0 ? 'Set Target Price'
              : balanceIn !== undefined && parsedAmountIn > balanceIn ? `Insufficient ${tokenIn.symbol}`
              : 'Place Limit Order'}
          </button>
        </div>
      ) : (
        /* Orders list */
        <div className="space-y-3">
          {/* Execution feedback */}
          {phase === 'done' && (
            <div className="rounded-2xl p-3 flex items-center gap-2.5"
              style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>Order executed successfully!</span>
              <button onClick={() => setPhase('idle')} className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>✕</button>
            </div>
          )}
          {phase === 'err' && (
            <div className="rounded-2xl p-3 flex items-center gap-2.5"
              style={{ background: 'var(--danger-bg)', border: '1px solid rgba(240,82,82,0.18)' }}>
              <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>Execution failed. Try again.</span>
              <button onClick={() => setPhase('idle')} className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>✕</button>
            </div>
          )}
          {isProcessing && (
            <div className="rounded-2xl p-3 flex items-center gap-2.5 animate-pulse"
              style={{ background: 'rgba(15,157,107,0.06)', border: '1px solid rgba(15,157,107,0.15)' }}>
              <RefreshCw size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                {phase === 'transferring' ? 'Sending tokens to pool…' : 'Executing swap…'}
              </span>
            </div>
          )}

          {orders.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Clock size={28} className="mx-auto opacity-20" style={{ color: 'var(--muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>No orders yet</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Place a limit order to buy or sell at a target price.</p>
              <button
                onClick={() => setActiveTab('place')}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'var(--grad-btn)', color: '#fff' }}
              >Place Order</button>
            </div>
          ) : (
            <>
              {/* Open + triggered orders */}
              {orders.filter((o) => o.status === 'open').length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Open</span>
                  {orders.filter((o) => o.status === 'open').map((o) => (
                    <OrderCard key={o.id} order={o} now={nowMs}
                      onExecute={handleExecute}
                      onCancel={cancelLimitOrder} />
                  ))}
                </div>
              )}
              {/* History */}
              {orders.filter((o) => o.status !== 'open').length > 0 && (
                <div className="space-y-2 mt-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>History</span>
                  {orders.filter((o) => o.status !== 'open').slice(0, 10).map((o) => (
                    <OrderCard key={o.id} order={o} now={nowMs}
                      onExecute={handleExecute}
                      onCancel={cancelLimitOrder} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Token selector modal */}
      {selectorOpen && (
        <TokenSelector
          selected={selectorOpen === 'in' ? tokenIn : tokenOut}
          exclude={selectorOpen === 'in' ? tokenOut : tokenIn}
          userAddress={address}
          onSelect={(t) => {
            if (selectorOpen === 'in') setTokenIn(t); else setTokenOut(t);
            setAmountIn(''); setTargetPrice('');
          }}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </div>
  );
}
