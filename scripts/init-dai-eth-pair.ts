import axios from 'axios'
import { utils } from 'ethers'
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
    const stablecoinAddress = await Storage.findAddress('Stablecoin')
    const routerAddress = await Storage.findAddress('RyzeRouter')
    const factoryAddress = await Storage.findAddress('RyzeFactory')

    if (!wethAddress || !stablecoinAddress || !routerAddress || !factoryAddress)
        throw new Error('Address not found')

    const stablecoin = Dai__factory.connect(stablecoinAddress, signer)
    const router = RyzeRouter__factory.connect(routerAddress, signer)
    const factory = RyzeFactory__factory.connect(factoryAddress, signer)

    const ethPrice: number = (await axios('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')).data.ethereum.usd
    const stablecoinDecimals = await stablecoin.decimals()

    if (network === TESTNET)
        await sendTransaction(
            stablecoin.mint(
                signer.address,
                utils.parseUnits((15_000_000).toString(), stablecoinDecimals),
            ),
        )

    await sendTransaction(stablecoin.approve(router.address, hre.ethers.constants.MaxUint256))

    const amountEth = Hardhat.parseEther(0.05)
    const amountStable = utils.parseUnits(ethPrice.toString(), stablecoinDecimals).div(1 / 0.05)

    await sendTransaction(
        router.addLiquidityETH(
            stablecoin.address,
            amountStable,
            amountStable.sub(amountStable.mul(3).div(100)),
            amountEth.sub(amountEth.mul(3).div(100)),
            signer.address,
            await getDeadline(),
            { value: amountEth },
        ),
    )

    const pairAddress = await factory.getPair(stablecoin.address, wethAddress)

    await Storage.save({
        type: StorageType.ADDRESS,
        name: 'EthStablecoinPair',
        value: pairAddress,
    })

    await hre.run('verify:verify', {
        address: pairAddress,
        constructorArguments: [],
    })

    console.log('Liquidity added')
})()
