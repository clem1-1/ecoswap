// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

interface IEcoSwapFactory {
    function feeTo() external view returns (address);
}

/// @title EcoSwapPool
/// @notice Uniswap V2-style constant-product AMM pool with ERC-20 LP shares.
contract EcoSwapPool is ERC20 {
    using SafeERC20 for IERC20;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    // Immutable because factory address is set once at construction and never changes.
    address public immutable factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint256 public kLast;

    uint256 private unlocked = 1;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    modifier lock() {
        require(unlocked == 1, "EcoSwap: LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor() ERC20("EcoSwap LP", "ECO-LP") {
        factory = msg.sender;
    }

    /// @notice Initializes the pool tokens. Callable only once by factory.
    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, "EcoSwap: FORBIDDEN");
        require(token0 == address(0) && token1 == address(0), "EcoSwap: ALREADY_INITIALIZED");
        require(_token0 != _token1, "EcoSwap: IDENTICAL_ADDRESSES");
        require(_token0 != address(0) && _token1 != address(0), "EcoSwap: ZERO_ADDRESS");

        token0 = _token0;
        token1 = _token1;
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    /// @notice Adds liquidity and mints LP tokens to `to`.
    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1, ) = _getReserves();

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            require(liquidity > 0, "EcoSwap: INSUFFICIENT_LIQUIDITY_MINTED");
            _mint(address(1), MINIMUM_LIQUIDITY);
        } else {
            liquidity = _min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
            require(liquidity > 0, "EcoSwap: INSUFFICIENT_LIQUIDITY_MINTED");
        }

        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) {
            kLast = uint256(reserve0) * uint256(reserve1);
        }

        emit Mint(msg.sender, amount0, amount1);
    }

    /// @notice Burns LP tokens held by this pair and sends underlying to `to`.
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1, ) = _getReserves();

        address _token0 = token0;
        address _token1 = token1;

        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply();

        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        require(amount0 > 0 && amount1 > 0, "EcoSwap: INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(address(this), liquidity);
        IERC20(_token0).safeTransfer(to, amount0);
        IERC20(_token1).safeTransfer(to, amount1);

        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) {
            kLast = uint256(reserve0) * uint256(reserve1);
        }

        emit Burn(msg.sender, amount0, amount1, to);
    }

    // Struct used in swap() to avoid stack-too-deep on the Paris EVM target.
    struct SwapLocals {
        uint112 reserve0;
        uint112 reserve1;
        uint256 balance0;
        uint256 balance1;
        uint256 amount0In;
        uint256 amount1In;
    }

    /// @notice Swaps out one token for the other, enforcing x*y=k with 0.3% fee.
    /// @param data Ignored (kept for Uniswap V2-style ABI compatibility).
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external lock {
        data; // explicitly ignored: no flash callback in this prototype.
        require(amount0Out > 0 || amount1Out > 0, "EcoSwap: INSUFFICIENT_OUTPUT_AMOUNT");

        SwapLocals memory s;
        (s.reserve0, s.reserve1, ) = _getReserves();
        require(amount0Out < s.reserve0 && amount1Out < s.reserve1, "EcoSwap: INSUFFICIENT_LIQUIDITY");
        require(to != token0 && to != token1, "EcoSwap: INVALID_TO");

        if (amount0Out > 0) IERC20(token0).safeTransfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).safeTransfer(to, amount1Out);

        s.balance0 = IERC20(token0).balanceOf(address(this));
        s.balance1 = IERC20(token1).balanceOf(address(this));
        s.amount0In = s.balance0 > (s.reserve0 - amount0Out) ? s.balance0 - (s.reserve0 - amount0Out) : 0;
        s.amount1In = s.balance1 > (s.reserve1 - amount1Out) ? s.balance1 - (s.reserve1 - amount1Out) : 0;
        require(s.amount0In > 0 || s.amount1In > 0, "EcoSwap: INSUFFICIENT_INPUT_AMOUNT");

        // Verify constant-product invariant after the 0.3% fee (multiply-by-1000 avoids fractions).
        require(
            ((s.balance0 * 1000) - (s.amount0In * 3)) * ((s.balance1 * 1000) - (s.amount1In * 3))
                >= uint256(s.reserve0) * uint256(s.reserve1) * (1_000_000),
            "EcoSwap: K"
        );

        _update(s.balance0, s.balance1, s.reserve0, s.reserve1);
        emit Swap(msg.sender, s.amount0In, s.amount1In, amount0Out, amount1Out, to);
    }

    /// @notice Transfers any excess token balances above reserves to `to`.
    function skim(address to) external lock {
        IERC20(token0).safeTransfer(to, IERC20(token0).balanceOf(address(this)) - reserve0);
        IERC20(token1).safeTransfer(to, IERC20(token1).balanceOf(address(this)) - reserve1);
    }

    /// @notice Forces reserves to match current token balances.
    function sync() external lock {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }

    function _getReserves() private view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /// @dev Updates reserves and cumulative prices for TWAP.
    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) internal {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "EcoSwap: OVERFLOW");

        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;

        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // UQ112x112 price accumulators, compatible with Uniswap V2 style oracle math.
            price0CumulativeLast += ((uint256(_reserve1) << 112) / _reserve0) * timeElapsed;
            price1CumulativeLast += ((uint256(_reserve0) << 112) / _reserve1) * timeElapsed;
        }

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;

        emit Sync(reserve0, reserve1);
    }

    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IEcoSwapFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast;

        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK = Math.sqrt(uint256(_reserve0) * uint256(_reserve1));
                uint256 rootKLast = Math.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply() * (rootK - rootKLast);
                    uint256 denominator = (rootK * 5) + rootKLast;
                    uint256 liquidity = numerator / denominator;
                    if (liquidity > 0) {
                        _mint(feeTo, liquidity);
                    }
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }
}
