import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import hre from 'hardhat'
import { isContract } from './is-contract'
import { GnosisSafe, GnosisSafeProxyFactory__factory, GnosisSafe__factory } from '../types'
import { Storage, StorageType } from 'hardhat-vanity'
import { constants, ethers } from 'ethers'

const FACTORY_ADDRESS = '0xa6b71e26c5e0845f74c812102ca7114b6a896ab2'
const IMPLEMENTATION_ADDRESS = '0xd9db270c1b5e3bd161e8c8503c55ceabee709552'

export class GnosisDeployer {
    public static async deployProxy(
        salt: string,
        owners: string[],
        threshold: number,
        signer: SignerWithAddress,
    ): Promise<GnosisSafe> {
        const factory = await GnosisSafeProxyFactory__factory.connect(
            FACTORY_ADDRESS,
            signer,
        )

        await (
            await factory.createProxyWithNonce(
                IMPLEMENTATION_ADDRESS,
                this._getInitializer(owners, threshold),
                salt,
            )
        ).wait(1)

        const proxy = GnosisSafe__factory.connect(
            await GnosisDeployer.calculateGnosisProxyAddress(salt, owners, threshold),
            signer,
        )

        await Storage.save({ type: StorageType.ADDRESS, name: 'GnosisSafe', value: proxy.address })

        return proxy
    }

    public static async calculateGnosisProxyAddress(
        saltString: string,
        owners: string[],
        threshold: number,
    ) {
        if (!await isContract(FACTORY_ADDRESS))
            throw new Error('Gnosis factory not available')

        const factory = GnosisSafeProxyFactory__factory.connect(
            FACTORY_ADDRESS,
            hre.ethers.provider,
        )

        const deploymentCode = ethers.utils.solidityPack(
            ['bytes', 'uint256'],
            [await factory.proxyCreationCode(), IMPLEMENTATION_ADDRESS],
        )

        const salt = ethers.utils.solidityKeccak256(
            ['bytes', 'uint256'],
            [
                ethers.utils.solidityKeccak256(
                    ['bytes'],
                    [this._getInitializer(owners, threshold)],
                ),
                saltString,
            ],
        )

        return ethers.utils.getCreate2Address(
            factory.address,
            salt,
            ethers.utils.keccak256(deploymentCode),
        )
    }

    private static _getInitializer(
        owners: string[],
        threshold: number,
    ) {
        return new GnosisSafe__factory().interface.encodeFunctionData(
            'setup',
            [
                owners,
                threshold,
                constants.AddressZero,
                constants.HashZero,
                constants.AddressZero,
                constants.AddressZero,
                0,
                constants.AddressZero,
            ],
        )
    }
}
