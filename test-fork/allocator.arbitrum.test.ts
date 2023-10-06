import { Permit as PermitHelper } from '@ryze-blockchain/shared/dist/src/Permit'
import { getChainId } from '../helpers/hardhat'
import { AllocatorHelper } from '../test/helpers/AllocatorHelper'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { createToken } from '../test/helpers/create-token'
import { AllocationState } from '../test/helpers/enums'
import { AllocatorErrors } from '../test/helpers/Errors'
import { TestContractDeployer } from '../test/helpers/TestContractDeployer'
import { solidity } from 'ethereum-waffle'
import { utils } from 'ethers'
import {
    RyzeAllocator,
    RyzeLiquidToken,
    RyzeLiquidToken__factory,
    RyzeToken,
    RyzeTokenDatabase,
    RyzeWhitelist,
} from '../types'
import chai, { expect } from 'chai'
import hre, { waffle } from 'hardhat'
import { Permit } from '../types/contracts/RyzeAllocator'

if (process.env.HARDHAT_CHAIN !== 'ARBITRUM')
    throw new Error('Fork test can only run on Arbitrum')

chai.use(solidity)

const INITIAL_DAI_BALANCE = 100_000_000
const MAX_SUPPLY = 1_000_000
const INITIAL_LIQUIDITY_PERCENTAGE = 1

const initialLiquidityAllocation = MAX_SUPPLY * INITIAL_LIQUIDITY_PERCENTAGE / 100

function parseUnits(value: number, decimals: number) {
    return utils.parseUnits(value.toString(), decimals)
}

describe('Allocator', () => {
    let deployer: SignerWithAddress,
        user: SignerWithAddress,
        referrer: SignerWithAddress,
        stablecoin: RyzeLiquidToken,
        allocationToken: RyzeToken,
        allocator: RyzeAllocator,
        allocatorHelper: AllocatorHelper,
        tokenDatabase: RyzeTokenDatabase,
        whitelist: RyzeWhitelist,
        stablecoinDecimals: number

    const allocate = async (
        id: number,
        amount: number,
        {
            permit,
            signer = deployer,
        }: {
            permit?: Permit.ERC2612PermitInfoStruct
            signer?: SignerWithAddress
        } = {},
    ) => {
        const initialDaiBalance = await stablecoin.balanceOf(signer.address)
        const initialAllocation = await allocationToken.balanceOf(signer.address, id)

        const actualAmount = await allocatorHelper.getActualAllocationAmount(id, amount)

        expect(await allocatorHelper.allocate(id, amount, { erc2612Permit: permit, signer }))
            .to.emit(allocationToken, 'TransferSingle')

        expect(await stablecoin.balanceOf(signer.address))
            .to.equal(initialDaiBalance.sub(parseUnits(actualAmount, stablecoinDecimals)))

        expect(await allocationToken.balanceOf(signer.address, id))
            .to.equal(initialAllocation.add(actualAmount))
    }

    beforeEach(async () => {
        [
            deployer,
            user,
            referrer,
        ] = await hre.ethers.getSigners()

        const contracts = await waffle.loadFixture(TestContractDeployer.deployAll)

        stablecoin = RyzeLiquidToken__factory.connect(contracts.stablecoin.address, deployer)
        allocationToken = contracts.allocationToken
        allocator = contracts.allocator
        tokenDatabase = contracts.tokenDatabase
        allocatorHelper = contracts.allocatorHelper
        whitelist = contracts.whitelist
        stablecoinDecimals = await stablecoin.decimals()

        const stableMinter = await hre.ethers.getImpersonatedSigner(await stablecoin.owner())
        await hre.network.provider.send('hardhat_setBalance', [
            stableMinter.address,
            '0xfffffffffffffffffffffffffffffff',
        ])

        await stablecoin.connect(stableMinter).mint(deployer.address, parseUnits(INITIAL_DAI_BALANCE, 18))
        await whitelist.updateUserWhitelistStatus(user.address, true)
        await whitelist.updateUserWhitelistStatus(referrer.address, true)
    })

    describe('Allocation minting with stablecoins', () => {
        const wantAmount = MAX_SUPPLY / 10

        beforeEach(() => createToken(tokenDatabase, MAX_SUPPLY))

        it('Collects stablecoins', async () => {
            const initialDeployerBalance = await stablecoin.balanceOf(deployer.address)
            const initialContractBalance = await stablecoin.balanceOf(allocator.address)

            await allocator.allocate(0, 1_000, hre.ethers.constants.AddressZero)

            const parsedAmount = parseUnits(1_000, stablecoinDecimals)

            expect(await stablecoin.balanceOf(deployer.address))
                .to.equal(initialDeployerBalance.sub(parsedAmount))
            expect(await stablecoin.balanceOf(allocator.address))
                .to.equal(initialContractBalance.add(parsedAmount))
        })

        it('Allocates the exact max supply', async () => {
            await allocator.allocate(0, 1, hre.ethers.constants.AddressZero)

            await allocator.allocate(
                0,
                MAX_SUPPLY - Number((await allocator.allocationInfos(0)).totalAllocated),
                hre.ethers.constants.AddressZero,
            )

            const allocationInfo = await allocator.allocationInfos(0)

            expect(allocationInfo.totalAllocated).to.equal(MAX_SUPPLY)
            expect(allocationInfo.allocationState).to.equal(AllocationState.PENDING)
        })

        it('Mints allocation tokens', async () => {
            for (let index = 0; index < 10; index++)
                await allocate(0, wantAmount)

            expect(await allocationToken.balanceOf(deployer.address, 0))
                .to.equal(MAX_SUPPLY - initialLiquidityAllocation)
        })

        it('Reverts when allocation period is over', async () => {
            for (let index = 0; index < 10; index++)
                await allocate(0, wantAmount)

            const initialDaiBalance = await stablecoin.balanceOf(deployer.address)

            await expect(allocatorHelper.allocate(0, wantAmount))
                .to.be.revertedWith(AllocatorErrors.InvalidAllocationState)
                .withArgs(AllocationState.PRE_SALE, AllocationState.PENDING)

            expect(await stablecoin.balanceOf(deployer.address))
                .to.equal(initialDaiBalance)

            expect(await allocationToken.balanceOf(deployer.address, 0))
                .to.equal(MAX_SUPPLY - initialLiquidityAllocation)
        })

        it('Mints allocation token using DAI permit', async () => {
            for (let index = 0; index < 10; index++) {
                await stablecoin.approve(allocator.address, 0)

                await allocate(
                    0,
                    wantAmount,
                    {
                        permit: await PermitHelper.ERC2612(
                            await getChainId(),
                            deployer,
                            stablecoin.address,
                            allocator.address,
                        ),
                    },
                )
            }

            expect(await allocationToken.balanceOf(deployer.address, 0))
                .to.equal(MAX_SUPPLY - initialLiquidityAllocation)
        })
    })
})
