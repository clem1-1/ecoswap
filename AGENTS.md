# EcoSwap DEX

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

EcoSwap is a permissionless decentralized exchange (DEX) on Arc Testnet using a Uniswap V2-style constant-product AMM. Users can swap ERC-20 tokens, create liquidity pools, add/remove liquidity, and view activity history.

## Deployed Contracts (Arc Testnet)

| Contract | Address | Explorer |
|---|---|---|
| EcoSwapFactory | 0x2b1842274edbb625f4a8bf41ed21fc67a3909c07 | https://explorer.testnet.arc.io/address/0x2b1842274edbb625f4a8bf41ed21fc67a3909c07 |

## Environment

- `VITE_ECOSWAP_FACTORY_ADDRESS=0x2b1842274edbb625f4a8bf41ed21fc67a3909c07` (in .env)

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
