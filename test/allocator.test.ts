import { AllocationState } from './helpers/enums'
import { AllocatorHelper } from './helpers/AllocatorHelper'
import { Permit } from '../types/contracts/RyzeAllocator'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestContractDeployer } from './helpers/TestContractDeployer'
import { createToken } from './helpers/create-token'
import { solidity } from 'ethereum-waffle'
import { AllocatorErrors, TokenConverterErrors } from './helpers/Errors'
import { BigNumber, constants, utils } from 'ethers'
import {
    Dai,
    RyzeAllocator,
    RyzeLiquidToken__factory,
    RyzeLiquidityInitializer,
    RyzeRouter,
    RyzeToken,
    RyzeTokenConverter,
    RyzeTokenDatabase,
    RyzeWhitelist,
} from '../types'
import { Permit as PermitHelper, WrappedEther } from '@ryze-blockchain/shared'
import chai, { expect } from 'chai'
import { getChainId, getDeadline } from '../helpers/hardhat'
import hre, { waffle } from 'hardhat'

chai.use(solidity)

const INITIAL_DAI_BALANCE = 100_000_000
const MAX_SUPPLY = 1_000_000
const INITIAL_LIQUIDITY_PERCENTAGE = 1
const REFERRAL_REWARD_PERCENTAGE = 1
const REFERRED_USER_BONUS = 10

const initialLiquidityAllocation = MAX_SUPPLY * INITIAL_LIQUIDITY_PERCENTAGE / 100

function parseUnits(value: number, decimals: number) {
    return utils.parseUnits(value.toString(), decimals)
}

describe('Allocator', () => {
    let deployer: SignerWithAddress,
        user: SignerWithAddress,
        referrer: SignerWithAddress,
        dai: Dai,
        allocationToken: RyzeToken,
        allocationRewardToken: RyzeToken,
        realEstateToken: RyzeToken,
        allocator: RyzeAllocator,
        allocatorHelper: AllocatorHelper,
        router: RyzeRouter,
        liquidityInitializer: RyzeLiquidityInitializer,
        tokenConverter: RyzeTokenConverter,
        tokenDatabase: RyzeTokenDatabase,
        whitelist: RyzeWhitelist,
        weth: WrappedEther,
        stablecoinDecimals: number

    beforeEach(async () => {
        [
            deployer,
            user,
            referrer,
        ] = await hre.ethers.getSigners()

        const contracts = await waffle.loadFixture(TestContractDeployer.deployAll)

        dai = contracts.stablecoin
        allocationToken = contracts.allocationToken
        allocationRewardToken = contracts.allocationRewardToken
        allocator = contracts.allocator
        tokenConverter = contracts.tokenConverter
        tokenDatabase = contracts.tokenDatabase
        realEstateToken = contracts.realEstateToken
        liquidityInitializer = contracts.liquidityInitializer
        allocatorHelper = contracts.allocatorHelper
        router = contracts.router
        whitelist = contracts.whitelist
        weth = contracts.weth
        stablecoinDecimals = await dai.decimals()

        await dai.mint(deployer.address, parseUnits(INITIAL_DAI_BALANCE, 18))
        await whitelist.updateUserWhitelistStatus(user.address, true)
        await whitelist.updateUserWhitelistStatus(referrer.address, true)
    })

    const create = () => createToken(tokenDatabase, MAX_SUPPLY)

    const allocate = async (
        id: number,
        amount: number,
        {
            permit,
            signer = deployer,
        }: {
            permit?: Permit.DaiPermitInfoStruct
            signer?: SignerWithAddress
        } = {},
    ) => {
        const initialDaiBalance = await dai.balanceOf(signer.address)
        const initialAllocation = await allocationToken.balanceOf(signer.address, id)

        const actualAmount = await allocatorHelper.getActualAllocationAmount(id, amount)

        expect(await allocatorHelper.allocate(id, amount, { daiPermit: permit, signer }))
            .to.emit(allocationToken, 'TransferSingle')

        expect(await dai.balanceOf(signer.address))
            .to.equal(initialDaiBalance.sub(parseUnits(actualAmount, stablecoinDecimals)))

        expect(await allocationToken.balanceOf(signer.address, id))
            .to.equal(initialAllocation.add(actualAmount))
    }

    it('Can\'t allocate token before creation', async () => {
        await expect(allocator.allocate(0, 1000, hre.ethers.constants.AddressZero))
            .to.be.revertedWith(AllocatorErrors.InvalidToken)

        await expect(allocator.allocate(1, 1000, hre.ethers.constants.AddressZero))
            .to.be.revertedWith(AllocatorErrors.InvalidToken)
    })

    it('Creates NFT', async () => {
        await create()
        await create()
    })

    it('Returns valid token URIs', async () => {
        const uri = 'https://api.ryze.land/metadata/real-estate/{id}.json'

        const ids = [0, 150, 593, 183567, 18035760]

        for (const id of ids) {
            expect(await realEstateToken.uri(id))
                .to.equal(uri)
        }
    })

    describe('Allocation minting with stablecoins', () => {
        const wantAmount = MAX_SUPPLY / 10

        beforeEach(create)

        it('Collects stablecoins', async () => {
            const initialDeployerBalance = await dai.balanceOf(deployer.address)
            const initialContractBalance = await dai.balanceOf(allocator.address)

            await allocator.allocate(0, 1_000, hre.ethers.constants.AddressZero)

            const parsedAmount = parseUnits(1_000, stablecoinDecimals)

            expect(await dai.balanceOf(deployer.address))
                .to.equal(initialDeployerBalance.sub(parsedAmount))
            expect(await dai.balanceOf(allocator.address))
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

            const initialDaiBalance = await dai.balanceOf(deployer.address)

            await expect(allocatorHelper.allocate(0, wantAmount))
                .to.be.revertedWith(AllocatorErrors.InvalidAllocationState)
                .withArgs(AllocationState.PRE_SALE, AllocationState.PENDING)

            expect(await dai.balanceOf(deployer.address))
                .to.equal(initialDaiBalance)

            expect(await allocationToken.balanceOf(deployer.address, 0))
                .to.equal(MAX_SUPPLY - initialLiquidityAllocation)
        })

        it('Mints allocation token using DAI permit', async () => {
            for (let index = 0; index < 10; index++) {
                await dai.approve(allocator.address, 0)

                await allocate(
                    0,
                    wantAmount,
                    {
                        permit: await PermitHelper.Dai(
                            await getChainId(),
                            deployer,
                            dai.address,
                            allocator.address,
                        ),
                    },
                )
            }

            expect(await allocationToken.balanceOf(deployer.address, 0))
                .to.equal(MAX_SUPPLY - initialLiquidityAllocation)
        })

        it('Has royalty info', async () => {
            for (let index = 0; index < 10; index++)
                await allocate(0, wantAmount)

            const salePrice = parseUnits(1, stablecoinDecimals)
            const royaltyInfo = await allocationToken.royaltyInfo(0, salePrice)

            expect(royaltyInfo[0]).to.equal(deployer.address)
            expect(royaltyInfo[1]).to.equal(salePrice.mul(100).div(10_000))
        })
    })

    describe('Allocation minting with ETH', () => {
        const tokenId = 0
        const ethPrice = 2_000

        function getOutputAmount(ethInput: BigNumber) {
            return router.getAmountsOut(ethInput, [weth.address, dai.address])
        }

        beforeEach(async () => {
            await create()

            const daiLiquidity = parseUnits(10_000_000, stablecoinDecimals)
            const ethLiquidity = daiLiquidity.div(ethPrice)

            await dai.approve(router.address, constants.MaxUint256)

            await router.addLiquidityETH(
                dai.address,
                daiLiquidity,
                daiLiquidity,
                ethLiquidity,
                deployer.address,
                await getDeadline(),
                { value: ethLiquidity },
            )
        })

        it('Mints allocation token using ETH', async () => {
            const desiredAllocation = 500_000
            const ethInput = parseUnits(desiredAllocation, stablecoinDecimals).div(ethPrice) // aprox. 500_000 shares
            const expectedOutputs = await getOutputAmount(ethInput)
            const minAllocation = expectedOutputs[expectedOutputs.length - 1]
            const transaction = await allocator.allocateWithEth(
                tokenId,
                minAllocation.sub(minAllocation.div(100)), // -1% slippage
                constants.AddressZero,
                { value: ethInput },
            )

            expect(transaction).to.emit(allocationToken, 'TransferSingle')

            const allocatedAmount = await allocationToken.balanceOf(deployer.address, tokenId)

            expect(allocatedAmount).to.gte(minAllocation.div(parseUnits(1, stablecoinDecimals)))
            expect(allocatedAmount).to.gte(desiredAllocation - desiredAllocation * 10 / 100) // -10%
        })

        it('Mints final allocation with ETH', async () => {
            const userAmount = 900_000

            // First a user mints 900_000 tokens out of 1_000_000 using DAI
            await dai.mint(user.address, parseUnits(userAmount, stablecoinDecimals))
            await dai.connect(user).approve(allocator.address, parseUnits(userAmount, stablecoinDecimals))
            await allocate(0, userAmount, { signer: user })

            // Then someone tries to mint another 500_000 but with ETH
            const initialEthBalance = await deployer.getBalance()
            const desiredAllocation = 500_000
            const ethInput = parseUnits(desiredAllocation, stablecoinDecimals).div(ethPrice) // aprox. 500_000 shares
            const expectedOutputs = await getOutputAmount(ethInput)
            const minAllocation = expectedOutputs[expectedOutputs.length - 1]
            const allocateTransaction = await allocator.allocateWithEth(
                tokenId,
                minAllocation.sub(minAllocation.div(100)), // -1% slippage
                constants.AddressZero,
                { value: ethInput },
            )

            // Calculate gas used
            const txReceipt = await allocateTransaction.wait()
            const gasUsed = txReceipt.gasUsed
            const gasPrice = allocateTransaction.gasPrice

            if (!gasPrice)
                throw new Error('Missing gas price')

            const ethUsedAsGas = gasUsed.mul(gasPrice)
            const balanceAfter = await deployer.getBalance()
            const expectedAllocationAmount = MAX_SUPPLY - userAmount - initialLiquidityAllocation
            const expectedEthSpentAsPayment = parseUnits(expectedAllocationAmount, stablecoinDecimals).div(ethPrice)
            const ethSpentAsPayment = initialEthBalance.sub(balanceAfter).sub(ethUsedAsGas)

            const allocatedAmount = await allocationToken.balanceOf(deployer.address, tokenId)

            expect(allocateTransaction)
                .to.emit(allocationToken, 'TransferSingle')
            expect(allocatedAmount)
                .to.equal(expectedAllocationAmount)
            expect(ethSpentAsPayment)
                .to.lte(expectedEthSpentAsPayment.add(expectedEthSpentAsPayment.mul(2).div(100))) // 2% price impact
        })
    })

    it('Cannot claim before allocation period is over', async () => {
        await create()

        await allocate(0, MAX_SUPPLY / 2)

        await expect(tokenConverter.convertAllocationToRealEstateErc1155(0))
            .to.be.revertedWith(TokenConverterErrors.TokenNotEnabled)
    })

    describe('Allocation claiming', () => {
        const expectedBalance = MAX_SUPPLY - initialLiquidityAllocation

        beforeEach(async () => {
            await create()

            await allocate(0, MAX_SUPPLY / 2)

            await allocate(0, MAX_SUPPLY / 2)

            await liquidityInitializer.claimAndAddLiquidity(0, 10_000)
        })

        it('Claims Real Estate Token', async () => {
            await tokenConverter.convertAllocationToRealEstateErc1155(0)

            expect(await realEstateToken.balanceOf(deployer.address, 0))
                .to.equal(expectedBalance)

            await expect(tokenConverter.convertAllocationToRealEstateErc1155(0))
                .to.be.revertedWith(TokenConverterErrors.InsufficientBalance)

            expect(await realEstateToken.balanceOf(deployer.address, 0))
                .to.equal(expectedBalance)
        })

        it('Claims Real Estate ERC20 Token', async () => {
            const liquidToken = RyzeLiquidToken__factory.connect(
                await tokenConverter.getLiquidToken(0),
                hre.ethers.provider,
            )

            await tokenConverter.convertAllocationToRealEstateErc20(0)

            expect(await liquidToken.balanceOf(deployer.address))
                .to.equal(parseUnits(expectedBalance, 18))

            await expect(tokenConverter.convertAllocationToRealEstateErc20(0))
                .to.be.revertedWith(TokenConverterErrors.InsufficientBalance)

            expect(await liquidToken.balanceOf(deployer.address))
                .to.equal(parseUnits(expectedBalance, 18))
        })
    })

    describe('Governance', () => {
        const tokenId = 0

        beforeEach(create)

        it('Doesn\'t allow enabling tokens without full fund', async () => {
            await allocate(tokenId, 800_000)

            await expect(liquidityInitializer.claimAndAddLiquidity(tokenId, 10_000))
                .to.be.revertedWith(AllocatorErrors.InvalidAllocationState)
                .withArgs(AllocationState.PENDING, AllocationState.PRE_SALE)
        })

        it('Claims dai', async () => {
            const amount = MAX_SUPPLY / 2
            const amountEth = parseUnits(amount, stablecoinDecimals)
            const initialBalance = await dai.balanceOf(deployer.address)

            await dai.mint(user.address, parseUnits(MAX_SUPPLY, stablecoinDecimals))
            await dai.connect(user).approve(allocator.address, parseUnits(MAX_SUPPLY, stablecoinDecimals))
            await allocatorHelper.allocate(tokenId, amount, { signer: user })
            await allocator.claimStablecoins()

            expect(await dai.balanceOf(deployer.address))
                .to.equal(initialBalance.add(amountEth))

            await allocatorHelper.allocate(tokenId, amount, { signer: user })
            await allocator.claimStablecoins()

            const allocatedAmount = MAX_SUPPLY - initialLiquidityAllocation

            expect(await dai.balanceOf(deployer.address))
                .to.equal(initialBalance.add(parseUnits(allocatedAmount, stablecoinDecimals)))

            expect(allocatedAmount)
                .to.equal(await allocationToken.balanceOf(user.address, tokenId))
        })
    })

    describe('Referrals', () => {
        let referrer: SignerWithAddress

        beforeEach(async () => {
            await create()

            referrer = (await hre.ethers.getSigners())[1]
        })

        it('Allocates', async () => {
            const amount = MAX_SUPPLY / 2

            const initialDaiBalance = await dai.balanceOf(deployer.address)
            const expectedReferralAmount = amount * REFERRAL_REWARD_PERCENTAGE / 100

            expect(await allocator.allocate(0, amount, referrer.address))
                .to.emit(allocationToken, 'TransferSingle')

            expect(await dai.balanceOf(deployer.address))
                .to.equal(initialDaiBalance.sub(parseUnits(amount, stablecoinDecimals)))

            expect(await allocationRewardToken.balanceOf(referrer.address, 0))
                .to.equal(expectedReferralAmount)
        })

        it('Mints referral rewards', async () => {
            const amount = MAX_SUPPLY / 10

            for (let i = 0; i < 10; i++)
                await allocator.allocate(0, amount, referrer.address)

            const expectedReferralAllocation = amount * 9 * REFERRAL_REWARD_PERCENTAGE / 100

            expect(await allocationRewardToken.balanceOf(referrer.address, 0))
                .to.equal(expectedReferralAllocation)

            const initialOwnerBalance = await dai.balanceOf(deployer.address)

            await allocator.claimStablecoins()

            const daiClaimed = (await dai.balanceOf(deployer.address))
                .sub(initialOwnerBalance)
                .div(parseUnits(1, stablecoinDecimals))
                .toNumber()
            const bonuses = initialLiquidityAllocation +
                expectedReferralAllocation +
                REFERRED_USER_BONUS

            expect(MAX_SUPPLY - daiClaimed).to.equal(bonuses)

            await liquidityInitializer.claimAndAddLiquidity(0, 10000)

            await tokenConverter.connect(referrer).convertAllocationRewardToRealEstateErc20(0)

            expect(await allocationRewardToken.balanceOf(referrer.address, 0)).equal(0)

            expect((await tokenConverter.vestingBalances(referrer.address, 0)).totalAmount)
                .to.equal(expectedReferralAllocation)
        })
    })

    describe('Allocation burning', () => {
        const tokenId = 0
        const amount = 100_000

        beforeEach(async () => {
            await dai.mint(user.address, parseUnits(amount, stablecoinDecimals))
            await dai.connect(user).approve(allocator.address, parseUnits(amount, stablecoinDecimals))
            await allocationToken.connect(user).setApprovalForAll(allocator.address, true)
            await allocationToken.connect(referrer).setApprovalForAll(allocator.address, true)
            await allocationRewardToken.connect(referrer).setApprovalForAll(allocator.address, true)

            await create()

            await allocatorHelper.allocate(
                tokenId,
                amount,
                { signer: user, referrer: referrer.address },
            )
        })

        async function burnAllocation(value: number) {
            await allocator.disableToken(tokenId, parseUnits(value, stablecoinDecimals))

            const initialBalanceDai = await dai.balanceOf(user.address)

            await allocator.connect(user).burnAllocation(0)

            expect(await dai.balanceOf(user.address))
                .to.equal(initialBalanceDai.add(parseUnits(amount, stablecoinDecimals).mul(value * 100).div(100)))
        }

        it('Burns allocations 1:1.1', async () => {
            await expect(burnAllocation(1.1)).to.be.revertedWith('Dai/insufficient-balance')
        })
        it('Burns allocations 1:1.1', async () => {
            await dai.mint(allocator.address, parseUnits(100_000, stablecoinDecimals))
            await burnAllocation(1.01)
        })
        it('Burns allocations 1:1', () => burnAllocation(1))
        it('Burns allocations 1:1', () => burnAllocation(0.95))
        it('Burns allocations 1:0.9', () => burnAllocation(0.9))

        it('Cannot burn rewarded allocation', async () => {
            await allocator.disableToken(tokenId, parseUnits(.9, stablecoinDecimals))

            await expect(allocator.connect(referrer).burnAllocation(0))
                .to.be.revertedWith(AllocatorErrors.InsufficientBalance)
        })
    })
})
