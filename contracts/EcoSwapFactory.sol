// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EcoSwapPool} from "./EcoSwapPool.sol";

/// @title EcoSwapFactory
/// @notice Permissionless factory for creating EcoSwapPool pairs.
contract EcoSwapFactory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 allPairsLength);
    event FeeToUpdated(address indexed oldFeeTo, address indexed newFeeTo);
    event FeeToSetterUpdated(address indexed oldSetter, address indexed newSetter);

    constructor(address _feeToSetter) {
        require(_feeToSetter != address(0), "EcoSwap: ZERO_SETTER");
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "EcoSwap: IDENTICAL_ADDRESSES");

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "EcoSwap: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "EcoSwap: PAIR_EXISTS");

        // Unique salt per pair so each pool gets a deterministic but distinct address
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        pair = address(new EcoSwapPool{salt: salt}());
        EcoSwapPool(pair).initialize(token0, token1);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "EcoSwap: FORBIDDEN");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "EcoSwap: FORBIDDEN");
        require(_feeToSetter != address(0), "EcoSwap: ZERO_SETTER");
        feeToSetter = _feeToSetter;
    }
}
