const RAAM = require('../lib/raam')
const prettify = require('../lib/helpers').prettify
const RAAMReader = require('../lib/raamReader')
const converter =  require("@iota/converter")
const iota = require('@iota/core').composeAPI({
    provider: 'https://nodes.devnet.iota.org'
});

(async () => {
    try {
        const seed = generateSeed()
        console.log("Seed:", seed)
        const raam = await RAAM.fromSeed(seed, {amount: 4, iota, security: 2, channelPassword: "PASSWORD"})
        console.log("Channel root:", converter.trytes(raam.channelRoot))

        console.log("Generated RAAM channel. Reading channel...")
        const {messages, errors} = await raam.syncChannel({
            callback: (err, m) => {
                if (err) {
                    console.error(err)
                }
            }
        })
        errors.forEach(e => console.error(e))
        console.log("Cursor:", raam.cursor)
        console.log("Messages:", messages)

        console.log("Creating 2 messages...")
        const mt1 = raam.createMessageTransfers("HELLOIOTA")
        console.log("MessageTransfers 1:", {
            message: prettify(mt1.message), 
            transfers: mt1.transfers
        })
        const mt2 = raam.createMessageTransfers("", {index: 3})

        let response = await raam.fetch({end: 3})
        response.errors.forEach(e => console.error(e))
        console.log("Published Messages:", response.messages)

        console.log("Publishing created messages...")
        // if optional parameter message is passed, message is stored locally after publishing
        console.log("Bundle 1:", (await raam.publishMessageTransfers(mt1.transfers, {message: mt1.message}))[0].bundle)
        console.log("Bundle 2:", (await raam.publishMessageTransfers(mt2.transfers, {message: mt2.message}))[0].bundle)

        const reader = new RAAMReader(raam.channelRoot, {iota, channelPassword: "PASSWORD"})
        response = await reader.fetch({end: 3})
        response.errors.forEach(e => console.error(e))
        console.log("Messages:", response.messages)
    } catch(e) {
        console.error(e)
    }
})()

function generateSeed(length = 81) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ9";
    let retVal = [81];
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal[i] = charset.charAt(Math.floor(Math.random() * n));
    }
    let result = retVal.join("")
    return result;
}