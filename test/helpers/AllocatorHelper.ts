import { Hardhat } from 'hardhat-vanity'
import { Permit } from '../../types/contracts/RyzeAllocator'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { constants } from 'ethers'
import { RyzeAllocator, RyzeTokenDatabase } from '../../types'

export class AllocatorHelper {
    public constructor(
        public readonly allocator: RyzeAllocator,
        public readonly tokenDatabase: RyzeTokenDatabase,
    ) {
    }

    public async getActualAllocationAmount(realEstateTokenId: number, amount: number) {
        const allocated = (await this.allocator.allocationInfos(realEstateTokenId)).totalAllocated
        const maxSupply = await this.tokenDatabase.maxSupply(realEstateTokenId)

        return allocated.add(amount).gte(maxSupply)
            ? maxSupply.sub(allocated).toNumber()
            : amount
    }

    public async allocate(
        realEstateTokenId: number,
        amount: number,
        {
            referrer,
            signer,
            daiPermit,
            erc2612Permit,
        }: {
            referrer?: string
            signer?: SignerWithAddress
            daiPermit?: Permit.DaiPermitInfoStruct
            erc2612Permit?: Permit.ERC2612PermitInfoStruct
        } = {},
    ) {
        signer = signer || await Hardhat.mainSigner()
        referrer = referrer || constants.AddressZero

        const contract = this.allocator.connect(signer)

        if (daiPermit)
            return await contract.allocateWithDaiPermit(realEstateTokenId, amount, referrer, daiPermit)

        if (erc2612Permit)
            return contract.allocateWithErc2612Permit(realEstateTokenId, amount, referrer, erc2612Permit)

        return await contract.allocate(realEstateTokenId, amount, referrer)
    }
}
