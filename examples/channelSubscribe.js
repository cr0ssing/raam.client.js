const RAAM = require('../lib/raam')
const RAAMReader = require('../lib/raamReader')
const iota = require('@iota/core').composeAPI({
    provider: 'https://nodes.devnet.iota.org'
});

(async () => {
    try {
        const seed = generateSeed()
        console.log("Seed:", seed)
        const raam = await RAAM.fromSeed(seed, {amount: 4, iota, security: 1})

        console.log("Generated RAAM channel. Subscribing...")

        // This part can also be run in an independent nodejs instance
        const reader = new RAAMReader(raam.channelRoot)
        const sub = reader.subscribe((error, index, message) => {
            if (error) {
                console.error(error)
            } else {
                console.log(`Message ${index}: ${message}`)
            }
        }, {serverURL: 'tcp://zmq.devnet.iota.org:5556', subscribeFollowing: true})

        const messages = ["ONE", "TWO", "THREE", "FOUR"]
        console.log("Publishing 4 messages...")
        for (let i = 0; i < 4; i++) {
            await raam.publish(messages[i], {mwm: 9})
            console.log("Pushlished message", i)
        }

        //wait short time so that last message can be retrieved
        setTimeout(() => sub.unsubscribe(), 1000)
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