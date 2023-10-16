# Solidity API

## RyzeStaking

This contract allows users to stake real estate tokens and earn rewards.

_Interacts with multiple components: RyzeRouter, RyzeTokenConverter, and RyzePair._

### UserInfo

```solidity
struct UserInfo {
  uint256 stake;
  uint256 rewardDebt;
  uint256 lastDepositTimestamp;
}
```

### router

```solidity
contract RyzeRouter router
```

### tokenConverter

```solidity
contract RyzeTokenConverter tokenConverter
```

### realEstateToken

```solidity
contract IERC1155Upgradeable realEstateToken
```

### stablecoin

```solidity
contract IERC20MetadataUpgradeable stablecoin
```

### REWARD_MATURATION_TIME

```solidity
uint256 REWARD_MATURATION_TIME
```

### RewardsNotMatured

```solidity
error RewardsNotMatured()
```

### accumulatedRewardPerToken

```solidity
mapping(uint256 => mapping(bool => uint256)) accumulatedRewardPerToken
```

### initialize

```solidity
function initialize(address _gnosisSafe, address _whitelist, address _router, address _tokenConverter, address _realEstateToken, address _stablecoin) public
```

### stakeERC1155

```solidity
function stakeERC1155(uint256 _tokenId, uint256 _amount) external
```

Stakes an NFT to earn rewards.

_Converts an ERC1155 token to ERC20 and then stakes it._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the ERC1155 token. |
| _amount | uint256 | Amount of ERC1155 tokens to be converted and staked. |

### stakeERC20WithPermit

```solidity
function stakeERC20WithPermit(uint256 _tokenId, bool _isPair, uint256 _amount, struct Permit.ERC2612PermitInfo _permitInfo) external
```

Stakes liquid tokens or pairs with a permit for gasless approvals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the token/allocation. |
| _isPair | bool | If the staking token is a pair or single token. |
| _amount | uint256 | Amount of tokens to stake. |
| _permitInfo | struct Permit.ERC2612PermitInfo | Permit details for approval. |

### stakeERC20

```solidity
function stakeERC20(uint256 _tokenId, bool _isPair, uint256 _amount) public
```

Stakes a liquid token or a pair.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the token/allocation. |
| _isPair | bool | If the staking token is a pair or single token. |
| _amount | uint256 | Amount of tokens to stake. |

### _stake

```solidity
function _stake(uint256 _tokenId, bool _isPair, uint256 _amount) internal
```

Internal staking function.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the token/allocation. |
| _isPair | bool | If the staking token is a pair or single token. |
| _amount | uint256 | Amount of tokens to stake. |

### unstake

```solidity
function unstake(uint256 _tokenId, bool _isPair, uint256 _desiredAmount) external
```

Unstakes a liquid token or a pair.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the token/allocation. |
| _isPair | bool | If the staking token is a pair or single token. |
| _desiredAmount | uint256 | Amount of tokens to unstake. |

### claimRewards

```solidity
function claimRewards(uint256 _tokenId, bool _isPair) external
```

Claims pending rewards.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the token. |
| _isPair | bool | If the staking token is a pair or single token. |

### _claimRewards

```solidity
function _claimRewards(uint256 _tokenId, bool _isPair) internal
```

### distribute

```solidity
function distribute(uint256 _tokenId, uint256 _amount) external
```

Distributes the rewards for a given token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the token/allocation. |
| _amount | uint256 | Amount of stablecoins to distribute. |

### _distribute

```solidity
function _distribute(uint256 _tokenId, uint256 _amount) internal
```

### _getStakedBalances

```solidity
function _getStakedBalances(uint256 _tokenId) internal view returns (uint256 pairBalance, uint256 pairUnderlyingBalance, uint256 liquidTokenBalance, uint256 totalRealEstateBalance)
```

### userInfo

```solidity
function userInfo(uint256 _tokenId, bool _isPair, address _user) external view returns (uint256 stake_, uint256 pendingRewards_, uint256 lastDepositTimestamp_)
```

Provides staking details of a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | ID of the token/allocation. |
| _isPair | bool | If the staking token is a pair or single token. |
| _user | address | Address of the user. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stake_ | uint256 | Amount of tokens staked by the user. |
| pendingRewards_ | uint256 | Pending rewards for the user. |
| lastDepositTimestamp_ | uint256 |  |

### _balance

```solidity
function _balance(address _token) internal view returns (uint256)
```

### _getStakingToken

```solidity
function _getStakingToken(uint256 _tokenId, bool _isPair) internal view returns (address)
```

### _getPair

```solidity
function _getPair(uint256 _tokenId) internal view returns (address)
```

### _getRealEstateReserves

```solidity
function _getRealEstateReserves(address _pair) internal view returns (uint112)
```

### _calculateAccumulatedRewards

```solidity
function _calculateAccumulatedRewards(uint256 _tokenId, bool _isPair, uint256 _userStake) internal view returns (uint256)
```

### _isDepositMatured

```solidity
function _isDepositMatured(uint256 _depositTimestamp) internal view returns (bool)
```

### _changeBase

```solidity
function _changeBase(uint8 _from, uint8 _to, uint256 _amount) internal pure returns (uint256 value_)
```

