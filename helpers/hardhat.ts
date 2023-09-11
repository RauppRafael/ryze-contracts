import hre from 'hardhat'

export const getChainId = async () => (await hre.ethers.provider.getNetwork()).chainId

export const getBlock = () => hre.ethers.provider.getBlock('latest')

export const getDeadline = async () => (await getBlock()).timestamp + 10000

export const sendTransaction = async (tx, wait = 1) => {
    tx = await tx

    const network = process?.env?.HARDHAT_NETWORK

    if (network !== 'hardhat' && network !== 'localhost')
        await tx.wait(wait)

    return tx
}
