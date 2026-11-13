/**
 * wagmi configuration — EcoSwap
 * Chains: Arc Testnet + all CCTP V2-supported testnets for bridge
 * Source: developers.circle.com/cctp/references/contract-addresses
 */

import { http, createConfig } from 'wagmi'
import {
  mainnet,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  avalancheFuji,
  polygonAmoy,
  unichainSepolia,
  lineaSepolia,
  monadTestnet,
  inkSepolia,
  plumeSepolia,
  worldchainSepolia,
  sonicBlazeTestnet,
  xdcTestnet,
} from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [
    arcTestnet,
    sepolia,
    baseSepolia,
    arbitrumSepolia,
    optimismSepolia,
    avalancheFuji,
    polygonAmoy,
    unichainSepolia,
    lineaSepolia,
    monadTestnet,
    inkSepolia,
    plumeSepolia,
    worldchainSepolia,
    sonicBlazeTestnet,
    xdcTestnet,
    mainnet, // mainnet needed for ENS resolution only
  ],
  connectors: [injected()],
  transports: {
    // Use the more reliable arc.io RPC as primary.
    // batch: false disables Multicall3 batching — Multicall3 on Arc Testnet
    // times out after 10s and corrupts subsequent writeContract calls.
    [arcTestnet.id]: http('https://rpc.testnet.arc.io', { batch: false }),
    [sepolia.id]:            http(),
    [baseSepolia.id]:        http(),
    [arbitrumSepolia.id]:    http(),
    [optimismSepolia.id]:    http(),
    [avalancheFuji.id]:      http(),
    [polygonAmoy.id]:        http(),
    [unichainSepolia.id]:    http(),
    [lineaSepolia.id]:       http(),
    [monadTestnet.id]:       http(),
    [inkSepolia.id]:         http(),
    [plumeSepolia.id]:       http(),
    [worldchainSepolia.id]:  http(),
    [sonicBlazeTestnet.id]:  http(),
    [xdcTestnet.id]:         http(),
    [mainnet.id]:            http(),
  },
})
