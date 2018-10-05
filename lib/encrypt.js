const Kerl = require('@iota/kerl').default
const converter = require('@iota/converter')
const pad = require("@iota/pad")

function trinarySum(a, b) {
    const result = a + b
    return result == 2 ? -1 : result == -2 ? 1 : result
}

function encrypt(message, key, salt) {
    const kerl = new Kerl()
    const padded = pad.padTrits(Kerl.HASH_LENGTH)(converter.trits(key))
    kerl.initialize()
    kerl.absorb(padded, 0, padded.length)
    if (salt != null) {
        const paddedSalt = pad.padTrits(Kerl.HASH_LENGTH)(converter.trits(salt))
        kerl.absorb(paddedSalt, 0, paddedSalt.length)
    }
    const intermediateKey = new Int8Array(Kerl.HASH_LENGTH)
    return message
        .match(/.{1,81}/g)
        .map(m => {
            kerl.squeeze(intermediateKey, 0, Kerl.HASH_LENGTH)
            const sum = converter.trits(m)
                .map((t, i) => trinarySum(t, intermediateKey[i]))
            return converter.trytes(sum)
        })
        .join('')
}

function decrypt(message, key, salt) {
    const kerl = new Kerl()
    kerl.initialize()
    const padded = pad.padTrits(Kerl.HASH_LENGTH)(converter.trits(key))
    kerl.absorb(padded, 0, padded.length)
    if (salt != null) {
        const paddedSalt = pad.padTrits(Kerl.HASH_LENGTH)(converter.trits(salt))
        kerl.absorb(paddedSalt, 0, paddedSalt.length)
    }
    const intermediateKey = new Int8Array(Kerl.HASH_LENGTH)
    return message
        .match(/.{1,81}/g)
        .map(m => {
            kerl.squeeze(intermediateKey, 0, Kerl.HASH_LENGTH)
            const trits = converter.trits(m)
                .map((t, i) => trinarySum(t, -intermediateKey[i]))
            return converter.trytes(trits)
        })
        .join('')
}

module.exports = {
    encrypt,
    decrypt
}