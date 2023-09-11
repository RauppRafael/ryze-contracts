import { BigNumber } from 'ethers'

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Chai {
        interface Assertion {
            almost(target: BigNumber, tolerancePercentage: number): Assertion;
        }
    }
}

export const almost = (chai: Chai.ChaiStatic) => chai.Assertion.addMethod(
    'almost',
    function (target: BigNumber, tolerancePercentage: number) {
        const actualValue: number | BigNumber = this._obj
        const tolerance = target.mul(tolerancePercentage * 1e9).div(1e9).div(100)
        const min = target.sub(tolerance)
        const max = target.add(tolerance)

        if (min.gt(actualValue) || max.lt(actualValue)) {
            throw new Error(
                `Expected "${ actualValue }" to be close to "${ target }" with a ${ tolerancePercentage }% tolerance`,
            )
        }
    },
)
