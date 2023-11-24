import { Storage, StorageType } from 'hardhat-vanity'

interface ITableItem {
    name: string
    proxy?: string
    implementation?: string
}

const PROXY = 'Proxy'
// const explorer = 'https://testnet.snowtrace.io/address/'
const explorer = 'https://arbiscan.io/address/'
const paddingLength = explorer.length + 42 + 42 + 6

const formatAddress = (address?: string) => {
    return address
        ? `[\`${ address }\`](${ explorer + address })`
        : `${ (address || '-').padEnd(paddingLength, ' ') }`
}

;(async () => {
    const addresses: { [address: string]: string } = await Storage.all({ type: StorageType.ADDRESS })
    const table: { [name: string]: ITableItem } = {}
    let nameLength = 0

    for (const [name, address] of Object.entries(addresses)) {
        const sanitizedName = name.replace(PROXY, '')
        const item = table[sanitizedName]
        const isProxy = name.includes(PROXY)

        if(sanitizedName.length > nameLength)
            nameLength = sanitizedName.length

        if (item) {
            if (isProxy)
                item.proxy = address
            else
                item.implementation = address

            continue
        }

        table[sanitizedName] = isProxy
            ? { name: sanitizedName, proxy: address }
            : { name: sanitizedName, implementation: address }
    }

    console.log(`| ${ 'Name'.padEnd(nameLength + 2, ' ') } | ${ 'Address'.padEnd(paddingLength, ' ') } | `)
    console.log(`|${ '-'.padEnd(nameLength + 2 + 2, '-') }|${ '-'.padEnd(paddingLength + 2, '-') }| `)

    for (const { name, implementation } of Object.values(table))
        console.log(`| ${ name.padEnd(nameLength + 2, ' ') } | ${ formatAddress(implementation) } | `)
})()
