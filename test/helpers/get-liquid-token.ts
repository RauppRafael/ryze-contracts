import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import hre from 'hardhat'
import { RyzeLiquidToken__factory, RyzeTokenConverter } from '../../types'

export const getLiquidToken = async (
    tokenConverter: RyzeTokenConverter,
    tokenId: number,
    signer?: SignerWithAddress,
) => RyzeLiquidToken__factory.connect(
    await tokenConverter.getLiquidToken(tokenId),
    signer || hre.ethers.provider,
)
