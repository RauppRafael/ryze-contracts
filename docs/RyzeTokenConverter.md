# Solidity API

## RyzeTokenConverter

Manages the conversion of tokens between different standards and representations.

_Enables converting between ERC1155 (NFT) representations and their liquid ERC20 counterparts._

### tokenDatabase

```solidity
contract RyzeTokenDatabase tokenDatabase
```

### allocator

```solidity
contract RyzeAllocator allocator
```

### allocationRewardToken

```solidity
contract RyzeToken allocationRewardToken
```

### allocationToken

```solidity
contract RyzeToken allocationToken
```

### realEstateToken

```solidity
contract RyzeToken realEstateToken
```

### CreatedLiquidToken

```solidity
event CreatedLiquidToken(address liquidToken, uint256 nftId)
```

### TokenNotEnabled

```solidity
error TokenNotEnabled()
```

### InsufficientBalance

```solidity
error InsufficientBalance()
```

### initialize

```solidity
function initialize(address _owner, address _tokenDatabase, address _allocator, address _allocationRewardToken, address _allocationToken, address _realEstateToken) public
```

### getLiquidToken

```solidity
function getLiquidToken(uint256 _tokenId) external view returns (address)
```

Retrieves the address of the liquid ERC20 token associated with a given NFT ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the NFT. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Address of the corresponding liquid token. |

### convertAllocationToRealEstateErc1155

```solidity
function convertAllocationToRealEstateErc1155(uint256 _tokenId, bool _useReward) public
```

Converts their allocation tokens into ERC1155 real estate tokens.

_This function allows the caller to claim their share of real estate tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to claim. |
| _useReward | bool | Whether to use the reward token or the main allocation token. |

### convertManyAllocationsToRealEstate1155

```solidity
function convertManyAllocationsToRealEstate1155(uint256[] _tokenIds, bool _useReward) external
```

Converts multiple allocation tokens into ERC1155 real estate tokens in a batch.

_This function allows the caller to claim their share of multiple real estate tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenIds | uint256[] | An array of token IDs to claim. |
| _useReward | bool | Whether to use the reward token or the main allocation token. |

### convertAllocationToRealEstateErc20

```solidity
function convertAllocationToRealEstateErc20(uint256 _tokenId, bool _useReward) public
```

Convert allocation tokens into liquid ERC20 real estate tokens.

_This function allows the caller to claim their share of real estate tokens and convert it to a liquid token._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to claim |
| _useReward | bool | A flag to determine whether to use the reward token or the allocation token for claiming |

### convertManyAllocationsToRealEstateErc20

```solidity
function convertManyAllocationsToRealEstateErc20(uint256[] _tokenIds, bool _useReward) external
```

Converts multiple allocation tokens into liquid ERC20 real estate tokens in a batch.

_Claims multiple real estate tokens and converts the claimed tokens to their erc20 equivalent._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenIds | uint256[] | Array of token IDs to be claimed. |
| _useReward | bool | Boolean value indicating whether to claim rewards instead of main token allocations. |

### convertRealEstateFromErc20ToErc1155

```solidity
function convertRealEstateFromErc20ToErc1155(uint256 _tokenId, uint256 _amount) public
```

Converts liquid ERC20 tokens back to ERC1155 real estate tokens.

_Burns liquid tokens and mints the equivalent amount of NFTs.
When specifying the `_amount`, ensure that you use the actual token count (e.g., 1)
and not its underlying representation (e.g., 1e18)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the NFT to convert to. |
| _amount | uint256 | The amount of NFTs to receive, not considering decimals. |

### convertRealEstateFromErc1155ToErc20

```solidity
function convertRealEstateFromErc1155ToErc20(uint256 _tokenId, uint256 _amount) external
```

Convert ERC1155 real estate tokens into liquid ERC20 tokens.

_The sender's NFTs will be burned and they will receive the equivalent amount of liquid tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the NFT to convert from. |
| _amount | uint256 | The amount of NFTs to convert. |

### _mintLiquidToken

```solidity
function _mintLiquidToken(uint256 _tokenId, uint256 _amount) internal
```

### _createLiquidToken

```solidity
function _createLiquidToken(uint256 _tokenId) internal returns (address)
```

_Internal function that creates a liquid token._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the NFT token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the newly created liquid token. |

### _collectAllocationToken

```solidity
function _collectAllocationToken(uint256 _tokenId, bool _useReward) internal returns (uint256)
```

Collects the allocation token (either reward or regular) from a user.

_This function is used internally when a user converts their allocation tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the NFT. |
| _useReward | bool | If set to true, the reward token is collected, else the regular allocation token is collected. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of tokens collected from the user. |

