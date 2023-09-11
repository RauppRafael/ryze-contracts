# Solidity API

## RyzeFactory

### PAIR_HASH

```solidity
bytes32 PAIR_HASH
```

### feeTo

```solidity
address feeTo
```

### getPair

```solidity
mapping(address => mapping(address => address)) getPair
```

### allPairs

```solidity
address[] allPairs
```

### initialize

```solidity
function initialize(address _owner) external
```

### allPairsLength

```solidity
function allPairsLength() external view returns (uint256)
```

### createPair

```solidity
function createPair(address tokenA, address tokenB) external returns (address pair)
```

### setFeeTo

```solidity
function setFeeTo(address _feeTo) external
```

