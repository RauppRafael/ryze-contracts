import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'hardhat-abi-exporter'
import 'solidity-coverage'
import 'solidity-docgen'

import { config } from 'dotenv'

config()

import { chain, explorerKey, network, rpcs } from './helpers/chain.info'

const accounts = process.env.DEPLOYER_PRIVATE_KEY
    ? [process.env.DEPLOYER_PRIVATE_KEY]
    : undefined
const fork = process.env.HARDHAT_FORK === 'true'

interface IHardhatConfig {
    version?: string,
    compilers?: string[],
}

const getVersionBase = (version: string) => ({
    version,
    settings: {
        optimizer: {
            enabled: true,
            runs: 800,
        },
    },
})

const getNetworkBase = ({
    url,
    chainId,
}: {
    url: string | undefined,
    chainId: number | undefined
}) => ({
    url: url || '',
    chainId,
    accounts,
    gasMultiplier: 2,
    // gasPrice: 3000000000, // Enable this line for POLYGON
})

function hardhatConfig({ version, compilers }: IHardhatConfig) {
    let solidity

    if (version)
        solidity = getVersionBase(version)

    if (compilers)
        solidity = { compilers: compilers.map(getVersionBase) }

    return {
        solidity: solidity || undefined,
        paths: {
            tests: fork ? './test-fork' : './test',
        },
        networks: {
            hardhat: fork
                ? { forking: { url: rpcs.mainnet[chain].url } }
                : {},
            [network]: getNetworkBase({
                url: rpcs.testnet[chain].url,
                chainId: rpcs.testnet[chain].chainId,
            }),
        },
        etherscan: {
            apiKey: explorerKey,
        },
        gasReporter: {
            currency: 'USD',
            gasPrice: 15,
            coinmarketcap: '52b131c7-623e-45de-89ee-83c113b311dc',
        },
        abiExporter: {
            runOnCompile: true,
            clear: true,
            flat: true,
            only: [
                'Ryze',
                'WrappedEther',
                'Dai',
                'LiquidToken',
                'Disperse',
                'RewardDistributor',
            ],
            except: [
                'IRyze',
                'Test_',
            ],
            spacing: 4,
        },
        typechain: {
            outDir: 'types',
            target: 'ethers-v5',
        },
        docgen: {
            pages: 'files',
            exclude: [
                'deploy',
                'test',
                'interfaces',
                'dex/interfaces',
            ],
        },
    }
}

module.exports = hardhatConfig({
    compilers: [
        '0.5.12', // Required for Dai
        '0.5.17', // Required for WETH
        '0.8.19',
    ],
})
