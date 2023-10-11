import { time } from '@nomicfoundation/hardhat-network-helpers'
import { AllocatorHelper } from './helpers/AllocatorHelper'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestContractDeployer } from './helpers/TestContractDeployer'
import { createToken } from './helpers/create-token'
import { getLiquidToken } from './helpers/get-liquid-token'
import { solidity } from 'ethereum-waffle'
import {
    Dai,
    RyzeLiquidityInitializer,
    RyzeLiquidToken,
    RyzeToken,
    RyzeTokenConverter,
    RyzeTokenDatabase,
    RyzeWhitelist,
} from '../types'
import chai, { expect } from 'chai'
import hre, { waffle } from 'hardhat'

chai.use(solidity)

const parseEther = (amount: number) => hre.ethers.utils.parseEther(amount.toString())

const INITIAL_DAI_BALANCE = 100_000_000
const MAX_SUPPLY = 1_000_000
const INITIAL_LIQUIDITY_PERCENTAGE = 1
const TOKEN_ID = 0

describe('TokenConverter', () => {
    let deployer: SignerWithAddress,
        realEstateToken: RyzeToken,
        dai: Dai,
        tokenConverter: RyzeTokenConverter,
        liquidityInitializer: RyzeLiquidityInitializer,
        tokenDatabase: RyzeTokenDatabase,
        allocationRewardToken: RyzeToken,
        allocatorHelper: AllocatorHelper,
        whitelist: RyzeWhitelist

    beforeEach(async () => {
        const signers = await hre.ethers.getSigners()

        deployer = signers[0]

        const contracts = await waffle.loadFixture(TestContractDeployer.deployAll)

        dai = contracts.stablecoin
        tokenConverter = contracts.tokenConverter
        realEstateToken = contracts.realEstateToken
        liquidityInitializer = contracts.liquidityInitializer
        allocatorHelper = contracts.allocatorHelper
        tokenDatabase = contracts.tokenDatabase
        allocationRewardToken = contracts.allocationRewardToken
        whitelist = contracts.whitelist

        await dai.mint(deployer.address, parseEther(INITIAL_DAI_BALANCE))
    })

    async function toLiquid(tokenId: number, amount: number) {
        const liquidToken = await getLiquidToken(tokenConverter, tokenId)
        const initialBalanceErc20 = await liquidToken.balanceOf(deployer.address)
        const initialBalanceErc1155 = await realEstateToken.balanceOf(deployer.address, tokenId)

        await tokenConverter.convertRealEstateFromErc1155ToErc20(tokenId, amount)

        expect(await liquidToken.balanceOf(deployer.address))
            .to.equal(initialBalanceErc20.add(parseEther(amount)))

        expect(await realEstateToken.balanceOf(deployer.address, tokenId))
            .to.equal(initialBalanceErc1155.sub(amount))
    }

    async function toNft(tokenId: number, amount: number) {
        const liquidToken = await getLiquidToken(tokenConverter, tokenId)
        const initialBalanceErc20 = await liquidToken.balanceOf(deployer.address)
        const initialBalanceErc1155 = await realEstateToken.balanceOf(deployer.address, tokenId)

        await tokenConverter.convertRealEstateFromErc20ToErc1155(tokenId, amount)

        expect(await liquidToken.balanceOf(deployer.address))
            .to.equal(initialBalanceErc20.sub(parseEther(amount)))

        expect(await realEstateToken.balanceOf(deployer.address, tokenId))
            .to.equal(initialBalanceErc1155.add(amount))
    }

    it('Converts NFTs to Liquid tokens', async () => {
        const amount = (MAX_SUPPLY - (MAX_SUPPLY / 100)) / 2

        await createToken(tokenDatabase, MAX_SUPPLY)
        await allocatorHelper.allocate(TOKEN_ID, MAX_SUPPLY)
        await liquidityInitializer.claimAndAddLiquidity(TOKEN_ID, 10_000)
        await tokenConverter.convertAllocationToRealEstateErc1155(TOKEN_ID)

        await toLiquid(TOKEN_ID, amount)

        await toLiquid(TOKEN_ID, amount - MAX_SUPPLY * INITIAL_LIQUIDITY_PERCENTAGE / 100)

        await expect(toLiquid(TOKEN_ID, amount))
            .to.be.revertedWith('ERC1155: burn amount exceeds balance')
    })

    it('Converts Liquid Tokens back to NFTs', async () => {
        await createToken(tokenDatabase, MAX_SUPPLY)
        await allocatorHelper.allocate(TOKEN_ID, MAX_SUPPLY)
        await liquidityInitializer.claimAndAddLiquidity(TOKEN_ID, 10_000)
        await tokenConverter.convertAllocationToRealEstateErc1155(TOKEN_ID)

        await toLiquid(TOKEN_ID, 100_000)

        await toNft(TOKEN_ID, 50_000)
        await toNft(TOKEN_ID, 50_000)

        await expect(toNft(TOKEN_ID, 50_000))
            .to.be.revertedWith('ERC20: burn amount exceeds balance')
    })

    describe('Reward conversion', () => {
        const allocationRewardPercentage = 0.01 // 1%
        const oneDay = 60 * 60 * 24
        let liquidToken: RyzeLiquidToken
        let referrer1: SignerWithAddress
        let referrer2: SignerWithAddress
        let referrer3: SignerWithAddress
        let percentage1 = 0.2
        let percentage2 = 0.3
        let percentage3 = 0.4
        let amount1 = percentage1 * MAX_SUPPLY * allocationRewardPercentage
        let amount2 = percentage2 * MAX_SUPPLY * allocationRewardPercentage
        let amount3 = percentage3 * MAX_SUPPLY * allocationRewardPercentage

        function allocateWithReferral(referrer: SignerWithAddress, percentage: number) {
            return allocatorHelper.allocate(
                TOKEN_ID,
                MAX_SUPPLY * percentage,
                { referrer: referrer.address },
            )
        }

        beforeEach(async () => {
            [deployer, referrer1, referrer2, referrer3] = await hre.ethers.getSigners()

            await whitelist.updateUserWhitelistStatus(referrer1.address, true)
            await whitelist.updateUserWhitelistStatus(referrer2.address, true)
            await whitelist.updateUserWhitelistStatus(referrer3.address, true)

            await createToken(tokenDatabase, MAX_SUPPLY)
            await allocateWithReferral(referrer1, percentage1)
            await allocateWithReferral(referrer2, percentage2)
            await allocateWithReferral(referrer3, percentage3)
            await allocateWithReferral(referrer3, 1)
            await liquidityInitializer.claimAndAddLiquidity(TOKEN_ID, 10_000)
            await tokenConverter.convertAllocationToRealEstateErc1155(TOKEN_ID)

            liquidToken = await getLiquidToken(tokenConverter, TOKEN_ID)
        })

        it('Claims full referral rewards', async () => {
            expect(await allocationRewardToken.balanceOf(referrer1.address, TOKEN_ID))
                .to.equal(amount1)
            expect(await allocationRewardToken.balanceOf(referrer2.address, TOKEN_ID))
                .to.equal(amount2)
            expect(await allocationRewardToken.balanceOf(referrer3.address, TOKEN_ID))
                .to.equal(amount3)

            await tokenConverter
                .connect(referrer1)
                .convertAllocationRewardToRealEstateErc20(TOKEN_ID)
            await tokenConverter
                .connect(referrer2)
                .convertAllocationRewardToRealEstateErc20(TOKEN_ID)
            await tokenConverter
                .connect(referrer3)
                .convertAllocationRewardToRealEstateErc20(TOKEN_ID)

            expect(await allocationRewardToken.balanceOf(referrer1.address, TOKEN_ID)).to.equal(0)
            expect(await allocationRewardToken.balanceOf(referrer2.address, TOKEN_ID)).to.equal(0)
            expect(await allocationRewardToken.balanceOf(referrer3.address, TOKEN_ID)).to.equal(0)

            expect(await liquidToken.balanceOf(referrer1.address)).to.equal(0)
            expect(await liquidToken.balanceOf(referrer2.address)).to.equal(0)
            expect(await liquidToken.balanceOf(referrer3.address)).to.equal(0)

            expect((await tokenConverter.vestingBalances(referrer1.address, TOKEN_ID)).totalAmount)
                .to.equal(amount1)
            expect((await tokenConverter.vestingBalances(referrer2.address, TOKEN_ID)).totalAmount)
                .to.equal(amount2)
            expect((await tokenConverter.vestingBalances(referrer3.address, TOKEN_ID)).totalAmount)
                .to.equal(amount3)

            async function increaseTimeAndMakeChecks(
                timeIncrease: number,
                amountCallback: (amount: number) => number,
            ) {
                await time.increase(timeIncrease)

                await tokenConverter
                    .connect(referrer1)
                    .convertAllocationRewardToRealEstateErc20(TOKEN_ID)
                await tokenConverter
                    .connect(referrer2)
                    .convertAllocationRewardToRealEstateErc20(TOKEN_ID)
                await tokenConverter
                    .connect(referrer3)
                    .convertAllocationRewardToRealEstateErc20(TOKEN_ID)

                expect(await liquidToken.balanceOf(referrer1.address))
                    .to.equal(parseEther(amountCallback(amount1)))
                expect(await liquidToken.balanceOf(referrer2.address))
                    .to.equal(parseEther(amountCallback(amount2)))
                expect(await liquidToken.balanceOf(referrer3.address))
                    .to.equal(parseEther(amountCallback(amount3)))

                expect(await tokenConverter.vestedAmount(referrer1.address, TOKEN_ID))
                    .to.equal(amountCallback(amount1))
                expect(await tokenConverter.vestedAmount(referrer2.address, TOKEN_ID))
                    .to.equal(amountCallback(amount2))
                expect(await tokenConverter.vestedAmount(referrer3.address, TOKEN_ID))
                    .to.equal(amountCallback(amount3))
            }

            await increaseTimeAndMakeChecks(
                oneDay,
                amount => Math.floor(amount / (30 * 6)),
            )

            await increaseTimeAndMakeChecks(
                oneDay * 9,
                amount => Math.floor(amount * 10 / (30 * 6)),
            )

            await increaseTimeAndMakeChecks(
                oneDay * 60,
                amount => Math.floor(amount * 70 / (30 * 6)),
            )

            await increaseTimeAndMakeChecks(
                oneDay * 1_000,
                amount => amount,
            )
        })

        it('Claims when rewards are transferred', async () => {
            expect(await allocationRewardToken.balanceOf(referrer1.address, TOKEN_ID))
                .to.equal(amount1)
            expect(await allocationRewardToken.balanceOf(referrer2.address, TOKEN_ID))
                .to.equal(amount2)

            await tokenConverter
                .connect(referrer1)
                .convertAllocationRewardToRealEstateErc20(TOKEN_ID)

            expect(await allocationRewardToken.balanceOf(referrer1.address, TOKEN_ID))
                .to.equal(0)

            expect(await liquidToken.balanceOf(referrer1.address)).to.equal(0)

            expect((await tokenConverter.vestingBalances(referrer1.address, TOKEN_ID)).totalAmount)
                .to.equal(amount1)

            await allocationRewardToken
                .connect(referrer2)
                .safeTransferFrom(referrer2.address, referrer1.address, TOKEN_ID, amount2, '0x')

            expect(await allocationRewardToken.balanceOf(referrer1.address, TOKEN_ID))
                .to.equal(amount2)

            await tokenConverter
                .connect(referrer1)
                .convertAllocationRewardToRealEstateErc20(TOKEN_ID)

            expect(await allocationRewardToken.balanceOf(referrer1.address, TOKEN_ID)).to.equal(0)

            expect((await tokenConverter.vestingBalances(referrer1.address, TOKEN_ID)).totalAmount)
                .to.equal(amount1 + amount2)

            await time.increase(oneDay * 1_000)

            await tokenConverter
                .connect(referrer1)
                .convertAllocationRewardToRealEstateErc20(TOKEN_ID)

            await tokenConverter
                .connect(referrer2)
                .convertAllocationRewardToRealEstateErc20(TOKEN_ID)

            expect(await allocationRewardToken.balanceOf(referrer1.address, TOKEN_ID)).to.equal(0)
            expect(await allocationRewardToken.balanceOf(referrer2.address, TOKEN_ID)).to.equal(0)

            expect(await liquidToken.balanceOf(referrer1.address))
                .to.equal(parseEther(amount1 + amount2))
            expect(await liquidToken.balanceOf(referrer2.address)).to.equal(0)
        })
    })

    describe('Convert many', () => {
        const baseArray = new Array(10).fill(0).map((_, i) => i)

        beforeEach(async () => {
            await Promise.all(baseArray.map(async (_, i) => {
                await createToken(tokenDatabase, MAX_SUPPLY)
                await allocatorHelper.allocate(i, MAX_SUPPLY)
                await liquidityInitializer.claimAndAddLiquidity(i, 10_000)
            }))
        })

        it('to erc20', () => tokenConverter.convertManyAllocationsToRealEstateErc20(baseArray))

        it('to erc1155', () => tokenConverter.convertManyAllocationsToRealEstate1155(baseArray))
    })
})
