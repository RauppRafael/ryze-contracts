# Solidity API

## RyzeWhitelist

This contract manages a list of whitelisted addresses and a manager role who can update this list.

_It leverages the ownership functionality provided by RyzeOwnableUpgradeable._

### manager

```solidity
address manager
```

### WhitelistUpdated

```solidity
event WhitelistUpdated(address user, bool whitelisted)
```

### ManagerUpdated

```solidity
event ManagerUpdated(address user)
```

### Unauthorized

```solidity
error Unauthorized()
```

### InvalidZeroAddress

```solidity
error InvalidZeroAddress()
```

### onlyManager

```solidity
modifier onlyManager()
```

Modifier to restrict function access only to the manager.

### initialize

```solidity
function initialize(address _gnosisSafe, address _manager) public
```

### isWhitelisted

```solidity
function isWhitelisted(address _user) external view returns (bool)
```

Check if an address is whitelisted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | Address to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the address is whitelisted, false otherwise. |

### updateUserWhitelistStatus

```solidity
function updateUserWhitelistStatus(address _user, bool _whitelisted) external
```

Updates the whitelist status of an address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | Address to update. |
| _whitelisted | bool | Whitelist status to set for the address. |

### setManager

```solidity
function setManager(address _user) public
```

Sets the manager's address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | Address to be set as the manager. |

