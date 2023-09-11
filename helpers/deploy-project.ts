import { constants } from 'ethers'
import { getChainId } from './hardhat'
import hre from 'hardhat'
import {
    Dai,
    Dai__factory,
    ProjectDeployer__factory,
    RyzeAllocator__factory,
    RyzeFactory__factory,
    RyzeLiquidityInitializer__factory,
    RyzeRouter__factory,
    RyzeTokenConverter__factory,
    RyzeTokenDatabase__factory,
    RyzeToken__factory,
    RyzeWhitelist__factory,
    WrappedEther,
    WrappedEther__factory,
} from '../types'
import { Salt, VanityDeployer } from 'hardhat-vanity'

let hashCount = 0

export const deployProject = async ({
    gnosis,
    whitelistManager,
    weth,
    dai,
    initialLiquidityBasisPoints,
    referralRewardBasisPoints,
    vanity,
    confirmations = 1,
}: {
    gnosis: string
    whitelistManager: string
    weth?: WrappedEther
    dai?: Dai
    initialLiquidityBasisPoints: number
    referralRewardBasisPoints: number
    vanity?: boolean
    confirmations?: number
}) => {
    const [deployer] = await hre.ethers.getSigners()
    const projectDeployer = await new ProjectDeployer__factory(deployer).deploy()

    const vanityDeployer = new VanityDeployer({
        startsWith: process.env.STARTS_WITH,
        endsWith: process.env.ENDS_WITH,
    })
    const saltBuilder = new Salt(
        vanityDeployer.matcher,
        projectDeployer.address,
    )

    function getTestHash() {
        hashCount++

        return constants.HashZero.replace('0x0', `0x${ hashCount }`).substring(0, 66)
    }

    function getImplementationHash(contract: string) {
        if (!vanity)
            return getTestHash()

        return saltBuilder.getImplementationSalt(
            contract,
            { saveAs: contract + 'Implementation' },
        )
    }

    async function getProxyHash(contract: string, implementationSalt: string, saveAs?: string) {
        if (!vanity)
            return getTestHash()

        const implementation = saltBuilder.computeAddress(
            (await hre.ethers.getContractFactory(contract)).bytecode,
            implementationSalt,
        )

        return saltBuilder.getProxySalt(contract, implementation, { saveAs })
    }

    async function getImplementationAndProxySalt(contract: string) {
        const implementationSalt = await getImplementationHash(contract)

        return {
            implementation: implementationSalt,
            proxy: await getProxyHash(contract, implementationSalt),
        }
    }

    await projectDeployer.deployTransaction.wait(confirmations)

    if (!weth) {
        weth = await new WrappedEther__factory(deployer).deploy()

        await weth.deployTransaction.wait(confirmations)
    }

    if (!dai) {
        dai = await new Dai__factory(deployer).deploy(await getChainId())

        await dai.deployTransaction.wait(confirmations)
    }

    const factorySalt = await getImplementationHash('RyzeFactory')
    const routerSalt = await getImplementationHash('RyzeRouter')

    const tokenSalt = await getImplementationHash('RyzeToken')
    const allocationRewardTokenSalt = await getProxyHash('RyzeToken', tokenSalt, 'AllocationRewardToken')
    const allocationTokenSalt = await getProxyHash('RyzeToken', tokenSalt, 'AllocationToken')
    const realEstateTokenSalt = await getProxyHash('RyzeToken', tokenSalt, 'RealEstateToken')

    const whitelistSalt = await getImplementationAndProxySalt('RyzeWhitelist')
    const tokenDatabaseSalt = await getImplementationAndProxySalt('RyzeTokenDatabase')
    const tokenConverterSalt = await getImplementationAndProxySalt('RyzeTokenConverter')
    const liquidityInitializerSalt = await getImplementationAndProxySalt('RyzeLiquidityInitializer')
    const allocatorSalt = await getImplementationAndProxySalt('RyzeAllocator')

    ;(await projectDeployer.deployDex(
        gnosis,
        weth.address,
        {
            code: RyzeFactory__factory.bytecode,
            salt: factorySalt,
        },
        {
            code: RyzeRouter__factory.bytecode,
            salt: routerSalt,
        },
    )).wait(confirmations)

    ;(await projectDeployer.deployTokens(
        gnosis,
        {
            allocationRewardTokenSalt,
            allocationTokenSalt,
            realEstateTokenSalt,
            implementation: {
                code: RyzeToken__factory.bytecode,
                salt: tokenSalt,
            },
        },
    )).wait(confirmations)

    ;(await projectDeployer.deployProject(
        gnosis,
        whitelistManager,
        dai.address,
        initialLiquidityBasisPoints,
        referralRewardBasisPoints,
        {
            whitelist: {
                code: RyzeWhitelist__factory.bytecode,
                implementationSalt: whitelistSalt.implementation,
                proxySalt: whitelistSalt.proxy,
            },
            tokenDatabase: {
                code: RyzeTokenDatabase__factory.bytecode,
                implementationSalt: tokenDatabaseSalt.implementation,
                proxySalt: tokenDatabaseSalt.proxy,
            },
            tokenConverter: {
                code: RyzeTokenConverter__factory.bytecode,
                implementationSalt: tokenConverterSalt.implementation,
                proxySalt: tokenConverterSalt.proxy,
            },
            liquidityInitializer: {
                code: RyzeLiquidityInitializer__factory.bytecode,
                implementationSalt: liquidityInitializerSalt.implementation,
                proxySalt: liquidityInitializerSalt.proxy,
            },
            allocator: {
                code: RyzeAllocator__factory.bytecode,
                implementationSalt: allocatorSalt.implementation,
                proxySalt: allocatorSalt.proxy,
            },
        },
    )).wait(confirmations)

    const [
        allocationToken,
        allocationRewardToken,
        realEstateToken,

        factory,
        router,

        allocator,
        tokenConverter,
        liquidityInitializer,
        tokenDatabase,
        whitelist,
    ] = await Promise.all([
        projectDeployer.allocationToken().then(addr => RyzeToken__factory.connect(addr, deployer)),
        projectDeployer.allocationRewardToken().then(addr => RyzeToken__factory.connect(addr, deployer)),
        projectDeployer.realEstateToken().then(addr => RyzeToken__factory.connect(addr, deployer)),

        projectDeployer.factory().then(addr => RyzeFactory__factory.connect(addr, deployer)),
        projectDeployer.router().then(addr => RyzeRouter__factory.connect(addr, deployer)),

        projectDeployer.allocator().then(addr => RyzeAllocator__factory.connect(addr.proxy, deployer)),
        projectDeployer.tokenConverter().then(addr => RyzeTokenConverter__factory.connect(addr.proxy, deployer)),
        projectDeployer.liquidityInitializer().then(addr => RyzeLiquidityInitializer__factory.connect(addr.proxy, deployer)),
        projectDeployer.tokenDatabase().then(addr => RyzeTokenDatabase__factory.connect(addr.proxy, deployer)),
        projectDeployer.whitelist().then(addr => RyzeWhitelist__factory.connect(addr.proxy, deployer)),
    ])

    return {
        projectDeployer,
        dai,
        weth,
        allocationToken,
        allocationRewardToken,
        allocator,
        tokenConverter,
        realEstateToken,
        liquidityInitializer,
        factory,
        router,
        tokenDatabase,
        whitelist,
    }
}
