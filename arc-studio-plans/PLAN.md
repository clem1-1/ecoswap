# Implementation Plan: EcoSwap Bridge Tab

## Summary
Add a fully functional CCTP-powered bridge tab to EcoSwap, letting users move USDC between Arc Testnet and supported testnets in both directions. The bridge card is visually identical to the swap card — same glass surface, same layout — with a Swap/Bridge toggle at the top. No smart contracts touched.

## Architecture
- **Blockchain**: Arc Testnet (destination or source) via CCTP V2
- **SDK**: `@circle-fin/app-kit` (already installed) + `@circle-fin/adapter-viem-v2` (already installed)
- **Wallet**: wagmi ConnectKit (existing) — `createViemAdapterFromProvider` pattern
- **Chains supported** (CCTP testnet only — non-CCTP chains removed per your answer):
  - Arc Testnet (chain ID 5042002) — `arcTestnet` from `viem/chains`
  - Ethereum Sepolia — `sepolia`
  - Base Sepolia — `baseSepolia`
  - Arbitrum Sepolia — `arbitrumSepolia`
  - Optimism Sepolia — `optimismSepolia`
  - Avalanche Fuji — `avalancheFuji`
  - Polygon Amoy — `polygonAmoy`
- **Bridge direction**: both (Arc → other, other → Arc)

## Files to Create/Modify

### New files
1. `src/components/BridgeTab.tsx` — main bridge UI component (card, stepper, faucet banner)
2. `src/constants/bridgeChains.ts` — CCTP chain config: chain name string used by App Kit, viem chain object, chain ID, logo color, display name, testnet USDC address

### Modified files
3. `src/config.ts` — add all testnet chains to wagmi config and transports
4. `src/App.tsx` — add `'bridge'` to the `Tab` type, add Bridge to `NAV_TABS`, render `<BridgeTab />` in the tab switch, keep layout identical
5. `src/constants/tokens.ts` — no changes needed (bridge always moves USDC)

## Build Sequence

### Step 1 — Chain config + wagmi update
- Add `sepolia`, `baseSepolia`, `arbitrumSepolia`, `optimismSepolia`, `avalancheFuji`, `polygonAmoy` to `config.ts` chains and transports
- Create `src/constants/bridgeChains.ts` with the CCTP chain name strings (e.g. `"Sepolia"`, `"Base_Sepolia"`) and matching viem chain objects

### Step 2 — BridgeTab component
Layout (identical card to SwapTab):
- Glass card `swap-card` class, same 440px max-width centered layout
- **Swap / Bridge pill toggle** at the very top of the card — clicking Bridge switches the swap card to bridge mode (or vice versa); this toggle is inside the card header area so it sits above the "You Pay" field, consistent with the existing settings gear placement
- **From chain dropdown** — top field shows chain selector (Arc Testnet or one of the 6 testnets) + USDC amount input
- **Flip button** — same animated flip button; swaps From/To chains
- **To chain field** — bottom field shows destination chain (read-only label) + estimated USDC out (1:1 minus CCTP fee)
- **Destination address** — auto-populated from connected wallet `address`, editable
- **Quote row** — shows estimated time (8–20s fast mode), CCTP fee (~0 on testnet), and route (CCTP V2)
- **Action button** — same gradient button, label cycles: Connect Wallet → Select Chain → Enter Amount → Bridge (or Approving / Burning / Fetching Attestation / Minting based on step)

Bridge execution (App Kit wagmi pattern):
```ts
const appKit = new AppKit(); // module-level singleton
// on button click:
if (chainId !== sourceChainId) await switchChainAsync({ chainId: sourceChainId });
const provider = await connector.getProvider() as EIP1193Provider;
const adapter = await createViemAdapterFromProvider({ provider });
const result = await appKit.bridge({
  from: { adapter, chain: sourceCctpName },
  to:   { adapter, chain: destCctpName   },
  amount: amountString,
  recipient: destinationAddress,
});
```

Step-by-step progress stepper (embedded in card, replaces button area during execution):
- 4 steps: **Approve** → **Burn** → **Fetch Attestation** → **Mint**
- Each step shows: icon (pending = spinner, active = pulse ring, done = green check), step name, optional tx hash link to explorer
- Driven by `result.steps` from the App Kit response — poll `kit.on('bridge:step', ...)` for live updates
- On success: green checkmark + "Bridged X USDC → Arc Testnet" summary + explorer link
- On error: red state with friendly message + retry button (calls `kit.retry(result, adapter)`)

### Step 3 — Faucet banner
- After bridge completes (or on mount if wallet is connected to Arc Testnet), read USDC balance via `useReadContract`
- If balance is 0: show a non-intrusive green-tinted banner inside the card: `"New to Arc Testnet? Get free testnet USDC gas →"` linking to `https://faucet.circle.com`
- Banner dismissible (localStorage key `ecoswap-faucet-dismissed`)
- Does NOT auto-call any faucet API (the Circle faucet has no public API for programmatic calls; the link is the correct UX)

### Step 4 — Nav integration
- Add `bridge` to `Tab` union type in App.tsx
- Add Bridge tab with `<ArrowLeftRight size={14} />` icon to `NAV_TABS` (between Swap and Pools, or after Swap)
- Add `bridge` to `BOTTOM_TABS` for mobile
- Render `<BridgeTab />` in the tab content switch

### Step 5 — Lint/typecheck + confirm running

## Done When
- [ ] Swap/Bridge toggle visible inside swap card area, switching between SwapTab and BridgeTab
- [ ] All 7 CCTP-supported chains selectable in From/To dropdowns
- [ ] Flip button swaps direction (Arc → Sepolia becomes Sepolia → Arc)
- [ ] Destination address auto-fills from connected wallet
- [ ] App Kit bridge call fires on button click (not before)
- [ ] 4-step stepper visible during bridge execution with live step states
- [ ] Success/error states shown in card
- [ ] Faucet banner appears when Arc Testnet USDC balance is 0
- [ ] Zero lint errors, zero typecheck errors
- [ ] Existing swap/pool/liquidity functionality unchanged

## Flagged Limitations
- **Faucet API**: Circle's testnet faucet has no public programmatic API. The banner links to `faucet.circle.com` — this is the correct approach.
- **BNB, Linea, Unichain, Robinhood, World Chain**: removed — not CCTP-supported.
- **Attestation polling**: CCTP fast mode (~8–20s) handles this inside App Kit. No manual polling needed.
- **Mainnet**: not enabled. All chains are testnet versions per your answer.
