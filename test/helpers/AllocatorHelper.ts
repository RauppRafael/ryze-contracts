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
            permit,
        }: {
            referrer?: string
            signer?: SignerWithAddress
            permit?: Permit.DaiPermitInfoStruct
        } = {},
    ) {
        signer = signer || await Hardhat.mainSigner()
        referrer = referrer || constants.AddressZero

        const contract = this.allocator.connect(signer)

        return permit
            ? await contract.allocateWithDaiPermit(realEstateTokenId, amount, referrer, permit)
            : await contract.allocate(realEstateTokenId, amount, referrer)
    }
}
