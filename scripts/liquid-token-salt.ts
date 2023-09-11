import { Bytecode, CommandBuilder, Matcher, Storage } from 'hardhat-vanity'

// const id = 0
// const name = 'The Horizon View'
// const symbol = 'ryzeTHV' // 0x7be0ec7681637f2091b4b8142193f8534639fc82ac1fd2de948ee418a2706ca2
// const id = 1
// const name = 'Maple Grove'
// const symbol = 'ryzeMAG' // 0xbdde367acf43979394920dcc07b9b2a55a47342f327835d866ef21373060551b
const id = 2
const name = 'Milano Garden'
const symbol = 'ryzeMIL' // 0x1dbedd5873156f4944ce707c1c9976d119470b9f6c2c3037fd8aecda068c064e
// const id = 3
// const name = 'Moon Palace'
// const symbol = 'ryzeMOP'
// const id = 5
// const name = 'The Spot'
// const symbol = 'ryzeSPO'
// const id = 6
// const name = 'Doge Land'
// const symbol = 'ryzeDOGE'

const main = async () => {
    const contractName = 'RyzeLiquidToken'
    const tokenConverter = await Storage.findAddress('RyzeTokenConverter')
    const constructorArguments = [
        id,
        name,
        symbol,
    ]

    if (!tokenConverter)
        return console.log('Liquid token manager not deployed')

    await CommandBuilder.eradicate(
        tokenConverter,
        (await Bytecode.generate(contractName, { constructorArguments })).filename,
        new Matcher(process.env.STARTS_WITH, process.env.ENDS_WITH),
    )
}

main()
    .catch(error => console.error(error))
