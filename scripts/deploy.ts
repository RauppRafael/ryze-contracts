import { deployProject } from '../helpers/deploy-project'
import hre from 'hardhat'
import { Dai__factory, WrappedEther__factory } from '../types'
import { Hardhat, Storage, StorageType } from 'hardhat-vanity'

const WETH_ADDR = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'
const STABLECOIN_ADDR = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const GNOSIS_SAFE_ADDR = '0xcD6E9Cba3851F2859304Ae85b2b62fa344758c1D'

;(async () => {
    const signer = await Hardhat.mainSigner()
    const whitelistManager = process.env.WHITELIST_MANAGER
    const weth = WrappedEther__factory.connect(WETH_ADDR, hre.ethers.provider)
    const stablecoin = Dai__factory.connect(STABLECOIN_ADDR, hre.ethers.provider)

    const nonce = await signer.getTransactionCount()
    const salt = process.env.STARTS_WITH

    if (nonce !== 0)
        throw new Error('Signer not virgin')

    if (!whitelistManager)
        throw new Error('Missing WHITELIST_MANAGER env')

    if (!salt)
        throw new Error('Missing STARTS_WITH env')

    await Storage.save({ type: StorageType.ADDRESS, name: 'GnosisSafe', value: GNOSIS_SAFE_ADDR })
    await Storage.save({ type: StorageType.ADDRESS, name: 'WrappedEther', value: WETH_ADDR })
    await Storage.save({ type: StorageType.ADDRESS, name: 'Stablecoin', value: STABLECOIN_ADDR })

    const {
        projectDeployer,
        factory,
        router,
        allocationRewardToken,
        allocationToken,
        realEstateToken,
        allocator,
        tokenConverter,
        liquidityInitializer,
        tokenDatabase,
        whitelist,
    } = await deployProject({
        gnosis: GNOSIS_SAFE_ADDR,
        whitelistManager,
        weth,
        stablecoin,
        initialLiquidityBasisPoints: 1_000, // 10%
        referralRewardBasisPoints: 150, // 1.5%
        referredUserBonus: 10,
        vanity: true,
        confirmations: 5,
    })

    await Storage.save({ type: StorageType.ADDRESS, name: 'RyzeFactory', value: factory.address })
    await Storage.save({ type: StorageType.ADDRESS, name: 'RyzeRouter', value: router.address })

    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'RyzeAllocationRewardToken',
        value: allocationRewardToken.address,
    })
    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'RyzeAllocationToken',
        value: allocationToken.address,
    })
    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'RyzeRealEstateToken',
        value: realEstateToken.address,
    })

    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'RyzeAllocator',
        value: allocator.address,
    })
    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'RyzeTokenDatabase',
        value: tokenDatabase.address,
    })
    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'RyzeTokenConverter',
        value: tokenConverter.address,
    })
    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'RyzeLiquidityInitializer',
        value: liquidityInitializer.address,
    })
    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'RyzeWhitelist',
        value: whitelist.address,
    })

    await hre.run('verify:verify', {
        address: projectDeployer.address,
        constructorArguments: [],
    })

    const tokenImplementation = await projectDeployer.tokenImplementation()
    const tokenContracts = [
        'allocationRewardToken',
        'allocationToken',
        'realEstateToken',
    ] as const

    await hre.run('verify:verify', {
        address: tokenImplementation,
        constructorArguments: [],
    })

    for (const contract of tokenContracts) {
        const contractAddresses = await projectDeployer[contract]()

        await hre.run('verify:verify', {
            address: contractAddresses,
            constructorArguments: [
                tokenImplementation,
                '0x',
            ],
        })
    }

    const dexContracts = [
        'factory',
        'router',
    ] as const

    for (const contract of dexContracts) {
        await hre.run('verify:verify', {
            address: await projectDeployer[contract](),
            constructorArguments: [],
        })
    }

    const projectContracts = [
        'whitelist',
        'tokenDatabase',
        'tokenConverter',
        'allocator',
        'liquidityInitializer',
    ] as const

    for (const contract of projectContracts) {
        const addresses = await projectDeployer[contract]()

        await hre.run('verify:verify', {
            address: addresses.implementation,
            constructorArguments: [],
        })

        await hre.run('verify:verify', {
            address: addresses.proxy,
            constructorArguments: [
                tokenImplementation,
                '0x',
            ],
        })
    }
})()
