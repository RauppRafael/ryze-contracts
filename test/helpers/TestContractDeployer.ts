import { AllocatorHelper } from './AllocatorHelper'
import { DexHelpers } from './DexHelpers'
import { WrappedEther } from '@ryze-blockchain/shared'
import { constants } from 'ethers'
import { deployProject } from '../../helpers/deploy-project'
import {
    Dai,
    Dai__factory,
    RyzeAllocator,
    RyzeFactory,
    RyzeLiquidityInitializer,
    RyzeRouter,
    RyzeStaking,
    RyzeToken,
    RyzeTokenConverter,
    RyzeTokenDatabase,
    RyzeWhitelist,
} from '../../types'
import hre, { upgrades } from 'hardhat'

const USDT_ADDRESS = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'

let loggedPairHash = false

export class TestContractDeployer {

    public static async deployAll(): Promise<{
        stablecoin: Dai
        weth: WrappedEther
        allocationToken: RyzeToken
        allocationRewardToken: RyzeToken
        allocator: RyzeAllocator
        allocatorHelper: AllocatorHelper
        tokenConverter: RyzeTokenConverter
        realEstateToken: RyzeToken
        liquidityInitializer: RyzeLiquidityInitializer
        factory: RyzeFactory
        router: RyzeRouter
        dexHelpers: DexHelpers
        tokenDatabase: RyzeTokenDatabase
        staking: RyzeStaking
        whitelist: RyzeWhitelist
    }> {
        const fork = process.env.HARDHAT_FORK === 'true'
        const [deployer] = await hre.ethers.getSigners()
        const contracts = await deployProject({
            gnosis: deployer.address,
            stablecoin: fork ? Dai__factory.connect(USDT_ADDRESS, deployer) : undefined,
            whitelistManager: deployer.address,
            initialLiquidityBasisPoints: 100, // 1%
            referralRewardBasisPoints: 100, // 1%
            referredUserBonus: 10,
        })
        const {
            stablecoin,
            whitelist,
            router,
            tokenConverter,
            realEstateToken,
            allocator,
            liquidityInitializer,
            factory,
            tokenDatabase,
        } = contracts

        const staking = await upgrades.deployProxy(
            await hre.ethers.getContractFactory('RyzeStaking', deployer),
            [
                deployer.address,
                whitelist.address,
                router.address,
                tokenConverter.address,
                realEstateToken.address,
                stablecoin.address,
            ],
            { kind: 'uups' },
        ) as RyzeStaking

        await Promise.all([
            whitelist.updateUserWhitelistStatus(deployer.address, true),

            stablecoin.approve(allocator.address, constants.MaxUint256),
            stablecoin.approve(liquidityInitializer.address, constants.MaxUint256),
        ])

        if (!loggedPairHash) {
            loggedPairHash = true

            console.log('PairHash:', await factory.PAIR_HASH())
        }

        return {
            ...contracts,
            allocatorHelper: new AllocatorHelper(allocator, tokenDatabase),
            dexHelpers: new DexHelpers(factory, router, stablecoin),
            staking,
        }
    }
}
