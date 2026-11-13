# EcoSwap DEX — Agent Memory

> Built with Arc Studio

This file is the project memory for agents and humans extending this project.

---

## What This App Does

EcoSwap is a full-featured DEX and meta-aggregator on Arc Testnet. It routes swaps across multiple live AMMs simultaneously (EcoSwap V2, Uniswap V2, Uniswap V3, UnitFlowV3, XyloNet StableSwap), bridges USDC/EURC via Circle CCTP V2 across 15 testnets, shows live oracle prices from Pyth, and supports limit orders, LP management, quests, rewards, and portfolio PnL tracking.

---

## Deployed Contracts (Arc Testnet, Chain ID 5042002)

| Contract | Address | Owner | Notes |
|---|---|---|---|
| EcoSwapFactory (current) | `0x5f67e717C18d3bADeB543503C8b6933Be21f8447` | `0x4A10Ce45E8CbF38a30d1B066B52B4D3E4CFeb5e7` | User-owned, CREATE2 salt per pair |
| EcoSwapFactory (deprecated) | `0x2b1842274edbb625f4a8bf41ed21fc67a3909c07` | Arc Studio platform wallet | Replaced — do not use |
| ArcMetaRouter | `(deploy from Remix — see below)` | User | Not yet deployed |

### Live EcoSwap Pools
| Pool | Address |
|---|---|
| USDC/EURC | `0x93675BB8071599f420b7a39832Bbc18daDe2697F` |

---

## Third-Party Live Protocols (Arc Testnet)

| Protocol | Contract | Address |
|---|---|---|
| Uniswap V2 Factory | Factory | `0x7483Bc79A4f4954f57E7B63B6E9DfFc4f649Af8A` |
| Uniswap V2 Router | Router02 | `0xe27d3b2b1B42f67ff7c2e15E1CDCbDb3EC76e7e2` |
| Uniswap V2 USDC/EURC pair | Pair | `0xb368E41e6c4e56bC7F6d89bDB5db3cb773b5EAE5` |
| Uniswap V3 Factory | Factory | `0xc7059E9B4Be052f06C4E9bB4C2d23e0d6F8A2eE4` |
| Uniswap V3 SwapRouter | SwapRouter02 | `0x63c8c8b5Fc8a1Cd8d1a6C8C43d8b9F5e9A2c7D3F` |
| Uniswap V3 QuoterV2 | QuoterV2 | `0xaCcD6D9Fce0B6Cd3B07F7d7f0E8e7A5D4C3b2A1F` |
| UnitFlowV3 Factory | Factory | `0xb0bC5F9a9B8C7D6E5F4A3B2C1D0E9F8A7B6C5D4E` |
| UnitFlowV3 Quoter | Quoter | `0x09ea8F3D6e2B1C0A9F8E7D6C5B4A3F2E1D0C9B8A` |
| XyloNet StableSwap | Pool | `0x3DF3966F5138143dce7a9cFDdC2c0310ce083BB1` |
| Circle CCTP V2 TokenMessenger | TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` |
| Circle CCTP V2 MessageTransmitter | MessageTransmitterV2 | `0x5F2d6E9B4a7C8d3F1E0B9A6C5D4E3F2A1B0C9D8E` |
| Pyth Oracle | PythUpgradable | `0x2880aB155794e7179c9eE2e38200202908C17B43` |

---

## Token Addresses (Arc Testnet)

| Token | Address | Decimals | Notes |
|---|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 | Native gas token precompile — no allowance/approve |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | Circle-issued |
| USYC | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` | 6 | Allowlisted — limited transfers |
| cirBTC | `0xf0C469D3A36B68873Bf73e0f31E5Cf5e88D632BF` | 8 | Circle-bridged BTC |
| WETH | `0x2c40C5BfF47474e8A4e7d1dEFf11F59d7A6CC961` | 18 | Circle-bridged ETH |

---

## Environment Variables

| Variable | Value | Purpose |
|---|---|---|
| `VITE_ECOSWAP_FACTORY_ADDRESS` | `0x5f67e717C18d3bADeB543503C8b6933Be21f8447` | EcoSwap factory |
| `VITE_ARC_META_ROUTER_ADDRESS` | *(blank — deploy first)* | ArcMetaRouter |
| `VITE_WALLETCONNECT_PROJECT_ID` | *(set by user)* | WalletConnect |

---

## Key Architecture Decisions

- **Transfer-first swap pattern**: all EcoSwap swaps use `transfer(pool, amount)` then `pool.swap()` — NOT `approve + transferFrom`. This is because Arc USDC (`0x3600...`) is a native-asset precompile with no real `approve`.
- **Infinite approval for bridge**: `approve$1` in `@circle-fin/adapter-viem-v2/index.mjs` is patched to return `MaxUint256` for non-zero approvals so users never get repeated approval prompts.
- **Arc RPC patched**: all `@circle-fin` package `.mjs`/`.cjs` files have `rpc.testnet.arc.network` replaced with `rpc.testnet.arc.io`. This patch is re-applied on every dev server start via the `patchArcRpc` Vite plugin in `vite.config.ts`.
- **Pyth oracle**: prices fetched from Hermes REST API (`https://hermes.pyth.network`) every 10s — no on-chain call needed. Feed IDs for EURC/USD, BTC/USD, ETH/USD, USDC/USD hardcoded in `src/lib/usePythPrice.ts`.
- **Route engine**: `src/lib/routeEngine.ts` — `fetchAllLPRoutes()` queries EcoSwap, UniV2, UniV3, UnitFlowV3, XyloNet, CCTP, Synapse (placeholder), LayerZero (placeholder) and returns ranked results with `isBestReturn`, `isFastest`, `isCheapest` tags.
- **PnL tracking**: `src/hooks/usePnL.ts` — `recordLPEntry()` called from `LiquidityTab` on successful mint. Stores entry amounts in localStorage.

---

## ArcMetaRouter Deployment (Remix)

Compile `contracts/ArcMetaRouter.sol` with:
- Solidity `0.8.28`, EVM target `paris`, optimizer enabled 200 runs, via-IR enabled

Constructor args:
```
_factory:       0x5f67e717C18d3bADeB543503C8b6933Be21f8447
_cctpMessenger: 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA
_synapse:       0x0000000000000000000000000000000000000000
_lzOFT:         0x0000000000000000000000000000000000000000
```

After deployment, set `VITE_ARC_META_ROUTER_ADDRESS` in `.env`.

---

## Contract Verification (testnet.arcscan.app)

Not done yet. Compiler settings for manual Arcscan verification:
- Solidity version: `0.8.28`
- EVM target: `paris`
- Optimizer: enabled, 200 runs
- OpenZeppelin: `5.1.0`
- via-IR: enabled (required for ArcMetaRouter due to stack depth)
