# Solidity API

## RyzeAllocator

Manages allocations for real estate tokens in exchange for stablecoins or ETH.
Users can acquire allocations directly or through referrals, with potential rewards.
The contract tracks each token's allocation information and state.

### AllocationState

```solidity
enum AllocationState {
  PRE_SALE,
  PENDING,
  ENABLED,
  DISABLED
}
```

### AllocationInfo

```solidity
struct AllocationInfo {
  uint256 totalAllocated;
  enum RyzeAllocator.AllocationState allocationState;
}
```

### liquidityInitializer

```solidity
address liquidityInitializer
```

### router

```solidity
contract RyzeRouter router
```

### tokenDatabase

```solidity
contract RyzeTokenDatabase tokenDatabase
```

### allocationToken

```solidity
contract RyzeToken allocationToken
```

### allocationRewardToken

```solidity
contract RyzeToken allocationRewardToken
```

### stablecoin

```solidity
contract IERC20MetadataUpgradeable stablecoin
```

### initialLiquidityBasisPoints

```solidity
uint16 initialLiquidityBasisPoints
```

### referralRewardBasisPoints

```solidity
uint16 referralRewardBasisPoints
```

### allocationInfos

```solidity
mapping(uint256 => struct RyzeAllocator.AllocationInfo) allocationInfos
```

### disabledTokenValue

```solidity
mapping(uint256 => uint256) disabledTokenValue
```

### TokenStateChanged

```solidity
event TokenStateChanged(uint256 realEstateTokenId, enum RyzeAllocator.AllocationState state)
```

### InvalidAllocationState

```solidity
error InvalidAllocationState(enum RyzeAllocator.AllocationState expected, enum RyzeAllocator.AllocationState current)
```

### InvalidTokenId

```solidity
error InvalidTokenId()
```

### InvalidAmount

```solidity
error InvalidAmount()
```

### InsufficientBalance

```solidity
error InsufficientBalance()
```

### initialize

```solidity
function initialize(address _owner, address _whitelist, address _router, address _tokenDatabase, address _liquidityInitializer, address _allocationRewardToken, address _allocationToken, address _stablecoin, uint16 _initialLiquidityBasisPoints, uint16 _referralRewardBasisPoints) public
```

### _initializeAllocation

```solidity
function _initializeAllocation(uint256 _tokenId) internal
```

_Internal function to initialize allocation for a given token ID._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token for which allocation is to be initialized. |

### allocate

```solidity
function allocate(uint256 _tokenId, uint256 _amount, address _referrer) external
```

Allocates a specified amount of tokens to a user. Requires user to be whitelisted.

_This function handles the basic allocation logic. The amount being allocated should already be approved for transfer._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to be allocated. |
| _amount | uint256 | The amount of tokens to be allocated. |
| _referrer | address | The address of the referrer. |

### allocateWithDaiPermit

```solidity
function allocateWithDaiPermit(uint256 _tokenId, uint256 _amount, address _referrer, struct Permit.DaiPermitInfo _permitInfo) external
```

Allocates with the help of a permit.

_This function uses the DAI permit mechanism to allocate tokens without needing a separate approve transaction._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to be allocated. |
| _amount | uint256 | The amount of tokens to be allocated. |
| _referrer | address | The address of the referrer. |
| _permitInfo | struct Permit.DaiPermitInfo | The permit details required for approving Dai. |

### allocateWithErc2612Permit

```solidity
function allocateWithErc2612Permit(uint256 _tokenId, uint256 _amount, address _referrer, struct Permit.ERC2612PermitInfo _permitInfo) external
```

Allocates with the help of a permit.

_This function uses the ERC1612 permit mechanism to allocate tokens without needing a separate approve transaction._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to be allocated. |
| _amount | uint256 | The amount of tokens to be allocated. |
| _referrer | address | The address of the referrer. |
| _permitInfo | struct Permit.ERC2612PermitInfo | The permit details required for approving the token. |

### allocateWithEth

```solidity
function allocateWithEth(uint256 _tokenId, uint256 _minAmount, address _referrer) external payable
```

Allocates using Ether by converting it to stablecoins first. Requires user to be whitelisted.

_This function first converts the received Ether to stablecoins using the router, then allocates the converted amount._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to be allocated. |
| _minAmount | uint256 | The minimum amount of allocation tokens expected to receive in the conversion. |
| _referrer | address | The address of the referrer. |

### _mintAllocation

```solidity
function _mintAllocation(uint256 _tokenId, uint256 _requestedAmount, address _user, bool _isReward) internal
```

_Internal function to mint the given allocation amount for a specific token to a user or referrer._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token for which the allocation is minted. |
| _requestedAmount | uint256 | The amount of tokens to mint. |
| _user | address | The address of the user to receive the minted allocation. |
| _isReward | bool | Indicates if the minted allocation is a reward. |

### burnAllocation

```solidity
function burnAllocation(uint256 _tokenId) external
```

Burns a user's allocation of a specified token. Requires user to be whitelisted.

_This function removes the allocation from a user, effectively decreasing the user's balance of that specific token._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to be burned. |

### claimStablecoins

```solidity
function claimStablecoins() external
```

Allows the owner to claim the accumulated stablecoins from this contract.

_Transfers all stablecoin balance from the contract to the owner._

### enableToken

```solidity
function enableToken(uint256 _tokenId) external
```

Enables a token for allocation.

_Modifies the state of the token to "ENABLED". Only the owner can call this function._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to be enabled. |

### disableToken

```solidity
function disableToken(uint256 _tokenId, uint256 _value) external
```

Disables a token from allocation.

_Modifies the state of the token to "DISABLED" and assigns a value to the disabled token. Only the owner can call this function._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to be disabled. |
| _value | uint256 | The value to be associated with the disabled token. |

### onERC1155Received

```solidity
function onERC1155Received(address, address, uint256, uint256, bytes) public pure returns (bytes4)
```

_Implementation for the ERC-1155 token received interface._

### isEnabled

```solidity
function isEnabled(uint256 _tokenId) external view returns (bool)
```

Checks if a token is enabled for allocation.

_Queries the state of the token from the allocationInfos mapping._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token to be checked. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns true if the token is enabled, false otherwise. |

### receive

```solidity
receive() external payable
```

Fallback function to accept Ether payments. Ensures only transactions from the router are accepted.

