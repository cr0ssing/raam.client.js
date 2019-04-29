const RAAM = require('../lib/raam')
const converter =  require("@iota/converter")
const RAAMReader = require('../lib/raamReader')
const iota = require('@iota/core').composeAPI({
    provider: 'https://nodes.devnet.iota.org'
});

(async () => {
    try {
        const messagePasswords = ["KUCHEN", "MEHRKUCHEN", "NOCHMEHRKUCHEN"]
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
            },
            messagePasswords
        })
        errors.forEach(e => console.error(e))
        console.log("Cursor:", raam.cursor)
        console.log("Messages:", messages)

        console.log("Publishing 2 messages...")
        console.log("Bundle 1:", (await raam.publish("HELLOIOTA", {messagePassword: messagePasswords[0]}))[0].bundle)
        const {channelRoot: nextRoot} = await RAAM.fromSeed(generateSeed(), {security: 1, height: 2})
        console.log("Bundle 2:", (await raam.publish("", {index: 3, messagePassword: messagePasswords[2], nextRoot}))[0].bundle)

        let response = await raam.fetch({end: 3, messagePasswords})
        console.log("Messages:", response.messages)
        response.errors.forEach(e => console.error(e))
        response.skipped.forEach(s => console.error(s))
        
        const branch = new RAAMReader(response.branches[3], {iota})
        console.log("Branch security:", branch.security)
        response = await branch.syncChannel()
        console.log("Branch messages:", response.messages)

        const reader = new RAAMReader(raam.channelRoot, {iota, channelPassword: "PASSWORD"})
        // fetching will stop after index 1 because it is empty and reader has no locally stored messages
        // messages will be empty
        response = await reader.fetch({start: 1, messagePasswords})
        console.log("Messages:", response.messages)
        response.errors.forEach(e => console.error(e))
        response.skipped.forEach(s => console.error(s))

        console.log("Bundle 3:", (await raam.publish("SECONDMESSAGE", {index: 1, messagePassword: messagePasswords[1]}))[0].bundle)

        response = await reader.fetch({index: 1, messagePasswords})
        console.log("Message:", response.messages)
        response.errors.forEach(e => console.error(e))
        response.skipped.forEach(s => console.error(s))
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