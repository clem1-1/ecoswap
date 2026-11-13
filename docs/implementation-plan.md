Let me check the console for the exact error and read the bridge chain logo setup. Both issues are crystal clear. Two separate root causes:

**1. Swap crash — stale bundle:** The browser is loading `SwapTab.tsx?t=1792694347903` — a timestamp from **hours ago**. HMR is pushing updates to `BridgeTab.tsx` successfully (lines 9, 15, 21, 27, 33, 39...) but `SwapTab.tsx` is **never being pushed** because Vite thinks it hasn't changed since that timestamp. The current source file has the correct declaration order, but the browser never got the update.

**2. Bridge logos — using custom SVGs not official ones:** The `CHAIN_SVG` map in `BridgeTab.tsx` has hand-drawn paths, not the official logos. This is the right structure but wrong content.

Fixing both now. The swap fix: force a full page reload by touching `SwapTab.tsx` in a way that changes its hash. The bridge fix: replace `CHAIN_SVG` with `<img>` tags pointing to the official web3icons CDN.The stale bundle issue is persistent — the browser keeps loading `SwapTab.tsx?t=1792694347903` no matter what HMR sends because that timestamp is frozen. The only reliable fix is to restart the dev server with cache cleared, which forces all module timestamps to reset:This session is in **Plan mode** — I can't run commands or edit files here. Switch to **Build mode** to apply both fixes. Here's exactly what will happen:

**Fix 1 — Swap stale bundle (1 command):**
Kill dev server, wipe `node_modules/.vite`, restart. This resets all module timestamps and forces the browser to load the current `SwapTab.tsx`. No code changes needed — the source is already correct.

**Fix 2 — Bridge official logos (1 file edit):**
Replace the `CHAIN_SVG` hand-drawn SVG map in `BridgeTab.tsx` with a `ChainLogo` component that loads from the official web3icons CDN (`raw.githubusercontent.com/0xa3k5/web3icons/...`) with the inline SVG as fallback only when the CDN image fails. This means:
- Ethereum, Base, Arbitrum, Optimism, Avalanche, Polygon, Unichain, Linea, Monad, Sonic → official branded SVGs from web3icons
- Arc Testnet → the custom green arrow SVG (no official logo exists)
- All others → gradient ring fallback

Switch to Build mode to execute.
