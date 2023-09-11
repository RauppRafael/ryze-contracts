import hre from 'hardhat'

export const isContract = async (address: string) => (await hre.ethers.provider.getCode(address)) !== '0x'
