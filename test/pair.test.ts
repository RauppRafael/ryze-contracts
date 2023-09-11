import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { almost } from './helpers/chai.extension'
import { encodePrice } from './helpers/uniswap-core-utils'
import hre from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { BigNumber, constants, utils } from 'ethers'
import {
    RyzeFactory,
    RyzeFactory__factory,
    RyzePair,
    RyzePair__factory,
    Test_ERC20,
    Test_ERC20__factory,
} from '../types'
import chai, { expect } from 'chai'

const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3)

chai.use(almost)
chai.use(solidity)

describe('RyzePair', () => {
    let factory: RyzeFactory,
        token0: Test_ERC20,
        token1: Test_ERC20,
        pair: RyzePair,
        wallet0: SignerWithAddress,
        wallet1: SignerWithAddress

    beforeEach(async () => {
        [wallet0, wallet1] = await hre.ethers.getSigners()

        factory = await new RyzeFactory__factory(wallet0).deploy()

        await factory.initialize(wallet0.address)
        await factory.setFeeTo(constants.AddressZero)

        const tokenA = await new Test_ERC20__factory(wallet0).deploy(wallet0.address)
        const tokenB = await new Test_ERC20__factory(wallet0).deploy(wallet0.address)

        await factory.createPair(tokenA.address, tokenB.address)

        const pairAddress = await factory.getPair(tokenA.address, tokenB.address)

        pair = RyzePair__factory.connect(pairAddress, wallet0)

        const token0Address = await pair.token0()

        token0 = tokenA.address === token0Address ? tokenA : tokenB
        token1 = tokenA.address === token0Address ? tokenB : tokenA
    })

    it('mint', async () => {
        const token0Amount = utils.parseEther('1')
        const token1Amount = utils.parseEther('4')

        await token0.transfer(pair.address, token0Amount)
        await token1.transfer(pair.address, token1Amount)

        const expectedLiquidity = utils.parseEther('2')

        await expect(await pair.mint(wallet0.address ))
            .to.emit(pair, 'Transfer')
            .withArgs(constants.AddressZero, '0x000000000000000000000000000000000000dEaD', MINIMUM_LIQUIDITY)
            .to.emit(pair, 'Transfer')
            .withArgs(constants.AddressZero, wallet0.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            .to.emit(pair, 'Sync')
            .withArgs(token0Amount, token1Amount)
            .to.emit(pair, 'Mint')
            .withArgs(wallet0.address, token0Amount, token1Amount)

        expect(await pair.totalSupply()).to.eq(expectedLiquidity)
        expect(await pair.balanceOf(wallet0.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        expect(await token0.balanceOf(pair.address)).to.eq(token0Amount)
        expect(await token1.balanceOf(pair.address)).to.eq(token1Amount)
        const reserves = await pair.getReserves()

        expect(reserves[0]).to.eq(token0Amount)
        expect(reserves[1]).to.eq(token1Amount)
    })

    async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
        await token0.transfer(pair.address, token0Amount)
        await token1.transfer(pair.address, token1Amount)
        await pair.mint(wallet0.address )
    }
    const swapTestCases: BigNumber[][] = [
        [1, 5, 10, '1662497915624478906'],
        [1, 10, 5, '453305446940074565'],

        [2, 5, 10, '2851015155847869602'],
        [2, 10, 5, '831248957812239453'],

        [1, 10, 10, '906610893880149131'],
        [1, 100, 100, '987158034397061298'],
        [1, 1000, 1000, '996006981039903216'],
    ].map(a => a.map(n => (typeof n === 'string' ? BigNumber.from(n) : utils.parseEther(n.toString()))))

    swapTestCases.forEach((swapTestCase, i) => {
        it(`getInputPrice:${ i }`, async () => {
            const [
                swapAmount,
                token0Amount,
                token1Amount,
                expectedOutputAmount,
            ] = swapTestCase

            await addLiquidity(token0Amount, token1Amount)
            await token0.transfer(pair.address, swapAmount)
            await expect(pair.swap(0, expectedOutputAmount.add(1), wallet0.address, '0x' )).to.be.revertedWith(
                'K',
            )
            await pair.swap(0, expectedOutputAmount, wallet0.address, '0x' )
        })
    })

    const optimisticTestCases: BigNumber[][] = [
        ['997000000000000000', 5, 10, 1], // given amountIn, amountOut = floor(amountIn * .997)
        ['997000000000000000', 10, 5, 1],
        ['997000000000000000', 5, 5, 1],
        [1, 5, 5, '1003009027081243732'], // given amountOut, amountIn = ceiling(amountOut / .997)
    ].map(a => a.map(n => (typeof n === 'string' ? BigNumber.from(n) : utils.parseEther(n.toString()))))

    optimisticTestCases.forEach((optimisticTestCase, i) => {
        it(`optimistic:${ i }`, async () => {
            const [
                outputAmount,
                token0Amount,
                token1Amount,
                inputAmount,
            ] = optimisticTestCase

            await addLiquidity(token0Amount, token1Amount)
            await token0.transfer(pair.address, inputAmount)
            await expect(pair.swap(outputAmount.add(1), 0, wallet0.address, '0x' )).to.be.revertedWith(
                'K',
            )
            await pair.swap(outputAmount, 0, wallet0.address, '0x' )
        })
    })

    it('swap:token0', async () => {
        const token0Amount = utils.parseEther('5')
        const token1Amount = utils.parseEther('10')

        await addLiquidity(token0Amount, token1Amount)

        const swapAmount = utils.parseEther('1')
        const expectedOutputAmount = BigNumber.from('1662497915624478906')

        await token0.transfer(pair.address, swapAmount)
        await expect(pair.swap(0, expectedOutputAmount, wallet0.address, '0x' ))
            .to.emit(token1, 'Transfer')
            .withArgs(pair.address, wallet0.address, expectedOutputAmount)
            .to.emit(pair, 'Sync')
            .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
            .to.emit(pair, 'Swap')
            .withArgs(wallet0.address, swapAmount, 0, 0, expectedOutputAmount, wallet0.address)

        const reserves = await pair.getReserves()

        expect(reserves[0]).to.eq(token0Amount.add(swapAmount))
        expect(reserves[1]).to.eq(token1Amount.sub(expectedOutputAmount))
        expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.add(swapAmount))
        expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.sub(expectedOutputAmount))
        const totalSupplyToken0 = await token0.totalSupply()
        const totalSupplyToken1 = await token1.totalSupply()

        expect(await token0.balanceOf(wallet0.address)).to.eq(totalSupplyToken0.sub(token0Amount).sub(swapAmount))
        expect(await token1.balanceOf(wallet0.address)).to.eq(totalSupplyToken1.sub(token1Amount).add(expectedOutputAmount))
    })

    it('swap:token1', async () => {
        const token0Amount = utils.parseEther('5')
        const token1Amount = utils.parseEther('10')

        await addLiquidity(token0Amount, token1Amount)

        const swapAmount = utils.parseEther('1')
        const expectedOutputAmount = BigNumber.from('453305446940074565')

        await token1.transfer(pair.address, swapAmount)
        await expect(pair.swap(expectedOutputAmount, 0, wallet0.address, '0x' ))
            .to.emit(token0, 'Transfer')
            .withArgs(pair.address, wallet0.address, expectedOutputAmount)
            .to.emit(pair, 'Sync')
            .withArgs(token0Amount.sub(expectedOutputAmount), token1Amount.add(swapAmount))
            .to.emit(pair, 'Swap')
            .withArgs(wallet0.address, 0, swapAmount, expectedOutputAmount, 0, wallet0.address)

        const reserves = await pair.getReserves()

        expect(reserves[0]).to.eq(token0Amount.sub(expectedOutputAmount))
        expect(reserves[1]).to.eq(token1Amount.add(swapAmount))
        expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.sub(expectedOutputAmount))
        expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.add(swapAmount))
        const totalSupplyToken0 = await token0.totalSupply()
        const totalSupplyToken1 = await token1.totalSupply()

        expect(await token0.balanceOf(wallet0.address)).to.eq(totalSupplyToken0.sub(token0Amount).add(expectedOutputAmount))
        expect(await token1.balanceOf(wallet0.address)).to.eq(totalSupplyToken1.sub(token1Amount).sub(swapAmount))
    })

    it('burn', async () => {
        const token0Amount = utils.parseEther('3')
        const token1Amount = utils.parseEther('3')

        await addLiquidity(token0Amount, token1Amount)

        const expectedLiquidity = utils.parseEther('3')

        await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        await expect(pair.burn(wallet0.address ))
            .to.emit(pair, 'Transfer')
            .withArgs(pair.address, constants.AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            .to.emit(token0, 'Transfer')
            .withArgs(pair.address, wallet0.address, token0Amount.sub(1000))
            .to.emit(token1, 'Transfer')
            .withArgs(pair.address, wallet0.address, token1Amount.sub(1000))
            .to.emit(pair, 'Sync')
            .withArgs(1000, 1000)
            .to.emit(pair, 'Burn')
            .withArgs(wallet0.address, token0Amount.sub(1000), token1Amount.sub(1000), wallet0.address)

        expect(await pair.balanceOf(wallet0.address)).to.eq(0)
        expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
        expect(await token0.balanceOf(pair.address)).to.eq(1000)
        expect(await token1.balanceOf(pair.address)).to.eq(1000)
        const totalSupplyToken0 = await token0.totalSupply()
        const totalSupplyToken1 = await token1.totalSupply()

        expect(await token0.balanceOf(wallet0.address)).to.eq(totalSupplyToken0.sub(1000))
        expect(await token1.balanceOf(wallet0.address)).to.eq(totalSupplyToken1.sub(1000))
    })

    it('price{0,1}CumulativeLast', async () => {
        const token0Amount = utils.parseEther('3')
        const token1Amount = utils.parseEther('3')

        await addLiquidity(token0Amount, token1Amount)

        const blockTimestamp = (await pair.getReserves())._blockTimestampLast

        await pair.sync()

        const initialPrice = encodePrice(token0Amount, token1Amount)

        expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0])
        expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1])
        expect((await pair.getReserves())._blockTimestampLast).to.eq(blockTimestamp + 1)

        const swapAmount = utils.parseEther('3')

        await token0.transfer(pair.address, swapAmount)
        // swap to a new price eagerly instead of syncing
        await pair.swap(0, utils.parseEther('1'), wallet0.address, '0x' ) // make the price nice

        expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0].mul(3))
        expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1].mul(3))
        expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 3)

        await pair.sync()

        const newPrice = encodePrice(utils.parseEther('6'), utils.parseEther('2'))

        expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0].mul(3).add(newPrice[0]))
        expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1].mul(3).add(newPrice[1]))
        expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 4)
    })

    it('feeTo:off', async () => {
        const token0Amount = utils.parseEther('1000')
        const token1Amount = utils.parseEther('1000')

        await addLiquidity(token0Amount, token1Amount)

        const swapAmount = utils.parseEther('1')
        const expectedOutputAmount = BigNumber.from('996006981039903216')

        await token1.transfer(pair.address, swapAmount)
        await pair.swap(expectedOutputAmount, 0, wallet0.address, '0x' )

        const expectedLiquidity = utils.parseEther('1000')

        await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        await pair.burn(wallet0.address )
        expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
    })

    it('feeTo:on', async () => {
        await factory.setFeeTo(wallet1.address)

        const token0Amount = utils.parseEther('1000')
        const token1Amount = utils.parseEther('1000')

        await addLiquidity(token0Amount, token1Amount)

        const swapAmount = utils.parseEther('1')
        const expectedOutputAmount = BigNumber.from('996006981039903216')

        await token1.transfer(pair.address, swapAmount)
        await pair.swap(expectedOutputAmount, 0, wallet0.address, '0x' )

        const expectedLiquidity = utils.parseEther('1000')

        await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        await pair.burn(wallet0.address )

        expect(await pair.totalSupply())
            .to.almost(MINIMUM_LIQUIDITY.add('249750499251388').mul(3), 0.0001)
        expect(await pair.balanceOf(wallet1.address))
            .to.almost(BigNumber.from('249750499251388').mul(3), 0.0001)

        // using 1000 here instead of the symbolic MINIMUM_LIQUIDITY because the amounts only happen to be equal...
        // ...because the initial liquidity amounts were equal
        expect(await token0.balanceOf(pair.address))
            .to.almost(BigNumber.from(1000).add('249501683697445').mul(3), 0.0001)
        expect(await token1.balanceOf(pair.address))
            .to.almost(BigNumber.from(1000).add('250000187312969').mul(3), 0.0001)
    })
})
