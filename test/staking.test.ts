import { time } from '@nomicfoundation/hardhat-network-helpers'
import { AllocatorHelper } from './helpers/AllocatorHelper'
import { DexHelpers } from './helpers/DexHelpers'
import { Hardhat } from 'hardhat-vanity'
import { Permit } from '@ryze-blockchain/shared'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestContractDeployer } from './helpers/TestContractDeployer'
import { BigNumber, constants, utils } from 'ethers'
import { createToken } from './helpers/create-token'
import { getLiquidToken } from './helpers/get-liquid-token'
import { solidity } from 'ethereum-waffle'
import {
    Dai,
    RyzeLiquidToken,
    RyzeLiquidityInitializer,
    RyzePair,
    RyzePair__factory,
    RyzeRouter,
    RyzeStaking,
    RyzeToken,
    RyzeTokenConverter,
    RyzeWhitelist,
} from '../types'
import chai, { expect } from 'chai'
import hre, { waffle } from 'hardhat'

chai.use(solidity)

const tokenId = 0
const MAX_SUPPLY = 1_000_000

interface ITester {
    signer: SignerWithAddress
    percentage: number
}

enum TokenType {
    LIQUID_TOKEN,
    NFT,
    PAIR,
}

describe('Staking', () => {
    let deployer: SignerWithAddress,
        signers: SignerWithAddress[],
        testers: ITester[],
        dai: Dai,
        tokenConverter: RyzeTokenConverter,
        liquidityInitializer: RyzeLiquidityInitializer,
        allocatorHelper: AllocatorHelper,
        realEstateToken: RyzeToken,
        liquidToken: RyzeLiquidToken,
        staking: RyzeStaking,
        router: RyzeRouter,
        dexHelpers: DexHelpers,
        pair: RyzePair,
        whitelist: RyzeWhitelist,
        stableDecimals: number,
        pairMultiplier: number,
        rewardMaturationTime: BigNumber

    function parseUnits(value: number, decimals: number) {
        return utils.parseUnits(value.toString(), decimals)
    }

    function forAllTesters(callback: (tester: ITester) => void) {
        return Promise.all(testers.map(callback))
    }

    async function stakeAll(tokenType: TokenType) {
        const isPair = tokenType === TokenType.PAIR

        await forAllTesters(async tester => {
            const stakedAmount = parseUnits(tester.percentage, isPair ? pairMultiplier : 18)

            if (tokenType === TokenType.NFT)
                await staking.connect(tester.signer).stakeERC1155(0, stakedAmount.div(Hardhat.parseEther(1)))
            else
                await staking.connect(tester.signer).stakeERC20(0, isPair, stakedAmount)

            const userInfo = await staking.userInfo(0, isPair, tester.signer.address)

            expect(userInfo.stake_).to.equal(stakedAmount)
            expect(userInfo.pendingRewards_).to.equal(0)
        })

        await staking.distribute(0, Hardhat.parseEther(100))
        await time.increase(rewardMaturationTime)

        await forAllTesters(async tester => {
            const address = tester.signer.address
            const amount = Hardhat.parseEther(tester.percentage)

            expect(await dai.balanceOf(address)).to.equal(0)

            await staking.connect(tester.signer).claimRewards(0, isPair)

            expect(await dai.balanceOf(address)).to.equal(amount)

            await staking.connect(tester.signer).claimRewards(0, isPair)

            expect(await dai.balanceOf(address)).to.equal(amount)
        })
    }

    beforeEach(async () => {
        signers = await hre.ethers.getSigners()
        deployer = signers[0]
        testers = [
            { signer: signers[1], percentage: 20 },
            { signer: signers[2], percentage: 30 },
            { signer: signers[3], percentage: 50 },
        ]

        const contracts = await waffle.loadFixture(TestContractDeployer.deployAll)

        dai = contracts.stablecoin
        tokenConverter = contracts.tokenConverter
        liquidityInitializer = contracts.liquidityInitializer
        router = contracts.router
        staking = contracts.staking
        allocatorHelper = contracts.allocatorHelper
        dexHelpers = contracts.dexHelpers
        realEstateToken = contracts.realEstateToken
        whitelist = contracts.whitelist
        stableDecimals = await dai.decimals()
        pairMultiplier = (18 + stableDecimals) / 2
        rewardMaturationTime = await staking.REWARD_MATURATION_TIME()

        await dai.mint(deployer.address, Hardhat.parseEther(MAX_SUPPLY + 1_000_000))
        await dai.approve(staking.address, constants.MaxUint256)

        await createToken(contracts.tokenDatabase, MAX_SUPPLY)

        await allocatorHelper.allocate(0, MAX_SUPPLY)

        await liquidityInitializer.claimAndAddLiquidity(tokenId, parseUnits(1, stableDecimals))
        await tokenConverter.convertAllocationToRealEstateErc20(0)

        liquidToken = await getLiquidToken(tokenConverter, 0, deployer)
        pair = RyzePair__factory.connect(
            await router.pairFor(liquidToken.address, dai.address),
            deployer,
        )

        await dexHelpers.addLiquidity(liquidToken, dai, 100 * 2, 100 * 2, 0.05)

        await forAllTesters(async tester => {
            await whitelist.updateUserWhitelistStatus(tester.signer.address, true)

            await pair.transfer(tester.signer.address, parseUnits(tester.percentage, pairMultiplier))

            await pair
                .connect(tester.signer)
                .approve(staking.address, constants.MaxUint256)

            await liquidToken
                .transfer(tester.signer.address, Hardhat.parseEther(1_000))

            await liquidToken
                .connect(tester.signer)
                .approve(staking.address, constants.MaxUint256)
        })
    })

    describe('Liquid token staking', () => {
        beforeEach(async () => {
            await forAllTesters(async tester => {
                await liquidToken
                    .transfer(tester.signer.address, Hardhat.parseEther(1_000))

                await liquidToken
                    .connect(tester.signer)
                    .approve(staking.address, constants.MaxUint256)
            })
        })

        it('Stakes liquid tokens', () => stakeAll(TokenType.LIQUID_TOKEN))

        it('Stakes liquid token with permit', async () => {
            const token = await tokenConverter.getLiquidToken(0)

            await forAllTesters(async tester => {
                const stakedAmount = Hardhat.parseEther(tester.percentage)
                const permit = await Permit.ERC2612(
                    await Hardhat.chainId(),
                    tester.signer,
                    token,
                    staking.address,
                )

                await staking.connect(tester.signer).stakeERC20WithPermit(
                    0,
                    false,
                    stakedAmount,
                    permit,
                )

                const userInfo = await staking.userInfo(0, false, tester.signer.address)

                expect(userInfo.stake_).to.equal(stakedAmount)
                expect(userInfo.pendingRewards_).to.equal(0)
            })
        })

        it('Works with deposits after reward distribution', async () => {
            const derp = signers[signers.length - 1]

            await whitelist.updateUserWhitelistStatus(derp.address, true)

            await forAllTesters(
                async tester => await staking
                    .connect(tester.signer)
                    .stakeERC20(0, false, Hardhat.parseEther(tester.percentage)),
            )

            await staking.distribute(0, Hardhat.parseEther(100))

            await liquidToken.transfer(derp.address, Hardhat.parseEther(1_000))
            await liquidToken.connect(derp).approve(staking.address, constants.MaxUint256)

            await forAllTesters(
                async tester => expect(await dai.balanceOf(tester.signer.address))
                    .to.equal(0),
            )
            expect(await dai.balanceOf(derp.address)).to.equal(0)

            await staking.connect(derp).stakeERC20(0, false, Hardhat.parseEther(10))
            await time.increase(rewardMaturationTime)
            await staking.connect(derp).claimRewards(0, false)
            await forAllTesters(tester => staking.connect(tester.signer).claimRewards(0, false))
            await staking.connect(derp).claimRewards(0, false)

            expect(await dai.balanceOf(derp.address)).to.equal(0)

            await forAllTesters(
                async tester => expect(await dai.balanceOf(tester.signer.address))
                    .to.equal(Hardhat.parseEther(tester.percentage)),
            )
        })

        it('Converts and stakes', async () => {
            await forAllTesters(async tester => {
                await tokenConverter.connect(tester.signer).convertRealEstateFromErc20ToErc1155(0, tester.percentage)
                await realEstateToken.connect(tester.signer).setApprovalForAll(staking.address, true)
            })

            await stakeAll(TokenType.NFT)
        })

        describe('Unstake', () => {
            beforeEach(async () => {
                await forAllTesters(async tester => {
                    await staking.connect(tester.signer).stakeERC20(0, false, Hardhat.parseEther(tester.percentage))
                    await liquidToken.connect(tester.signer).transfer(
                        signers[signers.length - 1].address,
                        await liquidToken.balanceOf(tester.signer.address),
                    )
                })
            })

            describe('Unstakes with rewards', () => {
                it('Without passing time', async () => {
                    await staking.distribute(0, Hardhat.parseEther(100))

                    await forAllTesters(async tester => {
                        const address = tester.signer.address
                        const amount = Hardhat.parseEther(tester.percentage)

                        expect(await dai.balanceOf(address)).to.equal(0)
                        expect(await liquidToken.balanceOf(address)).to.equal(0)

                        await staking.connect(tester.signer).unstake(0, false, amount)

                        expect(await dai.balanceOf(address)).to.equal(0)
                        expect(await liquidToken.balanceOf(address)).to.equal(amount)
                    })
                })

                it('Redistributes forfeited rewards', async () => {
                    await liquidToken.connect(deployer).approve(staking.address, constants.MaxUint256)
                    await staking.connect(deployer).stakeERC20(0, false, Hardhat.parseEther('10'))

                    const distributedAmount = Hardhat.parseEther(100)

                    await staking.distribute(0, distributedAmount)

                    // burn remaining dai
                    await dai.transfer(liquidToken.address, await dai.balanceOf(deployer.address))

                    await forAllTesters(async tester => {
                        const address = tester.signer.address
                        const amount = Hardhat.parseEther(tester.percentage)

                        expect(await dai.balanceOf(address)).to.equal(0)
                        expect(await liquidToken.balanceOf(address)).to.equal(0)

                        await staking.connect(tester.signer).unstake(0, false, amount)

                        expect(await dai.balanceOf(address)).to.equal(0)
                        expect(await liquidToken.balanceOf(address)).to.equal(amount)
                    })

                    // remaining staker recieves all rewards
                    expect(await dai.balanceOf(deployer.address))
                        .to.equal(0)
                    expect((await staking.userInfo(0, false, deployer.address)).pendingRewards_)
                        .to.almost(distributedAmount, 0.00001)

                    await time.increase(rewardMaturationTime)

                    await staking.connect(deployer).unstake(0, false, Hardhat.parseEther('10'))

                    expect((await staking.userInfo(0, false, deployer.address)).pendingRewards_)
                        .to.equal(0)
                    expect(await dai.balanceOf(deployer.address))
                        .to.almost(distributedAmount, 0.00001)
                })

                it('Passing time', async () => {
                    await staking.distribute(0, Hardhat.parseEther(100))

                    await time.increase(rewardMaturationTime)

                    await forAllTesters(async tester => {
                        const address = tester.signer.address
                        const amount = Hardhat.parseEther(tester.percentage)

                        expect(await dai.balanceOf(address)).to.equal(0)
                        expect(await liquidToken.balanceOf(address)).to.equal(0)

                        await staking.connect(tester.signer).unstake(0, false, amount)

                        expect(await dai.balanceOf(address)).to.equal(amount)
                        expect(await liquidToken.balanceOf(address)).to.equal(amount)
                    })
                })
            })

            it('Unstakes without rewards', async () => {
                await forAllTesters(async tester => {
                    const address = tester.signer.address
                    const amount = Hardhat.parseEther(tester.percentage)

                    expect(await dai.balanceOf(address)).to.equal(0)
                    expect(await liquidToken.balanceOf(address)).to.equal(0)

                    await staking.connect(tester.signer).unstake(0, false, amount)

                    expect(await dai.balanceOf(address)).to.equal(0)
                    expect(await liquidToken.balanceOf(address)).to.equal(amount)
                })
            })
        })
    })

    describe('Pair staking', () => {
        it('Stakes pairs', () => stakeAll(TokenType.PAIR))

        it('Works with deposits after reward distribution', async () => {
            const derp = signers[signers.length - 1]

            await whitelist.updateUserWhitelistStatus(derp.address, true)

            await forAllTesters(async tester => {
                await staking
                    .connect(tester.signer)
                    .stakeERC20(0, true, parseUnits(tester.percentage, pairMultiplier))

                expect(await dai.balanceOf(tester.signer.address))
                    .to.equal(0)
            })

            await staking.distribute(0, Hardhat.parseEther(100))

            await pair.transfer(derp.address, parseUnits(100, pairMultiplier))
            await pair.connect(derp).approve(staking.address, constants.MaxUint256)
            await dexHelpers.swap(dai, liquidToken, Hardhat.parseEther(500), Hardhat.parseEther(100))

            expect(await dai.balanceOf(derp.address)).to.equal(0)

            await staking.connect(derp).stakeERC20(0, true, parseUnits(10, pairMultiplier))
            await time.increase(rewardMaturationTime)
            await staking.connect(derp).claimRewards(0, true)
            await forAllTesters(tester => staking.connect(tester.signer).claimRewards(0, true))
            await staking.connect(derp).claimRewards(0, true)

            expect(await dai.balanceOf(derp.address)).to.equal(0)

            await forAllTesters(async tester => {
                expect(await dai.balanceOf(tester.signer.address))
                    .to.equal(Hardhat.parseEther(tester.percentage))
            })
        })
    })

    it('Stakes mixed liquid tokens and pairs', async () => {
        await forAllTesters(async tester => {
            const liquidAmount = Hardhat.parseEther(tester.percentage)
            const pairAmount = parseUnits(tester.percentage, pairMultiplier)

            await staking
                .connect(tester.signer)
                .stakeERC20(0, true, pairAmount)

            await staking
                .connect(tester.signer)
                .stakeERC20(0, false, liquidAmount)

            const pairUserInfo = await staking.userInfo(0, true, tester.signer.address)
            const liquidTokenUserInfo = await staking.userInfo(0, false, tester.signer.address)

            expect(pairUserInfo.stake_).to.equal(pairAmount)
            expect(pairUserInfo.pendingRewards_).to.equal(0)

            expect(liquidTokenUserInfo.stake_).to.equal(liquidAmount)
            expect(liquidTokenUserInfo.pendingRewards_).to.equal(0)

            expect(await dai.balanceOf(tester.signer.address))
                .to.equal(0)
        })

        await staking.distribute(0, Hardhat.parseEther(200))
        await time.increase(rewardMaturationTime)

        await forAllTesters(async tester => {
            const amount = Hardhat.parseEther(tester.percentage)
            const address = tester.signer.address

            expect((await staking.userInfo(0, true, address)).pendingRewards_).to.equal(amount)
            expect((await staking.userInfo(0, false, address)).pendingRewards_).to.equal(amount)

            await staking.connect(tester.signer).claimRewards(0, true)
            expect(await dai.balanceOf(tester.signer.address)).to.equal(amount)
            expect((await staking.userInfo(0, true, address)).pendingRewards_).to.equal(0)

            await staking.connect(tester.signer).claimRewards(0, false)
            expect(await dai.balanceOf(tester.signer.address)).to.equal(amount.mul(2))
            expect((await staking.userInfo(0, false, address)).pendingRewards_).to.equal(0)

            await staking.connect(tester.signer).claimRewards(0, true)
            await staking.connect(tester.signer).claimRewards(0, false)

            expect(await dai.balanceOf(tester.signer.address))
                .to.equal(amount.mul(2))
        })
    })
})
