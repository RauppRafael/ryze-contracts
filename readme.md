# Ryze contracts

## Contracts Documentation

- [Main Contracts](#main-contracts)
- [General Libraries](#general-libraries)
- [Abstract Contracts](#abstract-contracts)
- [Dex Contracts](#dex-contracts)
- [Dex Libraries](#dex-libraries)

### Main Contracts

1. [RyzeAllocator](docs/RyzeAllocator.md)
2. [RyzeLiquidityInitializer](docs/RyzeLiquidityInitializer.md)
3. [RyzeLiquidToken](docs/RyzeLiquidToken.md)
4. [RyzeStaking](docs/RyzeStaking.md)
5. [RyzeToken](docs/RyzeToken.md)
6. [RyzeTokenConverter](docs/RyzeTokenConverter.md)
7. [RyzeTokenDatabase](docs/RyzeTokenDatabase.md)
8. [RyzeWhitelist](docs/RyzeWhitelist.md)

### General Libraries

1. [Permit](docs/libraries/Permit.md)

### Abstract Contracts

1. [RyzeOwnableUpgradeable](docs/abstract/RyzeOwnableUpgradeable.md)
2. [RyzeWhitelistUser](docs/abstract/RyzeWhitelistUser.md)

### Dex Contracts

1. [RyzeFactory](docs/dex/RyzeFactory.md)
2. [RyzePair](docs/dex/RyzePair.md)
3. [RyzeRouter](docs/dex/RyzeRouter.md)

### Dex Libraries

1. [RyzeLibrary](docs/dex/libraries/RyzeLibrary.md)
2. [TransferHelper](docs/dex/libraries/TransferHelper.md)
3. [UQ112x112](docs/dex/libraries/UQ112x112.md)

## Contract addresses

### Avalanche testnet

| Name                        | Address                                                                                                                | 
|-----------------------------|------------------------------------------------------------------------------------------------------------------------| 
| GnosisSafe                  | [`0xf61079c96f3d8a77d3f2af2414ba42cf3a013638`](https://arbiscan.io/address/0xf61079c96f3d8a77d3f2af2414ba42cf3a013638) | 
| WrappedEther                | [`0x82af49447d8a07e3bd95bd0d56f35241523fbab1`](https://arbiscan.io/address/0x82af49447d8a07e3bd95bd0d56f35241523fbab1) | 
| Stablecoin                  | [`0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9`](https://arbiscan.io/address/0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9) | 
| ProjectDeployer             | [`0x128ba04f794574cdcd683434774de447e938911d`](https://arbiscan.io/address/0x128ba04f794574cdcd683434774de447e938911d) | 
| RyzeFactory                 | [`0x5afe0000755b5420596ede21a07f745c9414c1a0`](https://arbiscan.io/address/0x5afe0000755b5420596ede21a07f745c9414c1a0) | 
| RyzeRouter                  | [`0x5afe0000b7ac7c5ca66cd0d874d6d00b6139538b`](https://arbiscan.io/address/0x5afe0000b7ac7c5ca66cd0d874d6d00b6139538b) | 
| RyzeAllocationRewardToken   | [`0x5afe0000651264f85f9c0eba49f6f1e46c925c9a`](https://arbiscan.io/address/0x5afe0000651264f85f9c0eba49f6f1e46c925c9a) | 
| RyzeAllocationToken         | [`0x5afe00004f0e9ee2370a5675908d08276d6d1d08`](https://arbiscan.io/address/0x5afe00004f0e9ee2370a5675908d08276d6d1d08) | 
| RyzeRealEstateToken         | [`0x5afe0000780c21f394a441b343c9aa531f4a9b2e`](https://arbiscan.io/address/0x5afe0000780c21f394a441b343c9aa531f4a9b2e) | 
| RyzeAllocator               | [`0x5afe00001924f15b5851f87b8d81c7486487ce12`](https://arbiscan.io/address/0x5afe00001924f15b5851f87b8d81c7486487ce12) | 
| RyzeTokenDatabase           | [`0x5afe0000be56aaefffcf2c363be97d0abc7c3fbe`](https://arbiscan.io/address/0x5afe0000be56aaefffcf2c363be97d0abc7c3fbe) | 
| RyzeTokenConverter          | [`0x5afe000016f8a453fd24e88cb43a9ddfbc311964`](https://arbiscan.io/address/0x5afe000016f8a453fd24e88cb43a9ddfbc311964) | 
| RyzeLiquidityInitializer    | [`0x5afe0000c96c93c1da150ad146075d3086153ee9`](https://arbiscan.io/address/0x5afe0000c96c93c1da150ad146075d3086153ee9) | 
| RyzeWhitelist               | [`0x5afe00007d78957cacaf2a3d25f6f0b8369b76d6`](https://arbiscan.io/address/0x5afe00007d78957cacaf2a3d25f6f0b8369b76d6) | 
| EthStablecoinPair           | [`0xe4e6226856c68107444a851841bf86e17336d860`](https://arbiscan.io/address/0xe4e6226856c68107444a851841bf86e17336d860) | 

## Deploying / Running tests

- Configure the .env file
- Configure the .explorer-keys.json by adding the explorer api key of the desired chains

### Test

```bash
npm run test
```

### Deploy

```bash
npm run deploy
```
