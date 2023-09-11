# Solidity API

## Permit

### ERC2612PermitInfo

```solidity
struct ERC2612PermitInfo {
  uint256 deadline;
  uint8 v;
  bytes32 r;
  bytes32 s;
}
```

### DaiPermitInfo

```solidity
struct DaiPermitInfo {
  uint256 nonce;
  uint256 expiry;
  uint8 v;
  bytes32 r;
  bytes32 s;
}
```

### approveERC2612

```solidity
function approveERC2612(address _erc20, struct Permit.ERC2612PermitInfo _permitInfo) internal
```

### approveDai

```solidity
function approveDai(address _dai, struct Permit.DaiPermitInfo _permitInfo) internal
```

