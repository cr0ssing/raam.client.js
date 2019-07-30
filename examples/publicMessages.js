const RAAM = require('../lib/raam')
const RAAMReader = require('../lib/raamReader')
const converter =  require("@iota/converter")
const iota = require('@iota/core').composeAPI({
    provider: 'https://nodes.devnet.iota.org'
});

(async () => {
    try {
        const seed = generateSeed()
        console.log("Seed:", seed)
        const raam = await RAAM.fromSeed(seed, {amount: 4, iota, security: 1})

        console.log("Generated RAAM channel. Constructing first message...")
        // creating message WITHOUT sending it so that we can read the address and subscribe to it beforehand
        const mt = raam.createPublicMessageTransfers('ONE', {mwm: 9})
        const address = mt.transfers[0].address

        let cr
        // This part can also be run in an independent nodejs instance
        console.log('Subscribe to first message\'s address...')
        const sub = RAAMReader.subscribePublic(address, (error, index, message, skipped, nextRoot, channelRoot) => {
            if (error) {
                console.error(error)
            } else {
                console.log(`Message ${index}: ${message}`)
                if (index === 0) {
                    cr = channelRoot
                    console.log('Extracted channelRoot:', converter.trytes(channelRoot))
                }
            }
        }, {serverURL: 'tcp://zmq.devnet.iota.org:5556', subscribeFollowing: true})

        await raam.publishMessageTransfers(mt.transfers, {mwm: 9, message: mt.message})
        console.log('Published message 0 on', address)

        const messages = ["TWO", "THREE", "FOUR"]
        for (let i = 0; i < 3; i++) {
            const t = await raam.publishPublic(messages[i], {mwm: 9})
            console.log(`Pushlished message ${i + 1} on ${t[0].address}`)
        }

        //wait short time so that last message can be retrieved
        setTimeout(() => sub.unsubscribe(), 1000)

        console.log('Getting messages again with extracted channel root:')
        const reader = new RAAMReader(raam.channelRoot, {iota})
        const response = await reader.fetchPublic({end: 3})
        console.log("Messages:", response.messages)
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