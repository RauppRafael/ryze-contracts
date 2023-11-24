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

### Arbitrum One

| Name                        | Address                                                                                                                | 
|-----------------------------|------------------------------------------------------------------------------------------------------------------------| 
| GnosisSafe                  | [`0xcd6e9cba3851f2859304ae85b2b62fa344758c1d`](https://arbiscan.io/address/0xcd6e9cba3851f2859304ae85b2b62fa344758c1d) | 
| WrappedEther                | [`0x82af49447d8a07e3bd95bd0d56f35241523fbab1`](https://arbiscan.io/address/0x82af49447d8a07e3bd95bd0d56f35241523fbab1) | 
| Stablecoin                  | [`0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9`](https://arbiscan.io/address/0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9) | 
| ProjectDeployer             | [`0xe62232ec8b6250cf39572095159596bf3a9bbf6b`](https://arbiscan.io/address/0xe62232ec8b6250cf39572095159596bf3a9bbf6b) | 
| RyzeFactory                 | [`0x5afe00000016a8d5d35c2726a5572bd050aabf8a`](https://arbiscan.io/address/0x5afe00000016a8d5d35c2726a5572bd050aabf8a) | 
| RyzeRouter                  | [`0x5afe00000051a88bb567d084a02c2255d220cef8`](https://arbiscan.io/address/0x5afe00000051a88bb567d084a02c2255d220cef8) | 
| RyzeAllocationRewardToken   | [`0x5afe000000638eec7321233141171200ede7755b`](https://arbiscan.io/address/0x5afe000000638eec7321233141171200ede7755b) | 
| RyzeAllocationToken         | [`0x5afe0000007cfa6075457a183a3277d361314137`](https://arbiscan.io/address/0x5afe0000007cfa6075457a183a3277d361314137) | 
| RyzeRealEstateToken         | [`0x5afe0000004b267f1b25e20abf0e176281b1180b`](https://arbiscan.io/address/0x5afe0000004b267f1b25e20abf0e176281b1180b) | 
| RyzeAllocator               | [`0x5afe000000d0cb81e6ff1315580a559a026ef517`](https://arbiscan.io/address/0x5afe000000d0cb81e6ff1315580a559a026ef517) | 
| RyzeTokenDatabase           | [`0x5afe000000d49c9336389ad723facab8cfcf06a9`](https://arbiscan.io/address/0x5afe000000d49c9336389ad723facab8cfcf06a9) | 
| RyzeTokenConverter          | [`0x5afe0000001b9052a31f94f13dba938bc5d3c33a`](https://arbiscan.io/address/0x5afe0000001b9052a31f94f13dba938bc5d3c33a) | 
| RyzeLiquidityInitializer    | [`0x5afe000000f5b3681da2becbd4b7b2c3990d7b76`](https://arbiscan.io/address/0x5afe000000f5b3681da2becbd4b7b2c3990d7b76) | 
| RyzeWhitelist               | [`0x5afe00000045bb69a080ae5a5df9ae5f8f7a94b1`](https://arbiscan.io/address/0x5afe00000045bb69a080ae5a5df9ae5f8f7a94b1) | 
| EthStablecoinPair           | [`0xdade0b786cc7ef9a908ab700428f0afa9a4a59a0`](https://arbiscan.io/address/0xdade0b786cc7ef9a908ab700428f0afa9a4a59a0) |  

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
