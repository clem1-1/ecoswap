import { useReadContract, useReadContracts } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';
import { ECOSWAP_FACTORY_ABI, ECOSWAP_POOL_ABI } from '@/constants/contracts';
import { FEATURED_TOKENS, type Token, getTokenByAddress } from '@/constants/tokens';
import { ARC_TESTNET_CHAIN_ID } from '@/constants/tokens';

export function useFactoryAddress(): `0x${string}` | undefined {
  const raw: string | undefined = import.meta.env.VITE_ECOSWAP_FACTORY_ADDRESS as string | undefined;
  if (!raw || raw === '') return undefined;
  return raw as `0x${string}`;
}

export function usePairAddress(tokenA?: string, tokenB?: string) {
  const factory = useFactoryAddress();
  const { data, isLoading, refetch } = useReadContract({
    address: factory,
    abi: ECOSWAP_FACTORY_ABI,
    functionName: 'getPair',
    args: tokenA && tokenB
      ? [tokenA as `0x${string}`, tokenB as `0x${string}`]
      : undefined,
    query: { enabled: !!factory && !!tokenA && !!tokenB },
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  return { pairAddress: data, isLoading, refetch };
}

export function useAllPairsLength() {
  const factory = useFactoryAddress();
  const { data, isLoading } = useReadContract({
    address: factory,
    abi: ECOSWAP_FACTORY_ABI,
    functionName: 'allPairsLength',
    query: { enabled: !!factory },
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  return { length: data ? Number(data) : 0, isLoading };
}

export function usePairAtIndex(index: number) {
  const factory = useFactoryAddress();
  const { data, isLoading } = useReadContract({
    address: factory,
    abi: ECOSWAP_FACTORY_ABI,
    functionName: 'allPairs',
    args: [BigInt(index)],
    query: { enabled: !!factory },
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  return { pairAddress: data, isLoading };
}

export interface PairInfo {
  pairAddress: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  reserve0: bigint;
  reserve1: bigint;
  token0Meta: Token;
  token1Meta: Token;
  totalSupply: bigint;
}

export function usePairInfo(pairAddress?: `0x${string}`) {
  const contracts = pairAddress
    ? [
        { address: pairAddress, abi: ECOSWAP_POOL_ABI, functionName: 'token0', chainId: ARC_TESTNET_CHAIN_ID } as const,
        { address: pairAddress, abi: ECOSWAP_POOL_ABI, functionName: 'token1', chainId: ARC_TESTNET_CHAIN_ID } as const,
        { address: pairAddress, abi: ECOSWAP_POOL_ABI, functionName: 'getReserves', chainId: ARC_TESTNET_CHAIN_ID } as const,
        { address: pairAddress, abi: ECOSWAP_POOL_ABI, functionName: 'totalSupply', chainId: ARC_TESTNET_CHAIN_ID } as const,
      ]
    : [];

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled: !!pairAddress },
  });

  if (!data || !pairAddress) return { pairInfo: null, isLoading };

  const token0 = data[0]?.result as `0x${string}` | undefined;
  const token1 = data[1]?.result as `0x${string}` | undefined;
  const reserves = data[2]?.result as [bigint, bigint, number] | undefined;
  const totalSupply = data[3]?.result as bigint | undefined;

  if (!token0 || !token1 || !reserves) return { pairInfo: null, isLoading };

  const t0Meta = getTokenByAddress(token0) ?? { address: token0, symbol: token0.slice(0, 6), name: 'Unknown', decimals: 18, verified: false };
  const t1Meta = getTokenByAddress(token1) ?? { address: token1, symbol: token1.slice(0, 6), name: 'Unknown', decimals: 18, verified: false };

  return {
    pairInfo: {
      pairAddress,
      token0,
      token1,
      reserve0: reserves[0],
      reserve1: reserves[1],
      token0Meta: t0Meta,
      token1Meta: t1Meta,
      totalSupply: totalSupply ?? 0n,
    },
    isLoading,
  };
}

export function useTokenBalance(tokenAddress?: string, userAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokenAddress && !!userAddress },
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  return { balance: data, isLoading, refetch };
}

export function useTokenAllowance(tokenAddress?: string, owner?: `0x${string}`, spender?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!tokenAddress && !!owner && !!spender },
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  return { allowance: data, isLoading, refetch };
}

export function useLPBalance(pairAddress?: `0x${string}`, userAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: pairAddress,
    abi: ECOSWAP_POOL_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!pairAddress && !!userAddress },
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  return { lpBalance: data, isLoading, refetch };
}

// Compute output amount given input using x*y=k with 0.3% fee
export function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

// Compute price impact as a percentage string
export function getPriceImpact(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): string {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return '0.00';
  const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
  const spotPrice = (reserveOut * 10000n) / reserveIn;
  const execPrice = (amountOut * 10000n) / amountIn;
  if (spotPrice === 0n) return '0.00';
  const impact = spotPrice > execPrice ? ((spotPrice - execPrice) * 10000n) / spotPrice : 0n;
  return (Number(impact) / 100).toFixed(2);
}

// Format a token amount given raw bigint and decimals
export function formatTokenAmount(raw: bigint | undefined, decimals: number, maxDecimals = 6): string {
  if (raw === undefined) return '0.00';
  const str = formatUnits(raw, decimals);
  const num = parseFloat(str);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { maximumFractionDigits: maxDecimals, minimumFractionDigits: 2 });
}

export { FEATURED_TOKENS, ARC_TESTNET_CHAIN_ID, parseUnits, formatUnits };
