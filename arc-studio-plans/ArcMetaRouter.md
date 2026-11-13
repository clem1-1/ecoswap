# Implementation Plan: ArcMetaRouter + relayRoutingEngine

## Summary
Add `ArcMetaRouter.sol` and `src/lib/relayRoutingEngine.ts` to EcoSwap. Together they implement a meta-aggregator that scans multiple EcoSwap routing paths simultaneously and presents users with ranked route options — single-hop, multi-hop, split, intent-based solver, and CCTP bridge — matching the Relay.link UX model. No existing contracts are modified.

## Architecture
- **Blockchain:** Arc Testnet (chain ID 5042002) — only network with live EcoSwap pools
- **Contract:** `ArcMetaRouter.sol` — 7 execution modes, immutable protocol addresses, SafeERC20, ReentrancyGuard, Ownable. Deployed separately from EcoSwapFactory.
- **Engine:** `src/lib/relayRoutingEngine.ts` — pure TypeScript, reads live reserves via viem `readContract`, computes all paths off-chain, tags best flags. Consumed by SwapTab and a future RouteSelector component.
- **Wallet:** ConnectKit (existing)

## Key Addresses (Arc Testnet)
| Contract | Address |
|---|---|
| EcoSwapFactory (current) | `0x5f67e717C18d3bADeB543503C8b6933Be21f8447` |
| CCTP TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` |
| CCTP MessageTransmitterV2 | `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` |
| USDC | `0x3600000000000000000000000000000000000000` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| USYC | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` |
| Arc CCTP Domain | `26` |
| Synapse bridge | `address(0)` — not yet live on Arc |
| LayerZero OFT | `address(0)` — not yet live on Arc |

## Files to Create / Modify

1. `contracts/ArcMetaRouter.sol` — New router contract (7 modes, see below)
2. `src/lib/relayRoutingEngine.ts` — New TypeScript routing engine
3. `src/constants/contracts.ts` — Add `ARC_META_ROUTER_ABI` and `VITE_ARC_META_ROUTER_ADDRESS` constant
4. `.env` — Add `VITE_ARC_META_ROUTER_ADDRESS=` (blank until deployed by user)

## ArcMetaRouter.sol — 7 Execution Modes

| Mode | Function | Description |
|---|---|---|
| 1 | `swapSingleHop` | One EcoSwapPool, transfer→swap pattern. Slippage guard on output. |
| 2 | `swapMultiHop` | Two sequential hops e.g. USDC→USYC→EURC. Slippage on final output. |
| 3 | `swapSplit` | Split order across two pools by `splitBps` basis points. Aggregate slippage guard. |
| 4 | `fillIntent` | Whitelisted solver fills a pre-signed user intent. Nonce replay protection. |
| 5 | `bridgeCCTP` | Burn USDC/EURC via Circle CCTP TokenMessengerV2. Returns CCTP nonce. |
| 6 | `bridgeSynapse` | Synapse placeholder — reverts `BridgeNotLive("Synapse")` until deployed. |
| 7 | `bridgeLayerZero` | LayerZero OFT placeholder — reverts `BridgeNotLive("LayerZero")` until deployed. |

View helpers: `quoteSingleHop`, `quoteMultiHop` — read live reserves, no state changes.

Safety: SafeERC20, ReentrancyGuard, Ownable, per-leg slippage, hard deadline, filler whitelist, nonce map.

## relayRoutingEngine.ts — ExecutionPath Type

```ts
interface FeeDeductions {
  gasFeeUsd: number;
  bridgeFeeUsd: number;
  solverFeeUsd: number;
  totalFeeUsd: number;
}

interface ExecutionPath {
  routeName: string;
  underlyingPools: string[];
  grossOutput: bigint;
  feeDeductions: FeeDeductions;
  netOutput: bigint;
  estimatedTimeSeconds: number;
  isCheapest: boolean;
  isFastest: boolean;
  isBestReturn: boolean;
  mode: 'single' | 'multihop' | 'split' | 'intent' | 'cctp';
  poolAddresses: string[];
  splitBps?: number;
  midToken?: string;
  destinationDomain?: number;
}
```

## generateAllExecutionPaths — 5 Path Types

| # | routeName | Logic | estimatedTimeSeconds |
|---|---|---|---|
| 1 | Native Router — Direct Pool | Single-hop via best direct EcoSwap pool | 0.5 |
| 2 | Multi-Hop via USYC | USDC→USYC→EURC (or inverse) if net beats direct | 0.8 |
| 3 | Split Route — 60/40 Dual Pool | 60% poolA / 40% poolB same pair, reduces price impact | 1.0 |
| 4 | Instant Solver (Intent-Based) | Simulated off-chain filler, 0.05% solver fee, 2s settlement | 2.0 |
| 5 | Cross-Chain CCTP Bridge | CCTP burn on Arc + mint on destination, 3 min | 180 |

Tagging logic:
- `isFastest` → lowest `estimatedTimeSeconds`
- `isCheapest` → lowest `feeDeductions.totalFeeUsd`
- `isBestReturn` → highest `netOutput`

## Build Sequence

1. Write `contracts/ArcMetaRouter.sol`
2. Compile — verify 0 errors (solc 0.8.28, paris, optimizer 200 runs)
3. Write `src/lib/relayRoutingEngine.ts`
4. Update `src/constants/contracts.ts` — add `ARC_META_ROUTER_ABI`
5. Add `VITE_ARC_META_ROUTER_ADDRESS=` to `.env`
6. Typecheck — verify 0 errors

## Deployment (manual — user does this in Remix after build)

Constructor args for `ArcMetaRouter`:
```
_factory:        0x5f67e717C18d3bADeB543503C8b6933Be21f8447
_cctpMessenger:  0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA
_synapse:        0x0000000000000000000000000000000000000000
_lzOFT:          0x0000000000000000000000000000000000000000
```
After deployment, set `VITE_ARC_META_ROUTER_ADDRESS` in `.env` to the deployed address.

## Done When
- [ ] `ArcMetaRouter.sol` compiles clean with solc 0.8.28, paris, optimizer 200 runs
- [ ] `relayRoutingEngine.ts` typechecks with 0 errors
- [ ] `generateAllExecutionPaths` returns all 5 path types with correct best-of tags
- [ ] `quoteSingleHop` and `quoteMultiHop` return correct amounts against live pool reserves
- [ ] `ARC_META_ROUTER_ABI` exported from `contracts.ts`
- [ ] Contract deployed to Arc Testnet and address added to `.env`
