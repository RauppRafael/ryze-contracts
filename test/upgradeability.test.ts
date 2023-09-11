import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import hre, { upgrades } from 'hardhat'

describe('Upgradeability', () => {
    let deployer: SignerWithAddress

    async function deployProxy(contract: string) {
        return upgrades.deployProxy(
            await hre.ethers.getContractFactory(contract, deployer),
            [],
            { initializer: false },
        )
    }

    async function deployNonProxy(contract: string, expectedMessage: string) {
        try {
            await deployProxy(contract)
        }
        catch (e){
            const message = (e as Error).message

            expect(message).to.include(expectedMessage)
        }
    }

    beforeEach(async () => {
        deployer = (await hre.ethers.getSigners())[0]
    })

    describe('Shouldn\'t upgrade', () => {
        it('Factory', () => deployNonProxy('RyzeFactory', 'is not upgrade safe'))
        it('Router', () => deployNonProxy('RyzeRouter', 'is not upgrade safe'))
        it('LiquidToken',  () => deployNonProxy('RyzeLiquidToken', 'types/values length mismatch'))
    })

    describe('Should upgrade', () => {
        it('Allocator', async () => await deployProxy('RyzeAllocator'))
        it('LiquidityInitializer', async () => await deployProxy('RyzeLiquidityInitializer'))
        it('Staking', async () => await deployProxy('RyzeStaking'))
        it('Token', async () => await deployProxy('RyzeToken'))
        it('TokenConverter', async () => await deployProxy('RyzeTokenConverter'))
        it('TokenDatabase', async () => await deployProxy('RyzeTokenDatabase'))
        it('Whitelist', async () => await deployProxy('RyzeWhitelist'))
    })
})
