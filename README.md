# EcoSwap DEX

A full-featured decentralized exchange and meta-aggregator on Arc Testnet. EcoSwap routes swaps across multiple live AMMs simultaneously, bridges stablecoins cross-chain via Circle CCTP V2, shows live oracle prices, and supports limit orders, LP management, quests, and portfolio PnL tracking.

Built with [Arc Studio](https://studio.arc.io)

---

## Features

- **Multi-route aggregator**: routes compared across EcoSwap V2, Uniswap V2, Uniswap V3, UnitFlowV3, and XyloNet StableSwap — best rate, fastest, and cheapest badges
- **CCTP bridge**: bridge USDC and EURC across 15 testnets via Circle CCTP V2
- **Limit orders**: place target-price orders monitored in the browser; execute via the best available route
- **Pyth oracle**: live EUR/USD, BTC/USD, ETH/USD, USDC/USD prices every 10s — shown as reference rate on every swap and bridge
- **Price sparkline**: clickable price chart with Pyth history
- **LP management**: add/remove liquidity with 3-step transfer-first flow; PnL tracking vs entry
- **Portfolio**: LP positions, earnings, bridge history, PnL
- **Quests + Rewards**: leaf point system with quests for swap, liquidity, bridge, and explorer actions
- **Activity feed**: swap, liquidity, and bridge history with explorer links

---

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Web3**: wagmi v2, viem v2, ConnectKit
- **Contracts**: Solidity 0.8.28, Foundry (`forge build` / `forge test`)
- **Oracle**: Pyth Network (Hermes REST API)
- **Bridge**: Circle App Kit (`@circle-fin/app-kit`)
- **Chain**: Arc Testnet (Chain ID: 5042002)

---

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Foundry](https://book.getfoundry.sh) (for contract work)

### Install

```bash
bun install
```

### Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `VITE_ECOSWAP_FACTORY_ADDRESS` | EcoSwap factory contract address | Yes |
| `VITE_ARC_META_ROUTER_ADDRESS` | ArcMetaRouter contract address (deploy from Remix first) | Optional |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Optional |
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL (optional outside Arc Studio) | Optional |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token | Optional |
| `RPC_PROXY_CHAINS` | Comma-separated list of proxy-supported chain keys | Optional |

Copy `.env` and fill in your values. The factory address is already set for Arc Testnet.

### Run

```bash
bun run dev
```

### Build

```bash
bun run build
```

### Contracts

```bash
# Build contracts
bun run contracts:build

# Run tests
bun run contracts:test
```

---

## Deploying ArcMetaRouter

Compile `contracts/ArcMetaRouter.sol` in Remix with Solidity 0.8.28, EVM target `paris`, optimizer 200 runs, via-IR enabled. Constructor args:

```
_factory:       0x5f67e717C18d3bADeB543503C8b6933Be21f8447
_cctpMessenger: 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA
_synapse:       0x0000000000000000000000000000000000000000
_lzOFT:         0x0000000000000000000000000000000000000000
```

After deployment, set `VITE_ARC_META_ROUTER_ADDRESS` in `.env`.

---

## Testnet Tokens

Get test USDC from the Arc Studio sidebar "Get test USDC" button, or visit the Faucet page inside the app.
