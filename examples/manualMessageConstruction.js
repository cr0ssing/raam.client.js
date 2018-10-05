const converter =  require("@iota/converter") //require("iota.lib.js/lib/crypto/converter/converter")
const merkle = require('../lib/merkle')
const sign = require('../lib/sign')
const sender = require('../lib/message')
const file = require('../lib/file')
const {intToTrytes, padTritsMultipleOf, digest} = require('../lib/helpers')
const fs = require('fs')
const iota = require('@iota/core').composeAPI({
    provider: 'https://nodes.devnet.iota.org'
});

(async () => {
    try {
        const channelPassword = ""
        const seed = generateSeed().concat(channelPassword)
        console.log("Seed:", seed)
        
        console.log("Creating Merkle tree...")
        let generated = 0
        const callback = file.getFileWriter("tree.json")
        const h = 3
        const security = 1
        /*const {root: merkleRoot, leafs, hashes} =*/ await merkle.createTree(seed, h, {
            security, 
            progressCallback: (leafs, hashes) => {
                generated += leafs.length
                console.log(`${Math.floor((generated / Math.pow(2, h)) * 10000) / 100}% complete`)
                callback(leafs, hashes)
            }
        })

        console.log("Read built tree from file...")
        const {merkleRoot, leafs, hashes, height} = file.readFile("tree.json")
        fs.unlinkSync("tree.json")
        
        console.log("Tree hashes:")
        console.log(hashes.map(a => a.map(e => converter.trytes(e.hash).slice(0, 81) + "...")))

        // Creating message
        const text = converter.asciiToTrytes("Hello IOTA! This is a test message to show quantum-proof random access authenticated messaging :) Thanks to microhash for the initial idea!")
        const message = text
        const index = 7
        const authPath = merkle.getAuthPath(index, height)
        console.log("Auth path:", authPath)
        const authPathHashes = authPath.map((i, level) => hashes[level][i].hash)
        // await forge(merkleRoot, index, channelPassword)

        const {private: signingKey, public: verifyingKey} = leafs[index]
        console.log(`Using ${index}th message to sign message '${message.slice(0, 81)}'...`)

        const nextRoot = converter.trits("G".repeat(81))

        const d = digest(message, index, authPathHashes, verifyingKey, nextRoot)
        const sig = sign.createSignature(signingKey, d)
        
        console.log("Verified:", verify(merkleRoot, sig, message, verifyingKey, index, authPathHashes, nextRoot))

        console.log("Publishing message...")
        const {bundle} = await sender.sendMessage(iota, merkleRoot, message, sig, index, verifyingKey, authPathHashes, {channelPassword, nextRoot})
        console.log("Bundle:", bundle[0].bundle)

        console.log("Getting message...")
        const {message: tangleMessage, skipped} = await sender.getMessage(iota, merkleRoot, index, {channelPassword, height, security})
        skipped.forEach(e => console.error(`Bundle ${e.bundle} -`, e.error))
        console.log({
            index: tangleMessage.index,
            signature: converter.trytes(tangleMessage.signature).slice(0, 81) + "...",
            message: converter.trytesToAscii(tangleMessage.message).slice(0, 243) + "...",
            authPathHashes: tangleMessage.authPathHashes.map(h => converter.trytes(h).slice(0, 81) + "..."),
            verifyingKey: converter.trytes(tangleMessage.verifyingKey).slice(0, 81) + "...",
            nextRoot: converter.trytes(tangleMessage.nextRoot).slice(0, 81) + "..."
        })

        // Verifying message
        const tangleDigest = digest(tangleMessage.message, tangleMessage.index, tangleMessage.authPathHashes, tangleMessage.verifyingKey, tangleMessage.nextRoot)
        console.log("Signature valid:", converter.trytes(sig) == converter.trytes(tangleMessage.signature))
        console.log("Auth path valid:", authPathHashes
            .map((h, i) => converter.trytes(h) == converter.trytes(tangleMessage.authPathHashes[i]))
            .reduce((acc, v) => acc && v, true))
        console.log("Verifying key valid:", converter.trytes(verifyingKey) == converter.trytes(tangleMessage.verifyingKey))
        
        console.log("Message verified:", sign.verifyMessage(tangleMessage.signature, tangleDigest, tangleMessage.verifyingKey))
        console.log("Signature authenticated:", 
            merkle.verifyMerkleTree(merkleRoot, tangleMessage.verifyingKey, tangleMessage.index, tangleMessage.authPathHashes))
    } catch(err) {
        console.error(err)
    }
})();

async function forge(merkleRoot, index, password) {
    const indexTrits = converter.trits(intToTrytes(index))
    const add = require('@iota/signing/out/signing/src/add').default
    const Kerl = require('@iota/kerl').default

    let subroot = add(merkleRoot, indexTrits)
    const kerl = new Kerl()
    kerl.initialize()
    kerl.absorb(subroot, 0, subroot.length)
    if (password) {
        const padded = padTritsMultipleOf(Kerl.HASH_LENGTH, Kerl.HASH_LENGTH, password)
        kerl.absorb(padded, 0, padded.length)
    }
    const buffer = new Int8Array(Kerl.HASH_LENGTH)
    kerl.squeeze(buffer, 0, Kerl.HASH_LENGTH)
    const address = converter.trytes(buffer)

    const transfers = [{
        address,
        value: 0,
        message: 'SDFGHJBVCSRTZUJBVCSERTZHBVCD'
    }, {
        address,
        value: 0,
        message: 'ERTZHJNBVCSRTZHBVCRTHBVCDRTGHBV'
    }, {
        address,
        value: 0,
        message: 'WILLITBESKIPPED'
    }]
    const trytes = await iota.prepareTransfers("9".repeat(81), transfers)
    const bundle = await iota.sendTrytes(trytes, 3, 9)
    console.log("Forged bundle:", bundle[0].bundle)
}

function verify(merkleRoot, sig, message, verifyingKey, index, authPathHashes, nextRoot) {
    const sigDigest = digest(message, index, authPathHashes, verifyingKey, nextRoot)
    const verified = sign.verifyMessage(sig, sigDigest, verifyingKey)
    const authenticated = merkle.verifyMerkleTree(merkleRoot, verifyingKey, index, authPathHashes)
    return verified && authenticated
}

function generateSeed(length = 81) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ9";
    let retVal = [81];
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal[i] = charset.charAt(Math.floor(Math.random() * n));
    }
    let result = retVal.join("")
    return result;
}