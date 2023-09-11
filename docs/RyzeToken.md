# Solidity API

## RyzeToken

### name

```solidity
string name
```

### symbol

```solidity
string symbol
```

### minter

```solidity
address minter
```

### tokenConverter

```solidity
address tokenConverter
```

### Unauthorized

```solidity
error Unauthorized()
```

### initialize

```solidity
function initialize(address _gnosisSafe, string _name, string _symbol, string _metadataUri) public
```

### initialize2

```solidity
function initialize2(address _owner, address _minter, address _tokenConverter) public
```

### isApprovedForAll

```solidity
function isApprovedForAll(address _account, address _operator) public view virtual returns (bool)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

### mint

```solidity
function mint(address _to, uint256 _tokenId, uint256 _amount) external
```

