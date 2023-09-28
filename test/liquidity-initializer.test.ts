import { AllocationState } from './helpers/enums'
import { AllocatorErrors } from './helpers/Errors'
import { AllocatorHelper } from './helpers/AllocatorHelper'
import { DexHelpers } from './helpers/DexHelpers'
import { Hardhat } from 'hardhat-vanity'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestContractDeployer } from './helpers/TestContractDeployer'
import { constants, utils } from 'ethers'
import { createToken } from './helpers/create-token'
import { solidity } from 'ethereum-waffle'
import { waffle } from 'hardhat'
import {
    Dai,
    RyzeLiquidToken__factory,
    RyzeLiquidityInitializer,
    RyzeToken,
    RyzeTokenConverter,
    RyzeTokenDatabase,
} from '../types'
import chai, { expect } from 'chai'

chai.use(solidity)

const TOKEN_ID = 0
const MINIMUM_LIQUIDITY = 1_000
const DAI_AMOUNT = 5_000_000
const MAX_SUPPLY = 100_000
const ONE_PERCENT_OF_MAX_SUPPLY = MAX_SUPPLY / 100

describe('Liquidity initializer', () => {
    let deployer: SignerWithAddress,
        dai: Dai,
        realEstateToken: RyzeToken,
        tokenConverter: RyzeTokenConverter,
        liquidityInitializer: RyzeLiquidityInitializer,
        dexHelpers: DexHelpers,
        allocatorHelper: AllocatorHelper,
        tokenDatabase: RyzeTokenDatabase,
        stablecoinDecimals: number

    beforeEach(async () => {
        deployer = await Hardhat.mainSigner()

        const contracts = await waffle.loadFixture(TestContractDeployer.deployAll)

        dai = contracts.stablecoin
        realEstateToken = contracts.realEstateToken
        tokenConverter = contracts.tokenConverter
        liquidityInitializer = contracts.liquidityInitializer
        tokenDatabase = contracts.tokenDatabase
        dexHelpers = contracts.dexHelpers
        allocatorHelper = contracts.allocatorHelper
        stablecoinDecimals = await dai.decimals()

        await dai.mint(deployer.address, Hardhat.parseEther(DAI_AMOUNT))
        await createToken(tokenDatabase, MAX_SUPPLY)
    })

    it('Shows proper allocation', async () => {
        expect(await liquidityInitializer.allocation(TOKEN_ID)).to.equal(0)

        await allocatorHelper.allocate(TOKEN_ID, 1)

        expect(await liquidityInitializer.allocation(TOKEN_ID)).to.equal(ONE_PERCENT_OF_MAX_SUPPLY)
    })

    it('Shouldn\'t initialize before allocation period is over', async () => {
        await expect(liquidityInitializer.claimAndAddLiquidity(TOKEN_ID, 10_000))
            .to.be.revertedWith(AllocatorErrors.InvalidAllocationState)
            .withArgs(AllocationState.PENDING, AllocationState.PRE_SALE)
    })

    describe('Initializes liquidity', async () => {
        const getLiquidToken = async (tokenId: number) => RyzeLiquidToken__factory.connect(
            await tokenConverter.getLiquidToken(tokenId),
            deployer,
        )

        beforeEach(async () => {
            await dai.approve(realEstateToken.address, constants.MaxUint256)
            await dai.approve(liquidityInitializer.address, constants.MaxUint256)
            await allocatorHelper.allocate(TOKEN_ID, MAX_SUPPLY)
        })

        it('Calculates dai required to initialize', async () => {
            const percentages = [
                95,
                100,
                102,
                105,
                110,
            ]

            for (const percentage of percentages) {
                expect(
                    await liquidityInitializer.calculateStablecoinsRequired(
                        0,
                        percentage * Math.pow(10, stablecoinDecimals),
                    ),
                ).to.equal(
                    utils.parseUnits(ONE_PERCENT_OF_MAX_SUPPLY.toString(), stablecoinDecimals)
                        .mul(percentage)
                )
            }
        })

        it('1 dai to 1 token', async () => {
            await liquidityInitializer.claimAndAddLiquidity(
                TOKEN_ID,
                utils.parseUnits('1', stablecoinDecimals),
            )

            const liquidToken = await getLiquidToken(TOKEN_ID)
            const pair = await dexHelpers.getPair(liquidToken)

            expect(await pair.balanceOf(deployer.address))
                .to.equal(utils.parseUnits(ONE_PERCENT_OF_MAX_SUPPLY.toString(), (18 + stablecoinDecimals) / 2).sub(MINIMUM_LIQUIDITY))

            expect(await liquidToken.balanceOf(pair.address))
                .to.equal(Hardhat.parseEther(ONE_PERCENT_OF_MAX_SUPPLY))

            expect(await dai.balanceOf(pair.address))
                .to.equal(utils.parseUnits(ONE_PERCENT_OF_MAX_SUPPLY.toString(), stablecoinDecimals))
        })

        it('1.01 dai to 1 token', async () => {
            const ratio = utils.parseUnits('1.01', stablecoinDecimals)
            await liquidityInitializer.claimAndAddLiquidity(TOKEN_ID, ratio)

            const liquidToken = await getLiquidToken(TOKEN_ID)
            const pair = await dexHelpers.getPair(liquidToken)

            expect(await pair.balanceOf(deployer.address))
                .to.equal((await pair.totalSupply()).sub(MINIMUM_LIQUIDITY))

            expect(await liquidToken.balanceOf(pair.address))
                .to.equal(Hardhat.parseEther(ONE_PERCENT_OF_MAX_SUPPLY))

            expect(await dai.balanceOf(pair.address))
                .to.equal(ratio.mul(ONE_PERCENT_OF_MAX_SUPPLY))
        })
    })
})
