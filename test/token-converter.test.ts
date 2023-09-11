import { AllocatorHelper } from './helpers/AllocatorHelper'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestContractDeployer } from './helpers/TestContractDeployer'
import { createToken } from './helpers/create-token'
import { getLiquidToken } from './helpers/get-liquid-token'
import { solidity } from 'ethereum-waffle'
import {
    Dai,
    RyzeLiquidityInitializer,
    RyzeToken,
    RyzeTokenConverter,
    RyzeTokenDatabase,
} from '../types'
import chai, { expect } from 'chai'
import hre, { waffle } from 'hardhat'

chai.use(solidity)

const parseEther = (amount: number) => hre.ethers.utils.parseEther(amount.toString())

const INITIAL_DAI_BALANCE = 100_000_000
const MAX_SUPPLY = 1_000_000
const INITIAL_LIQUIDITY_PERCENTAGE = 1

describe('TokenConverter', () => {
    let deployer: SignerWithAddress,
        realEstateToken: RyzeToken,
        dai: Dai,
        tokenConverter: RyzeTokenConverter,
        liquidityInitializer: RyzeLiquidityInitializer,
        tokenDatabase: RyzeTokenDatabase,
        allocatorHelper: AllocatorHelper

    beforeEach(async () => {
        const signers = await hre.ethers.getSigners()

        deployer = signers[0]

        const contracts = await waffle.loadFixture(TestContractDeployer.deployAll)

        dai = contracts.dai
        tokenConverter = contracts.tokenConverter
        realEstateToken = contracts.realEstateToken
        liquidityInitializer = contracts.liquidityInitializer
        allocatorHelper = contracts.allocatorHelper
        tokenDatabase = contracts.tokenDatabase

        await dai.mint(deployer.address, parseEther(INITIAL_DAI_BALANCE))
    })

    const create = () => createToken(tokenDatabase, MAX_SUPPLY)

    const toLiquid = async (tokenId: number, amount: number) => {
        const liquidToken = await getLiquidToken(tokenConverter, tokenId)
        const initialBalanceErc20 = await liquidToken.balanceOf(deployer.address)
        const initialBalanceErc1155 = await realEstateToken.balanceOf(deployer.address, tokenId)

        await tokenConverter.convertRealEstateFromErc1155ToErc20(tokenId, amount)

        expect(await liquidToken.balanceOf(deployer.address))
            .to.equal(initialBalanceErc20.add(parseEther(amount)))

        expect(await realEstateToken.balanceOf(deployer.address, tokenId))
            .to.equal(initialBalanceErc1155.sub(amount))
    }

    const toNft = async (tokenId: number, amount: number) => {
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
        const tokenId = 0
        const amount = (MAX_SUPPLY - (MAX_SUPPLY / 100)) / 2

        await create()
        await allocatorHelper.allocate(tokenId, MAX_SUPPLY)
        await liquidityInitializer.claimAndAddLiquidity(tokenId, 10_000)
        await tokenConverter.convertAllocationToRealEstateErc1155(0, false)

        await toLiquid(tokenId, amount)

        await toLiquid(tokenId, amount - MAX_SUPPLY * INITIAL_LIQUIDITY_PERCENTAGE / 100)

        await expect(toLiquid(tokenId, amount))
            .to.be.revertedWith('ERC1155: burn amount exceeds balance')
    })

    it('Converts Liquid Tokens back to NFTs', async () => {
        const tokenId = 0

        await create()
        await allocatorHelper.allocate(tokenId, MAX_SUPPLY)
        await liquidityInitializer.claimAndAddLiquidity(tokenId, 10_000)
        await tokenConverter.convertAllocationToRealEstateErc1155(0, false)

        await toLiquid(tokenId, 100_000)

        await toNft(tokenId, 50_000)
        await toNft(tokenId, 50_000)

        await expect(toNft(tokenId, 50_000))
            .to.be.revertedWith('ERC20: burn amount exceeds balance')
    })
})
