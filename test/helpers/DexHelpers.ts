import { Hardhat } from 'hardhat-vanity'
import { Permit } from '@ryze-blockchain/shared'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, Contract } from 'ethers'
import { Dai, RyzeFactory, RyzePair__factory, RyzeRouter } from '../../types'
import { getChainId, getDeadline } from '../../helpers/hardhat'

const approveIfNeeded = async (token: Contract, owner: SignerWithAddress, spender: Contract, amount: BigNumber) => {
    if (amount.gt(await token.allowance(owner.address, spender.address)))
        await token.connect(owner).approve(spender.address, amount)
}

export class DexHelpers {
    factory: RyzeFactory
    router: RyzeRouter
    dai: Dai

    constructor(factory: RyzeFactory, router: RyzeRouter, dai: Dai) {
        this.factory = factory
        this.router = router
        this.dai = dai
    }

    async getPair(token: Contract) {
        return RyzePair__factory.connect(
            await this.factory.getPair(token.address, this.dai.address),
            await Hardhat.mainSigner(),
        )
    }

    async addLiquidity(
        tokenA: Contract,
        tokenB: Contract,
        amountA: number,
        amountB: number,
        slippage: number,
    ) {
        const ethAmountA = Hardhat.parseEther(amountA)
        const ethAmountB = Hardhat.parseEther(amountB)
        const signer = await Hardhat.mainSigner()

        await approveIfNeeded(tokenA, signer, this.router, ethAmountA)
        await approveIfNeeded(tokenB, signer, this.router, ethAmountB)

        await this.router.addLiquidity(
            tokenA.address,
            tokenB.address,
            ethAmountA,
            ethAmountB,
            Hardhat.parseEther(amountA - amountA * slippage),
            Hardhat.parseEther(amountB - amountB * slippage),
            signer.address,
            await getDeadline(),
        )
    }

    async removeLiquidity(token: Contract, amount: number) {
        const signer = await Hardhat.mainSigner()

        await approveIfNeeded(await this.getPair(token), signer, this.router, Hardhat.parseEther(amount))

        await this.router.removeLiquidity(
            token.address,
            this.dai.address,
            Hardhat.parseEther(amount),
            0,
            0,
            signer.address,
            await getDeadline(),
        )
    }

    async removeLiquidityWithPermit(token: Contract, amount: BigNumber) {
        const signer = await Hardhat.mainSigner()
        const pair = await this.getPair(token)

        const signature = await Permit.ERC2612(
            await getChainId(),
            signer,
            pair.address,
            this.router.address,
        )

        await this.router.removeLiquidityWithPermit(
            token.address,
            this.dai.address,
            amount,
            0,
            0,
            signer.address,
            signature.deadline,
            true,
            signature.v,
            signature.r,
            signature.s,
        )
    }

    async swap(
        inputToken: Contract,
        outputToken: Contract,
        amountIn: BigNumber,
        amountOutMin: BigNumber,
        signer?: SignerWithAddress,
    ) {
        if (!signer)
            signer = await Hardhat.mainSigner()

        await approveIfNeeded(inputToken, signer, this.router, amountIn)

        return this.router.connect(signer).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            [inputToken.address, outputToken.address],
            signer.address,
            await getDeadline(),
        )
    }
}
