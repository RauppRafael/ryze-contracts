import { RyzeFactory__factory } from '../types'
import { Storage } from 'hardhat-vanity'
import hre from 'hardhat'

async function getOwner(name: string) {
    const address = await Storage.findAddress(name)

    if (!address)
        throw new Error(`${ name } address not found`)

    try {
        const contract = RyzeFactory__factory.connect(address, hre.ethers.provider)

        return (await contract.owner()).toLowerCase()
    }
    catch (e) {
        console.log(`${ name } has failed validation`)

        throw e
    }
}

(async () => {
    let gnosisSafeAddress = await Storage.findAddress('GnosisSafe')

    if (gnosisSafeAddress)
        gnosisSafeAddress = gnosisSafeAddress.toLowerCase()

    else
        throw new Error('Gnosis address not found')

    await Promise.all([
        'RyzeFactory',

        'RyzeAllocationRewardToken',
        'RyzeAllocationToken',
        'RyzeRealEstateToken',

        'RyzeAllocator',
        'RyzeTokenDatabase',
        'RyzeTokenConverter',
        'RyzeLiquidityInitializer',
        'RyzeWhitelist',
    ].map(async (name: string) => {
        const owner = await getOwner(name)
        const validOwner = owner === gnosisSafeAddress

        if (!validOwner)
            throw new Error(`Incorrect owner of ${ name } | expected: ${ gnosisSafeAddress } | got: ${ owner }`)

        return validOwner
    }))

    console.log('Deploy ownership validated')
})()
