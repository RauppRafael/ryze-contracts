import axios from 'axios'
import hre from 'hardhat'
import {
    Dai__factory,
    RyzeFactory__factory,
    RyzeRouter__factory,
} from '../types'
import { Hardhat, Storage, StorageType } from 'hardhat-vanity'
import { TESTNET, network } from '../helpers/chain.info'
import { getDeadline, sendTransaction } from '../helpers/hardhat'

(async () => {
    const signer = await Hardhat.mainSigner()
    const wethAddress = await Storage.findAddress('WrappedEther')
    const daiAddress = await Storage.findAddress('Dai')
    const routerAddress = await Storage.findAddress('RyzeRouter')
    const factoryAddress = await Storage.findAddress('RyzeFactory')

    if (!wethAddress || !daiAddress || !routerAddress || !factoryAddress)
        throw new Error('Address not found')

    const dai = Dai__factory.connect(daiAddress, signer)
    const router = RyzeRouter__factory.connect(routerAddress, signer)
    const factory = RyzeFactory__factory.connect(factoryAddress, signer)

    const ethPrice: number = (await axios('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')).data.ethereum.usd

    if (network === TESTNET)
        await sendTransaction(dai.mint(signer.address, Hardhat.parseEther(15_000_000)))

    await sendTransaction(dai.approve(router.address, hre.ethers.constants.MaxUint256))

    await sendTransaction(
        router.addLiquidityETH(
            dai.address,
            Hardhat.parseEther(ethPrice),
            0,
            0,
            signer.address,
            await getDeadline(),
            { value: Hardhat.parseEther(1) },
        ),
    )

    const pairAddress = await factory.getPair(dai.address, wethAddress)

    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'EthDaiPair',
        value: pairAddress,
    })

    await hre.run('verify:verify', {
        address: pairAddress,
        constructorArguments: [],
    })

    console.log('Liquidity added')
})()
