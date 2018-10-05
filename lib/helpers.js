const pad = require('@iota/pad')
const converter = require('@iota/converter')
const Kerl = require('@iota/kerl').default

function concat(...arrays) {
    const length = arrays.reduce((acc, array) => acc + array.length, 0)
    const result = new Int8Array(length)
    let index = 0
    arrays.forEach(a => {
        result.set(a, index)
        index += a.length
    })
    return result
}

function isTritsZero(trits) {
    for (let i = 0; i < trits.length; i++) {
        if (trits[i] != 0) {
            return false
        }
    }
    return true
}

const alphabet = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function intToTrytes(input) {
    if (input == 0) {
        return alphabet[0]
    }
    let v = input
    const result = []
    while (v > 0) {
        const b = v % 27
        v = Math.floor(v / 27)
        result.unshift(alphabet[b])
    }
    return result.reduce((acc, v) => acc.concat(v), "")
}

function trytesToInt(trytes) {
    let result = 0
    let factor = 1
    for (let i = trytes.length - 1; i >= 0; i--) {
        result += alphabet.indexOf(trytes[i]) * factor
        factor *= 27
    }
    return result
}

function padTritsMultipleOf(base, minLength, trits) {
    const length = trits.length <= minLength ? minLength : (Math.floor(trits.length / base) + 1) * base
    return pad.padTrits(length)(trits)
}

function padTrytesMultipleOf(base, minLength, trytes) {
    const length = trytes.length <= minLength ? minLength : Math.ceil(trytes.length / base) * base
    return pad.padTrytes(length)(trytes)
}

function hashTrytes(trytes, length = Kerl.HASH_LENGTH) {
    const trits = converter.trits(trytes)
    const kerl = new Kerl()
    kerl.initialize()
    kerl.absorb(trits, 0, trits.length)
    const buffer = new Int8Array(length)
    kerl.squeeze(buffer, 0, Kerl.HASH_LENGTH)
    return converter.trytes(buffer)
}

function prettyPrint(response) {
    console.log({
        index: response.index,
        signature: converter.trytes(response.signature).slice(0, 81) + "...",
        message: response.message,
        authPathHashes: response.authPathHashes.map(h => converter.trytes(h)),
        verifyingKey: converter.trytes(response.verifyingKey)
    })
}

function digest(message, index, authPathHashes, verifyingKey, nextRoot) {
    return converter.trytes(concat(converter.trits(message), converter.trits(intToTrytes(index)),
        verifyingKey, nextRoot ? nextRoot : [], ...authPathHashes))
}

function isTrits(trits) {
    if (!(trits instanceof Int8Array)) {
        return false
    }
    return !trits.some(v => Math.abs(v) > 1)
}

module.exports = {
    intToTrytes,
    trytesToInt,
    concat,
    isTritsZero,
    padTritsMultipleOf,
    padTrytesMultipleOf,
    hashTrytes,
    prettyPrint,
    digest,
    alphabet,
    isTrits
}