# Solidity API

## RyzeTokenDatabase

_Contract to store metadata and max supply of NFT tokens._

### RealEstateTokenMetadata

```solidity
struct RealEstateTokenMetadata {
  string name;
  string symbol;
  bytes32 salt;
}
```

### SymbolUnavailable

```solidity
error SymbolUnavailable()
```

### tokenCount

```solidity
uint256 tokenCount
```

_Total number of NFT tokens registered._

### metadata

```solidity
mapping(uint256 => struct RyzeTokenDatabase.RealEstateTokenMetadata) metadata
```

_Mapping from tokenId to RealEstateTokenMetadata._

### maxSupply

```solidity
mapping(uint256 => uint256) maxSupply
```

_Mapping from tokenId to maxSupply._

### Registered

```solidity
event Registered(uint256 id, string name, string symbol, bytes32 salt, uint256 maxSupply)
```

_Event that is emitted when an NFT token is registered._

### initialize

```solidity
function initialize(address _gnosisSafe) public
```

_Initializes the contract with the address book._

### register

```solidity
function register(string _name, string _symbol, bytes32 _salt, uint256 _maxSupply) public returns (uint256)
```

_Registers a new NFT token._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | Name of the NFT token. |
| _symbol | string | Symbol of the NFT token. |
| _salt | bytes32 | Salt used for the NFT token. |
| _maxSupply | uint256 | Maximum supply of the NFT token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The ID of the NFT token. |

