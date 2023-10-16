# Solidity API

## RyzeTokenConverter

Manages the conversion of tokens between different standards and representations.

_Enables converting between ERC1155 (NFT) representations and their liquid ERC20 counterparts._

### Vesting

```solidity
struct Vesting {
  uint256 totalAmount;
  uint256 claimedAmount;
}
```

### VESTING_PERIOD

```solidity
uint256 VESTING_PERIOD
```

### vestingBalances

```solidity
mapping(address => mapping(uint256 => struct RyzeTokenConverter.Vesting)) vestingBalances
```

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

### TooManyTokens

```solidity
error TooManyTokens()
```

### InvalidZeroAddress

```solidity
error InvalidZeroAddress()
```

### initialize

```solidity
function initialize(address _gnosisSafe, address _tokenDatabase, address _allocator, address _allocationRewardToken, address _allocationToken, address _realEstateToken) public
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
function convertAllocationToRealEstateErc1155(uint256 _tokenId) public
```

Converts their allocation tokens into ERC1155 real estate tokens.

_This function allows the caller to claim their share of real estate tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to claim. |

### convertManyAllocationsToRealEstate1155

```solidity
function convertManyAllocationsToRealEstate1155(uint256[] _tokenIds) external
```

Converts multiple allocation tokens into ERC1155 real estate tokens in a batch.

_This function allows the caller to claim their share of multiple real estate tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenIds | uint256[] | An array of token IDs to claim. |

### convertAllocationToRealEstateErc20

```solidity
function convertAllocationToRealEstateErc20(uint256 _tokenId) public
```

Convert allocation tokens into liquid ERC20 real estate tokens.

_This function allows the caller to claim their share of real estate tokens and convert it to a liquid token._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to claim |

### convertManyAllocationsToRealEstateErc20

```solidity
function convertManyAllocationsToRealEstateErc20(uint256[] _tokenIds) external
```

Converts multiple allocation tokens into liquid ERC20 real estate tokens in a batch.

_Claims multiple real estate tokens and converts the claimed tokens to their erc20 equivalent._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenIds | uint256[] | Array of token IDs to be claimed. |

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

### convertAllocationRewardToRealEstateErc20

```solidity
function convertAllocationRewardToRealEstateErc20(uint256 _tokenId) external
```

Converts a user's allocation rewards into liquid ERC20 real estate tokens.

_This function first checks the reward balance of the caller based on the provided token ID.
If there's a balance, it updates the total vested amount.
The function then calculates the claimable amount based on the vesting progression and mints equivalent liquid ERC20 tokens to the caller._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the NFT token. |

### vestedAmount

```solidity
function vestedAmount(address _user, uint256 _tokenId) public view returns (uint256)
```

Calculate the amount of tokens that have vested for a user based on a particular token ID.

_This function takes into account the total vesting duration and the time since the user's first claim._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | Address of the user whose vested amount needs to be checked. |
| _tokenId | uint256 | The ID of the NFT token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of tokens that have vested for the user. |

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

### _initializeFirstConversionTimestamp

```solidity
function _initializeFirstConversionTimestamp(uint256 _tokenId) internal
```

Initializes the first claim timestamp for a given token ID.

_Used to track vesting start time for each token._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the NFT token. |

### _calculateElapsedTimePercentage

```solidity
function _calculateElapsedTimePercentage(uint256 startTime, uint256 finishTime) public view returns (uint256)
```

Calculates the percentage of elapsed time since the start of a vesting period.

_The result is multiplied by 1e6 for precision._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| startTime | uint256 | The starting timestamp of the vesting period. |
| finishTime | uint256 | The ending timestamp of the vesting period. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The percentage of elapsed time (multiplied by 1e6). |

