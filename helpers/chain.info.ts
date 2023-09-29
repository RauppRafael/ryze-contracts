import explorerKeys from  '../.explorer-keys.json'

type IRpcMap = {
    [n in Network]: {
        [c in Chain]: {
            url: string,
            chainId: number,
        }
    }
}

export const TESTNET = 'testnet'
export const MAINNET = 'mainnet'

export const AVALANCHE = 'AVALANCHE'
export const POLYGON = 'POLYGON'
export const ETHEREUM = 'ETHEREUM'
export const ARBITRUM = 'ARBITRUM'

export type Network = typeof TESTNET | typeof MAINNET
export type Chain = typeof AVALANCHE | typeof POLYGON | typeof ETHEREUM | typeof ARBITRUM

export const network: Network = process.env.HARDHAT_NETWORK as Network
export const chain: Chain = process.env.HARDHAT_CHAIN as Chain

const networks = [TESTNET, MAINNET]
const chains = [AVALANCHE, POLYGON, ETHEREUM, ARBITRUM]

export const explorerKey = explorerKeys[chain]

if (!explorerKey)
    throw new Error('Explorer key not specified')

if (!networks.includes(network))
    throw new Error('Unsupported network')

if (!chains.includes(chain))
    throw new Error('Unsupported chain')

export const rpcs: IRpcMap = {
    mainnet: {
        AVALANCHE: {
            url: 'https://api.avax-test.network/ext/bc/C/rpc',
            chainId: 43113,
        },
        POLYGON: {
            url: 'https://polygon-mumbai.g.alchemy.com/v2/j1fnCMVcSRSqnQhQYs2lMVyEkV5H0snv',
            chainId: 80001,
        },
        ETHEREUM: {
            url: 'https://rpc.ankr.com/eth_goerli',
            chainId: 5,
        },
        ARBITRUM: {
            url: 'https://arb1.arbitrum.io/rpc',
            chainId: 42161,
        },
    },
    testnet: {
        AVALANCHE: {
            url: 'https://api.avax-test.network/ext/bc/C/rpc',
            chainId: 43113,
        },
        POLYGON: {
            url: 'https://polygon-mumbai.g.alchemy.com/v2/j1fnCMVcSRSqnQhQYs2lMVyEkV5H0snv',
            chainId: 80001,
        },
        ETHEREUM: {
            url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
            chainId: 5,
        },
        ARBITRUM: {
            url: 'https://goerli-rollup.arbitrum.io/rpc',
            chainId: 421613,
        },
    },
}
