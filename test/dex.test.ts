import { AllocatorHelper } from './helpers/AllocatorHelper'
import { DexHelpers } from './helpers/DexHelpers'
import { Hardhat } from 'hardhat-vanity'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestContractDeployer } from './helpers/TestContractDeployer'
import { createToken } from './helpers/create-token'
import { getDeadline } from '../helpers/hardhat'
import { getLiquidToken } from './helpers/get-liquid-token'
import { solidity } from 'ethereum-waffle'
import { BigNumber, constants, utils } from 'ethers'
import {
    Dai,
    RyzeFactory,
    RyzeFactory__factory,
    RyzeLiquidToken,
    RyzeLiquidityInitializer,
    RyzePair,
    RyzePair__factory,
    RyzeRouter,
    RyzeTokenConverter,
    Test_ERC20,
    Test_ERC20__factory,
} from '../types'
import chai, { expect } from 'chai'
import hre, { waffle } from 'hardhat'

chai.use(solidity)

const tokenId = 0
const MAX_SUPPLY = 5_000_000

describe('Dex', () => {
    let deployer: SignerWithAddress,
        trader: SignerWithAddress,
        liquidityProvider: SignerWithAddress,
        treasury: SignerWithAddress,
        dai: Dai,
        tokenConverter: RyzeTokenConverter,
        liquidityInitializer: RyzeLiquidityInitializer,
        factory: RyzeFactory,
        router: RyzeRouter,
        dexHelpers: DexHelpers,
        allocatorHelper: AllocatorHelper,
        liquidToken: RyzeLiquidToken,
        stablecoinDecimals: number

    beforeEach(async () => {
        [
            deployer,
            trader,
            liquidityProvider,
            treasury,
        ] = await hre.ethers.getSigners()

        const contracts = await waffle.loadFixture(TestContractDeployer.deployAll)

        dai = contracts.stablecoin
        tokenConverter = contracts.tokenConverter
        liquidityInitializer = contracts.liquidityInitializer
        factory = contracts.factory
        dexHelpers = contracts.dexHelpers
        router = contracts.router
        allocatorHelper = contracts.allocatorHelper
        stablecoinDecimals = await dai.decimals()

        await dai.mint(deployer.address, Hardhat.parseEther(MAX_SUPPLY + 1_000_000))

        await factory.setFeeTo(treasury.address)

        await createToken(contracts.tokenDatabase, MAX_SUPPLY)

        await allocatorHelper.allocate(0, MAX_SUPPLY)

        await liquidityInitializer.claimAndAddLiquidity(tokenId, utils.parseUnits('1', stablecoinDecimals))
        await tokenConverter.convertAllocationToRealEstateErc1155(0)
        await tokenConverter.convertRealEstateFromErc1155ToErc20(tokenId, 2_000_000)

        liquidToken = await getLiquidToken(tokenConverter, 0, deployer)
    })

    const addLiquidity = (
        token: RyzeLiquidToken,
        amountToken: number,
        amountDai: number,
    ) => dexHelpers.addLiquidity(
        token,
        dai,
        amountToken,
        amountDai,
        0.05,
    )

    it('Should add liquidity', async () => await addLiquidity(liquidToken, 1_000, 1_000))

    it('Should swap', async () => {
        const amountIn = Hardhat.parseEther(10)
        const amountOutMin = utils.parseUnits('9.9', stablecoinDecimals)

        await addLiquidity(liquidToken, 250_000, 250_000)

        await addLiquidity(liquidToken, 250_000, 250_000)

        await addLiquidity(liquidToken, 250_000, 250_000)

        await addLiquidity(liquidToken, 250_000, 250_000)

        const initialTokenBalance = await liquidToken.balanceOf(deployer.address)
        const initialDaiBalance = await dai.balanceOf(deployer.address)

        await dexHelpers.swap(
            liquidToken,
            dai,
            amountIn,
            amountOutMin,
        )

        expect(await liquidToken.balanceOf(deployer.address))
            .to.equal(initialTokenBalance.sub(amountIn))

        expect(await dai.balanceOf(deployer.address))
            .to.gte(initialDaiBalance.add(amountOutMin))
    })

    it('Should remove liquidity', async () => {
        const amountIn = Hardhat.parseEther(10)
        const amountOutMin = utils.parseUnits('9.9', stablecoinDecimals)
        const daiMultiplier = await dai.decimals()
        const pairMultiplier = (18 + daiMultiplier) / 2

        await addLiquidity(liquidToken, 1_000_000, 1_000_000)

        await dexHelpers.swap(
            liquidToken,
            dai,
            amountIn,
            amountOutMin,
        )

        // Step 1: Check user's balances before removing liquidity
        const initialLiquidTokenBalance = await liquidToken.balanceOf(deployer.address)
        const initialDaiBalance = await dai.balanceOf(deployer.address)
        const liquidityTokensToRemove = '100'

        await dexHelpers.removeLiquidity(
            liquidToken,
            utils.parseUnits(liquidityTokensToRemove, pairMultiplier),
        )

        // Step 2: Check user's balances after removing liquidity
        const finalLiquidTokenBalance = await liquidToken.balanceOf(deployer.address)
        const finalDaiBalance = await dai.balanceOf(deployer.address)

        // Step 3: Validate balance differences
        expect(finalLiquidTokenBalance.sub(initialLiquidTokenBalance))
            .to.almost(utils.parseUnits(liquidityTokensToRemove, 18), 0.001)
        expect(finalDaiBalance.sub(initialDaiBalance))
            .to.almost(utils.parseUnits(liquidityTokensToRemove, daiMultiplier), 0.001)
    })

    it('Should remove liquidity with permit', async () => {
        await addLiquidity(liquidToken, 1_000_000, 1_000_000)

        const pair = await dexHelpers.getPair(liquidToken)

        await dexHelpers.removeLiquidityWithPermit(
            liquidToken,
            (await pair.balanceOf(deployer.address)).div(3),
        )

        await dexHelpers.removeLiquidityWithPermit(
            liquidToken,
            (await pair.balanceOf(deployer.address)),
        )
    })

    it('Creates pairs', async () => {
        const factory = await new RyzeFactory__factory(deployer).deploy()
        const one = '0x0000000000000000000000000000000000000001'

        await factory.createPair(one, '0x0000000000000000000000000000000000000002')
        await factory.createPair(one, '0x0000000000000000000000000000000000000003')
        await factory.createPair(one, '0x0000000000000000000000000000000000000004')
        await factory.createPair(one, '0x0000000000000000000000000000000000000005')
    })

    describe('Collects fees', () => {
        let tokenA: Test_ERC20
        let tokenB: Test_ERC20
        let pair: RyzePair

        beforeEach(async () => {
            tokenA = await new Test_ERC20__factory(deployer).deploy(deployer.address)
            tokenB = await new Test_ERC20__factory(deployer).deploy(deployer.address)
            const amount = utils.parseEther('5000000000')

            await tokenA.mint(trader.address, amount)
            await tokenA.mint(liquidityProvider.address, amount.add(utils.parseEther('10')))
            await tokenB.mint(liquidityProvider.address, amount.add(utils.parseEther('10')))
            await tokenA.connect(liquidityProvider).approve(router.address, constants.MaxUint256)
            await tokenB.connect(liquidityProvider).approve(router.address, constants.MaxUint256)

            await router.connect(liquidityProvider).addLiquidity(
                tokenA.address,
                tokenB.address,
                amount,
                amount,
                amount,
                amount,
                liquidityProvider.address,
                await getDeadline(),
            )

            pair = RyzePair__factory.connect(
                await factory.getPair(tokenA.address, tokenB.address),
                deployer,
            )
        })

        const getBalances = async (signer: SignerWithAddress) => {
            const [
                finalTreasuryBalance,
                reserves,
                pairTotalSupply,
            ] = await Promise.all([
                pair.balanceOf(signer.address),
                pair.getReserves(),
                pair.totalSupply(),
            ])

            const token0IsTokenA = await pair.token0() === tokenA.address
            const pairReserveA = token0IsTokenA ? reserves._reserve0 : reserves._reserve1
            const pairReserveB = token0IsTokenA ? reserves._reserve1 : reserves._reserve0
            const balanceTokenA = finalTreasuryBalance
                .mul(pairReserveA)
                .div(pairTotalSupply)
                .add(await tokenA.balanceOf(signer.address))
            const balanceTokenB = finalTreasuryBalance
                .mul(pairReserveB)
                .div(pairTotalSupply)
                .add(await tokenB.balanceOf(signer.address))

            return {
                tokenA: balanceTokenA,
                tokenB: balanceTokenB,
                sum: balanceTokenA.add(balanceTokenB),
            }
        }

        const validateFees = async (amountIn: BigNumber) => {
            const amountOutMin = amountIn.sub(amountIn.mul(3_001).div(100_000))
            const treasuryInitialBalance = await getBalances(treasury)
            const liquidityProviderInitialBalance = await getBalances(liquidityProvider)

            await dexHelpers.swap(tokenA, tokenB, amountIn, amountOutMin, trader)

            await router.connect(liquidityProvider).addLiquidity(
                tokenA.address,
                tokenB.address,
                constants.WeiPerEther,
                constants.WeiPerEther,
                0,
                0,
                liquidityProvider.address,
                await getDeadline(),
            )

            // Calculate the expected fee
            const expectedFee = amountIn.mul(3).div(1000).div(2) // 0.15% of the traded amount for each
            const liquidityProviderFinalBalance = await getBalances(liquidityProvider)
            const treasuryFinalBalance = await getBalances(treasury)

            // Assert that the treasury received the expected fee
            expect(liquidityProviderFinalBalance.sum.sub(liquidityProviderInitialBalance.sum))
                .to.almost(expectedFee, 0.01)
            expect(treasuryFinalBalance.sum.sub(treasuryInitialBalance.sum))
                .to.almost(expectedFee, 0.01)
        }

        it('100', () => validateFees(utils.parseEther('100')))
        it('50', () => validateFees(utils.parseEther('50')))
        it('82.861486214', () => validateFees(utils.parseEther('82.861486214')))
        it('428.618953698135807153', () => validateFees(utils.parseEther('428.618953698135807153')))
    })
})
