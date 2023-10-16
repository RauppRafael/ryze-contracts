# Solidity API

## RyzeLiquidityInitializer

This contract initializes liquidity for the Ryze ecosystem.

_Interacts with multiple components: RyzeRouter, RyzeAllocator, and RyzeTokenConverter to facilitate the liquidity initialization process._

### allocator

```solidity
contract RyzeAllocator allocator
```

### tokenConverter

```solidity
contract RyzeTokenConverter tokenConverter
```

### router

```solidity
contract RyzeRouter router
```

### allocationToken

```solidity
contract IERC1155Upgradeable allocationToken
```

### stablecoin

```solidity
contract IERC20Upgradeable stablecoin
```

### InvalidZeroAddress

```solidity
error InvalidZeroAddress()
```

### initialize

```solidity
function initialize(address _gnosisSafe, address _router, address _allocator, address _tokenConverter, address _allocationToken, address _stablecoin) public
```

### allocation

```solidity
function allocation(uint256 _tokenId) public view returns (uint256)
```

Returns the balance of a given allocation ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the allocation to query. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint The balance of the specified allocation ID. |

### calculateStablecoinsRequired

```solidity
function calculateStablecoinsRequired(uint256 _tokenId, uint256 _stablecoinToRealEstateRatio) external view returns (uint256)
```

Computes the amount of stablecoins needed to initialize liquidity for a specific token, based on a given ratio.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the allocation. |
| _stablecoinToRealEstateRatio | uint256 | Ratio of stablecoins to real estate tokens. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint The calculated amount of stablecoins required. |

### claimAndAddLiquidity

```solidity
function claimAndAddLiquidity(uint256 _tokenId, uint256 _stablecoinToRealEstateRatio) external
```

Claims the allocation token, converts it into real estate ERC20, and adds it as liquidity.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token/allocation to claim and add as liquidity. |
| _stablecoinToRealEstateRatio | uint256 | Ratio of stablecoins to real estate tokens for liquidity addition. |

### onERC1155Received

```solidity
function onERC1155Received(address, address, uint256, uint256, bytes) public pure returns (bytes4)
```

ERC-1155 receiver hook that allows this contract to accept incoming ERC-1155 transfers.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes4 | bytes4 The function selector for ERC-1155 compliance. |

### _approveRouter

```solidity
function _approveRouter(address _token, uint256 _amount) internal
```

_Approves the router to spend a given amount of a specific token._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | Address of the token to approve. |
| _amount | uint256 | Amount of the token to approve. |

