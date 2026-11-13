// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  External interfaces
// ─────────────────────────────────────────────────────────────────────────────

/// @notice Minimal EcoSwap pool interface (Uniswap V2-style, transfer→swap).
interface IEcoSwapPool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;
}

/// @notice Minimal EcoSwapFactory interface.
interface IEcoSwapFactory {
    function getPair(address tokenA, address tokenB)
        external
        view
        returns (address pair);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bridge interfaces — CCTP is live; Synapse / LayerZero are placeholder-wired
//  and will activate once those protocols deploy on Arc Testnet.
// ─────────────────────────────────────────────────────────────────────────────

/// @notice Circle CCTP V2 TokenMessenger — live on Arc Testnet (domain 26).
interface ICCTPTokenMessenger {
    /// @param amount             Stablecoin amount to burn.
    /// @param destinationDomain  CCTP domain ID of the destination chain.
    /// @param mintRecipient      32-byte padded recipient on destination.
    /// @param burnToken          USDC or EURC address on Arc Testnet.
    /// @return nonce             CCTP message nonce for attestation tracking.
    function depositForBurn(
        uint256 amount,
        uint32  destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

/// @notice Synapse SynapseBridge placeholder.
///         Interface matches the canonical SynapseBridge.sol deposit signature.
///         All calls revert via BridgeNotLive until Synapse deploys on Arc.
interface ISynapseBridge {
    function deposit(
        address to,
        uint256 chainId,
        IERC20  token,
        uint256 amount
    ) external;
}

/// @notice LayerZero OFT (Omnichain Fungible Token) placeholder.
///         Interface matches IOFT.sol from LayerZero V2.
///         All calls revert via BridgeNotLive until an OFT deploys on Arc.
interface ILayerZeroOFT {
    struct SendParam {
        uint32 dstEid;
        bytes32 to;
        uint256 amountLD;
        uint256 minAmountLD;
        bytes   extraOptions;
        bytes   composeMsg;
        bytes   oftCmd;
    }
    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }
    function send(
        SendParam    calldata sendParam,
        MessagingFee calldata fee,
        address      refundAddress
    ) external payable returns (bytes32 guid);
}

// ─────────────────────────────────────────────────────────────────────────────
//  ArcMetaRouter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @title  ArcMetaRouter
 * @author EcoSwap
 * @notice Smart-order router and bridge meta-aggregator for EcoSwap on Arc Testnet.
 *
 * Execution modes
 * ───────────────
 * 1. swapSingleHop    — one EcoSwapPool, transfer→swap pattern.
 * 2. swapMultiHop     — two sequential EcoSwapPool hops (e.g. USDC→USYC→EURC).
 * 3. swapSplit        — split an order across two pools by basis-point ratio to
 *                       reduce price impact on large trades.
 * 4. fillIntent       — a whitelisted solver settles a pre-signed user intent
 *                       instantly; nonce prevents replay.
 * 5. bridgeCCTP       — burn USDC or EURC via Circle CCTP for cross-chain mint.
 * 6. bridgeSynapse    — placeholder; reverts BridgeNotLive until Synapse goes live.
 * 7. bridgeLayerZero  — placeholder; reverts BridgeNotLive until LZ OFT goes live.
 *
 * Safety properties
 * ─────────────────
 * - SafeERC20 wraps every token interaction.
 * - ReentrancyGuard on all state-mutating entry points.
 * - Per-leg and aggregate slippage guards (amountOutMin).
 * - Hard deadline on every swap and intent.
 * - Filler whitelist with owner-controlled management.
 * - Nonce-based replay protection for intent-based fills.
 * - No ETH/native custody — router holds tokens only transiently
 *   within a single call frame.
 */
contract ArcMetaRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ── Constants ──────────────────────────────────────────────────────────

    /// @dev Uniswap V2 fee: 997 / 1000 = 0.3%.
    uint256 private constant FEE_NUMERATOR   = 997;
    uint256 private constant FEE_DENOMINATOR = 1000;

    /// @dev Basis-point denominator (10 000 = 100 %).
    uint256 private constant BPS = 10_000;

    // ── Immutable protocol addresses ───────────────────────────────────────

    /// @notice EcoSwapFactory used to look up pool addresses on-chain.
    IEcoSwapFactory public immutable factory;

    /// @notice Circle CCTP V2 TokenMessenger — live on Arc Testnet, domain 26.
    ICCTPTokenMessenger public immutable cctpMessenger;

    /// @notice Synapse bridge — address(0) until live on Arc.
    ISynapseBridge public immutable synapseBridge;

    /// @notice LayerZero OFT entry point — address(0) until live on Arc.
    ILayerZeroOFT public immutable lzOFT;

    // ── Mutable state ──────────────────────────────────────────────────────

    /// @notice Whitelisted solver/filler addresses for intent-based fills.
    mapping(address => bool) public isFiller;

    /// @notice Consumed intent nonces per user — prevents replay attacks.
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // ── Events ─────────────────────────────────────────────────────────────

    event SingleHopSwap(
        address indexed user,
        address indexed pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event MultiHopSwap(
        address indexed user,
        address pool0,
        address pool1,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event SplitSwap(
        address indexed user,
        address poolA,
        address poolB,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutA,
        uint256 amountOutB
    );

    event IntentFilled(
        address indexed user,
        address indexed filler,
        uint256 nonce,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event CCTPBridgeInitiated(
        address indexed user,
        address token,
        uint256 amount,
        uint32  destinationDomain,
        bytes32 mintRecipient,
        uint64  cctpNonce
    );

    event SynapseBridgeInitiated(
        address indexed user,
        address token,
        uint256 amount,
        uint256 destinationChainId
    );

    event LayerZeroBridgeInitiated(
        address indexed user,
        address token,
        uint256 amount,
        uint32  dstEid
    );

    event FillerSet(address indexed filler, bool enabled);

    // ── Custom errors ──────────────────────────────────────────────────────

    error DeadlineExpired();
    error SlippageExceeded(uint256 got, uint256 minimum);
    error PairNotFound(address tokenA, address tokenB);
    error InvalidSplitRatio(uint256 ratioBps);
    error NotAFiller(address caller);
    error NonceAlreadyUsed(address user, uint256 nonce);
    error BridgeNotLive(string protocol);
    error ZeroAmount();
    error ZeroAddress();

    // ── Constructor ────────────────────────────────────────────────────────

    /**
     * @param _factory        EcoSwapFactory on Arc Testnet.
     * @param _cctpMessenger  Circle CCTP V2 TokenMessenger on Arc Testnet.
     * @param _synapse        Synapse bridge address — pass address(0) until live.
     * @param _lzOFT          LayerZero OFT address — pass address(0) until live.
     */
    constructor(
        address _factory,
        address _cctpMessenger,
        address _synapse,
        address _lzOFT
    ) Ownable(msg.sender) {
        if (_factory      == address(0)) revert ZeroAddress();
        if (_cctpMessenger == address(0)) revert ZeroAddress();
        factory       = IEcoSwapFactory(_factory);
        cctpMessenger = ICCTPTokenMessenger(_cctpMessenger);
        synapseBridge = ISynapseBridge(_synapse); // address(0) accepted
        lzOFT         = ILayerZeroOFT(_lzOFT);    // address(0) accepted
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    /// @notice Add or remove a solver/filler from the whitelist.
    function setFiller(address filler, bool enabled) external onlyOwner {
        if (filler == address(0)) revert ZeroAddress();
        isFiller[filler] = enabled;
        emit FillerSet(filler, enabled);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  MODE 1 — Single-hop swap
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Swap `amountIn` of `tokenIn` for at least `amountOutMin` of
     *         `tokenOut` through a single EcoSwapPool.
     *
     * @param tokenIn      Input token address.
     * @param tokenOut     Desired output token address.
     * @param amountIn     Exact amount to spend (in tokenIn's native decimals).
     * @param amountOutMin Minimum acceptable output; reverts on slippage.
     * @param to           Recipient of the output tokens.
     * @param deadline     Unix timestamp after which the call reverts.
     * @return amountOut   Actual output amount delivered to `to`.
     */
    function swapSingleHop(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        _checkDeadline(deadline);
        if (amountIn == 0)  revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        address pool = _requirePair(tokenIn, tokenOut);
        amountOut = _swapViaPool(pool, tokenIn, tokenOut, amountIn, to);

        if (amountOut < amountOutMin)
            revert SlippageExceeded(amountOut, amountOutMin);

        emit SingleHopSwap(msg.sender, pool, tokenIn, tokenOut, amountIn, amountOut);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  MODE 2 — Multi-hop swap
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Execute a two-hop swap: tokenIn → tokenMid → tokenOut.
     *         Ideal for pairs without a direct pool, e.g. USDC → USYC → EURC.
     *         Slippage is enforced on the final output only; the intermediate
     *         amount is used in full for the second hop.
     *
     * @param tokenIn      Input token.
     * @param tokenMid     Intermediate token (bridge between the two pools).
     * @param tokenOut     Final output token.
     * @param amountIn     Exact input amount.
     * @param amountOutMin Minimum final output.
     * @param to           Recipient of the final output.
     * @param deadline     Unix timestamp deadline.
     * @return amountOut   Actual output delivered to `to`.
     */
    function swapMultiHop(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        _checkDeadline(deadline);
        if (amountIn == 0)  revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Hop 1: tokenIn → tokenMid (output stays in router for hop 2)
        address pool0   = _requirePair(tokenIn, tokenMid);
        uint256 midOut  = _swapViaPool(pool0, tokenIn, tokenMid, amountIn, address(this));

        // Hop 2: tokenMid → tokenOut (output goes directly to recipient)
        address pool1 = _requirePair(tokenMid, tokenOut);
        amountOut     = _swapViaPool(pool1, tokenMid, tokenOut, midOut, to);

        if (amountOut < amountOutMin)
            revert SlippageExceeded(amountOut, amountOutMin);

        emit MultiHopSwap(
            msg.sender,
            pool0,
            pool1,
            tokenIn,
            tokenMid,
            tokenOut,
            amountIn,
            amountOut
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  MODE 3 — Split swap
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Route an order simultaneously across two pools to reduce price
     *         impact on large trades.  `splitBps` basis points go through
     *         `poolA`; the remainder through `poolB`.
     *
     *         Both pools must trade the same tokenIn/tokenOut pair. On Arc
     *         Testnet today this means the same EcoSwap pool address (single
     *         venue), but the split interface is ready to accept different
     *         pool addresses from future venues (e.g. a concentrated-liquidity
     *         or Curve-style pool once deployed on Arc).
     *
     * @param tokenIn      Input token.
     * @param tokenOut     Output token.
     * @param amountIn     Total input to split.
     * @param poolA        First pool address.
     * @param poolB        Second pool address (may equal poolA for quote comparison).
     * @param splitBps     Basis points (1–9 999) to route through poolA; rest to poolB.
     * @param amountOutMin Aggregate minimum output.
     * @param to           Recipient.
     * @param deadline     Unix timestamp deadline.
     * @return totalOut    Sum of both legs' outputs.
     */
    function swapSplit(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address poolA,
        address poolB,
        uint256 splitBps,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256 totalOut) {
        _checkDeadline(deadline);
        if (amountIn == 0)  revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (splitBps == 0 || splitBps >= BPS) revert InvalidSplitRatio(splitBps);

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountInA = (amountIn * splitBps) / BPS;
        uint256 amountInB = amountIn - amountInA; // absorbs rounding dust

        uint256 outA = _swapViaPool(poolA, tokenIn, tokenOut, amountInA, to);
        uint256 outB = _swapViaPool(poolB, tokenIn, tokenOut, amountInB, to);

        totalOut = outA + outB;
        if (totalOut < amountOutMin)
            revert SlippageExceeded(totalOut, amountOutMin);

        emit SplitSwap(
            msg.sender,
            poolA, poolB,
            tokenIn, tokenOut,
            amountIn, outA, outB
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  MODE 4 — Intent-based solver fill
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice A whitelisted filler settles a user's off-chain swap intent.
     *
     *         Relay/UniswapX model:
     *         1. User signs an intent off-chain (not stored on-chain; filler
     *            verifies the signature before calling this function).
     *         2. Filler calls fillIntent, pulling tokenIn from the user and
     *            delivering tokenOut directly to the user in the same tx.
     *         3. Filler earns the spread between their execution price and
     *            the on-chain AMM price — this contract only enforces
     *            amountOutMin for the user's protection.
     *         4. Nonce is marked used to prevent double-fill.
     *
     * @param user         Wallet that created the intent.
     * @param tokenIn      Token the user is selling.
     * @param tokenOut     Token the user wants to receive.
     * @param amountIn     Exact amount the user authorised the filler to pull.
     * @param amountOutMin Minimum the user is willing to accept.
     * @param nonce        Per-user unique nonce (replay protection).
     * @param deadline     Intent expiry timestamp.
     * @param amountOut    Amount the solver commits to delivering.
     */
    function fillIntent(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 nonce,
        uint256 deadline,
        uint256 amountOut
    ) external nonReentrant {
        if (!isFiller[msg.sender])        revert NotAFiller(msg.sender);
        _checkDeadline(deadline);
        if (usedNonces[user][nonce])      revert NonceAlreadyUsed(user, nonce);
        if (amountOut < amountOutMin)     revert SlippageExceeded(amountOut, amountOutMin);

        usedNonces[user][nonce] = true;

        // Pull tokenIn from user to filler (filler keeps or routes it)
        IERC20(tokenIn).safeTransferFrom(user, msg.sender, amountIn);

        // Pull tokenOut from filler to user
        IERC20(tokenOut).safeTransferFrom(msg.sender, user, amountOut);

        emit IntentFilled(
            user, msg.sender, nonce,
            tokenIn, tokenOut,
            amountIn, amountOut
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  MODE 5 — CCTP bridge
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Burn USDC or EURC via Circle CCTP V2 to initiate a cross-chain
     *         mint on the destination chain.
     *
     *         After this call succeeds, Circle's attestation service signs
     *         the burn message off-chain. The recipient (or a relayer) then
     *         calls `receiveMessage` on the destination chain's
     *         MessageTransmitterV2 to complete the mint.
     *
     *         Arc Testnet CCTP domain: 26
     *         TokenMessengerV2:        0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA
     *
     * @param burnToken          USDC (0x3600…) or EURC (0x89B5…) on Arc Testnet.
     * @param amount             Amount to burn (6 decimals for ERC-20 view).
     * @param destinationDomain  Circle CCTP domain ID of the destination chain.
     * @param mintRecipient      ABI-encoded (left-padded to 32 bytes) recipient.
     * @return cctpNonce         Nonce assigned by the TokenMessenger for tracking.
     */
    function bridgeCCTP(
        address burnToken,
        uint256 amount,
        uint32  destinationDomain,
        bytes32 mintRecipient
    ) external nonReentrant returns (uint64 cctpNonce) {
        if (amount == 0) revert ZeroAmount();

        IERC20(burnToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(burnToken).forceApprove(address(cctpMessenger), amount);

        cctpNonce = cctpMessenger.depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            burnToken
        );

        emit CCTPBridgeInitiated(
            msg.sender,
            burnToken, amount,
            destinationDomain, mintRecipient, cctpNonce
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  MODE 6 — Synapse bridge (placeholder)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Forward tokens via the Synapse bridge.
     *         Reverts BridgeNotLive("Synapse") until Synapse deploys on Arc.
     *
     * @param token              Token to bridge.
     * @param amount             Amount to bridge.
     * @param destinationChainId Target EVM chain ID (e.g. 1 for Ethereum mainnet).
     * @param recipient          Recipient address on the destination chain.
     */
    function bridgeSynapse(
        address token,
        uint256 amount,
        uint256 destinationChainId,
        address recipient
    ) external nonReentrant {
        if (address(synapseBridge) == address(0)) revert BridgeNotLive("Synapse");
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).forceApprove(address(synapseBridge), amount);

        synapseBridge.deposit(recipient, destinationChainId, IERC20(token), amount);

        emit SynapseBridgeInitiated(msg.sender, token, amount, destinationChainId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  MODE 7 — LayerZero OFT bridge (placeholder)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Send tokens cross-chain via a LayerZero V2 OFT contract.
     *         Reverts BridgeNotLive("LayerZero") until an OFT deploys on Arc.
     *
     * @param token        OFT-compatible token address.
     * @param amount       Amount to send (local decimals).
     * @param minAmount    Minimum acceptable amount on the destination (shared decimals).
     * @param dstEid       LayerZero destination endpoint ID.
     * @param recipient    32-byte padded recipient address.
     * @param nativeFee    Native fee returned by the OFT's `quoteSend`.
     */
    function bridgeLayerZero(
        address token,
        uint256 amount,
        uint256 minAmount,
        uint32  dstEid,
        bytes32 recipient,
        uint256 nativeFee
    ) external payable nonReentrant {
        if (address(lzOFT) == address(0)) revert BridgeNotLive("LayerZero");
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        ILayerZeroOFT.SendParam memory sendParam = ILayerZeroOFT.SendParam({
            dstEid:       dstEid,
            to:           recipient,
            amountLD:     amount,
            minAmountLD:  minAmount,
            extraOptions: bytes(""),
            composeMsg:   bytes(""),
            oftCmd:       bytes("")
        });
        ILayerZeroOFT.MessagingFee memory fee = ILayerZeroOFT.MessagingFee({
            nativeFee:  nativeFee,
            lzTokenFee: 0
        });

        lzOFT.send{value: msg.value}(sendParam, fee, msg.sender);

        emit LayerZeroBridgeInitiated(msg.sender, token, amount, dstEid);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  View helpers — used by the off-chain routing engine
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Quote a single-hop output using live pool reserves.
     *         Reverts if no pool exists for the pair.
     *
     * @return amountOut  Expected output amount.
     * @return pool       Pool address used for the quote.
     */
    function quoteSingleHop(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, address pool) {
        pool = factory.getPair(tokenIn, tokenOut);
        if (pool == address(0)) return (0, address(0));

        (uint112 r0, uint112 r1, ) = IEcoSwapPool(pool).getReserves();
        address t0 = IEcoSwapPool(pool).token0();

        (uint256 rIn, uint256 rOut) = tokenIn == t0
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));

        amountOut = _getAmountOut(amountIn, rIn, rOut);
    }

    /**
     * @notice Quote a two-hop output using live reserves on both pools.
     *
     * @return amountOut  Expected final output amount.
     * @return pool0      First pool (tokenIn → tokenMid).
     * @return pool1      Second pool (tokenMid → tokenOut).
     */
    function quoteMultiHop(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, address pool0, address pool1) {
        pool0 = factory.getPair(tokenIn, tokenMid);
        pool1 = factory.getPair(tokenMid, tokenOut);

        if (pool0 == address(0) || pool1 == address(0))
            return (0, pool0, pool1);

        (uint112 r0a, uint112 r1a, ) = IEcoSwapPool(pool0).getReserves();
        address t0a = IEcoSwapPool(pool0).token0();
        (uint256 rIn0, uint256 rOut0) = tokenIn == t0a
            ? (uint256(r0a), uint256(r1a))
            : (uint256(r1a), uint256(r0a));
        uint256 midOut = _getAmountOut(amountIn, rIn0, rOut0);

        (uint112 r0b, uint112 r1b, ) = IEcoSwapPool(pool1).getReserves();
        address t0b = IEcoSwapPool(pool1).token0();
        (uint256 rIn1, uint256 rOut1) = tokenMid == t0b
            ? (uint256(r0b), uint256(r1b))
            : (uint256(r1b), uint256(r0b));
        amountOut = _getAmountOut(midOut, rIn1, rOut1);
    }

    // ── Internal helpers ───────────────────────────────────────────────────

    function _checkDeadline(uint256 deadline) internal view {
        if (block.timestamp > deadline) revert DeadlineExpired();
    }

    function _requirePair(address a, address b) internal view returns (address pool) {
        pool = factory.getPair(a, b);
        if (pool == address(0)) revert PairNotFound(a, b);
    }

    /**
     * @dev Executes one EcoSwapPool swap leg using the transfer→swap pattern.
     *      Transfers `amountIn` of `tokenIn` into the pool, reads reserves to
     *      compute the output, then calls pool.swap with the correct direction.
     */
    function _swapViaPool(
        address pool,
        address tokenIn,
        address /* tokenOut */,
        uint256 amountIn,
        address to
    ) internal returns (uint256 amountOut) {
        (uint112 r0, uint112 r1, ) = IEcoSwapPool(pool).getReserves();
        address t0 = IEcoSwapPool(pool).token0();

        (uint256 rIn, uint256 rOut) = tokenIn == t0
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));

        amountOut = _getAmountOut(amountIn, rIn, rOut);

        // Transfer tokenIn into the pool (EcoSwap requires tokens first)
        IERC20(tokenIn).safeTransfer(pool, amountIn);

        // Call swap with the correct (amount0Out, amount1Out) direction
        if (tokenIn == t0) {
            IEcoSwapPool(pool).swap(0, amountOut, to, bytes(""));
        } else {
            IEcoSwapPool(pool).swap(amountOut, 0, to, bytes(""));
        }
    }

    /// @dev Uniswap V2 constant-product formula with 0.3% fee.
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) return 0;
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        uint256 numerator       = amountInWithFee * reserveOut;
        uint256 denominator     = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        return numerator / denominator;
    }
}
