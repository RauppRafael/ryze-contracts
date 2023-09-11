import { GnosisDeployer } from '../helpers/GnosisDeployer'
import { deployProject } from '../helpers/deploy-project'
import hre from 'hardhat'
import { isContract } from '../helpers/is-contract'
import { Dai__factory, WrappedEther__factory } from '../types'
import { Hardhat, Storage, StorageType } from 'hardhat-vanity'

// TODO update weth and dai addresses
const WETH_ADDR = '0x1d308089a2d1ced3f1ce36b1fcaf815b07217be3'
const DAI_ADDR = '0xd74cab1b45aa372b0bbb7dcb9054cf4e24b58d23'

;(async () => {
    const signer = await Hardhat.mainSigner()
    const owner = process.env.OWNER_ADDRESS // TODO update owner address
    const whitelistManager = process.env.WHITELIST_MANAGER // TODO update manager address
    const weth = WrappedEther__factory.connect(WETH_ADDR, hre.ethers.provider)
    const dai = Dai__factory.connect(DAI_ADDR, hre.ethers.provider)

    const nonce = await signer.getTransactionCount()
    const salt = process.env.STARTS_WITH

    if (nonce !== 0)
        throw new Error('Signer not virgin')

    if (!owner)
        throw new Error('Missing OWNER_ADDRESS env')

    if (!whitelistManager)
        throw new Error('Missing WHITELIST_MANAGER env')

    if (!salt)
        throw new Error('Missing STARTS_WITH env')

    await Storage.save({ type: StorageType.ADDRESS, name: 'WrappedEther', value: WETH_ADDR })
    await Storage.save({ type: StorageType.ADDRESS, name: 'Dai', value: DAI_ADDR })

    const gnosisSalt = `0x${ salt.repeat(5) }`

    const gnosisSafeAddress = await GnosisDeployer
        .calculateGnosisProxyAddress(gnosisSalt, [owner], 1)

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
        gnosis: gnosisSafeAddress,
        whitelistManager,
        weth,
        dai,
        initialLiquidityBasisPoints: 1_000,
        referralRewardBasisPoints: 100,
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

    if (!await isContract(gnosisSafeAddress)) {
        await GnosisDeployer.deployProxy(
            gnosisSalt,
            [owner],
            1,
            signer,
        )
    }
})()
