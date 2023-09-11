import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getCreate2Address } from './helpers/uniswap-core-utils'
import hre from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract } from 'ethers'
import { RyzeFactory, RyzeFactory__factory, RyzePair__factory } from '../types'
import chai, { expect } from 'chai'

chai.use(solidity)

const TEST_ADDRESSES: [string, string] = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000',
]

describe('RyzeFactory', () => {
    let factory: RyzeFactory,
        wallet: SignerWithAddress,
        other: SignerWithAddress,
        owner: SignerWithAddress

    beforeEach(async () => {
        [
            wallet,
            other,
            owner,
        ] = await hre.ethers.getSigners()

        factory = await new RyzeFactory__factory(owner).deploy()

        await factory.initialize(owner.address)
    })

    it('feeTo, feeToSetter, allPairsLength', async () => {
        expect(await factory.feeTo()).to.eq(owner.address)
        expect(await factory.owner()).to.eq(owner.address)
        expect(await factory.allPairsLength()).to.eq(0)
    })

    async function createPair(tokens: [string, string]) {
        const create2Address = getCreate2Address(factory.address, tokens, RyzePair__factory.bytecode)

        await expect(factory.createPair(...tokens))
            .to.emit(factory, 'PairCreated')
            .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, BigNumber.from(1))

        const reverseTokens = tokens.slice().reverse() as [string, string]

        await expect(factory.createPair(...tokens)).to.be.revertedWith('PAIR_EXISTS')
        await expect(factory.createPair(...reverseTokens)).to.be.revertedWith('PAIR_EXISTS')
        expect(await factory.getPair(...tokens)).to.eq(create2Address)
        expect(await factory.getPair(...reverseTokens)).to.eq(create2Address)
        expect(await factory.allPairs(0)).to.eq(create2Address)
        expect(await factory.allPairsLength()).to.eq(1)

        const pair = new Contract(create2Address, JSON.stringify(RyzePair__factory.abi), hre.ethers.provider)

        expect(await pair.factory()).to.eq(factory.address)
        expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
        expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
    }

    it('createPair', async () => {
        await createPair(TEST_ADDRESSES)
    })

    it('createPair:reverse', async () => {
        await createPair(TEST_ADDRESSES.slice().reverse() as [string, string])
    })

    it('setFeeTo', async () => {
        await expect(factory.connect(other).setFeeTo(other.address))
            .to.be.revertedWith('Ownable: caller is not the owner')
        await factory.connect(owner).setFeeTo(wallet.address)

        expect(await factory.feeTo()).to.eq(wallet.address)
    })

    it('setFeeToSetter', async () => {
        await factory.connect(owner).transferOwnership(other.address)

        expect(await factory.owner()).to.eq(other.address)

        await expect(factory.transferOwnership(wallet.address))
            .to.be.revertedWith('Ownable: caller is not the owner')
    })
})
