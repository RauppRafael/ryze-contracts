// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IRyzeFactory.sol";
import "./interfaces/IRyzePair.sol";
import "./RyzePair.sol";

contract RyzeFactory is IRyzeFactory, Ownable, Initializable {
    bytes32 public constant PAIR_HASH = keccak256(abi.encodePacked(type(RyzePair).creationCode));

    address public override feeTo;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    function initialize(address _owner) external initializer {
        feeTo = _owner;
        transferOwnership(_owner);
    }

    function allPairsLength() external view override returns (uint) {
        return allPairs.length;
    }

    function createPair(
        address tokenA,
        address tokenB
    ) external override returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(
            getPair[token0][token1] == address(0),
            "PAIR_EXISTS"
        ); // single check is sufficient

        pair = address(new RyzePair{salt: keccak256(abi.encodePacked(token0, token1))}());
        IRyzePair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override onlyOwner {
        feeTo = _feeTo;
    }
}
