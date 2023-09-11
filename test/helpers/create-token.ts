import { RyzeTokenDatabase } from '../../types'
import { constants } from 'ethers'

let id = 0

export const createToken = (
    tokenDatabase: RyzeTokenDatabase,
    maxSupply: number,
    salt: string = constants.HashZero,
) => {
    id ++

    return tokenDatabase.register('The Horizon View by Ryze', 'ryzeTHV' + id, salt, maxSupply)
}
