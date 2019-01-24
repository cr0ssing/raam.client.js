const Kerl = require('@iota/kerl').default //require('iota.lib.js/lib/crypto/kerl/kerl')
const converter = require('@iota/converter') //require("iota.lib.js/lib/crypto/converter/converter")
const signing = require("@iota/signing") //require('iota.lib.js/lib/crypto/signing/signing')
const {padTritsMultipleOf} = require("./helpers")

const PK_FRAGMENTS = 27
const FRAG_SIZE = PK_FRAGMENTS * Kerl.HASH_LENGTH

function createPrivateKey(seed, security = 2) {
    return signing.key(padTritsMultipleOf(Kerl.HASH_LENGTH, Kerl.HASH_LENGTH, converter.trits(seed)), security)
}

function createPublicKey(pk) {
    return signing.digests(pk)
}

function createKeyPair(seed, security = 2) {
    const pk = createPrivateKey(seed, security)
    return {
        private: pk,
        public: createPublicKey(pk)
    }
}

function createSignature(pk, message) {
    const fragAmount = pk.length / Kerl.HASH_LENGTH
    const signature = new Int8Array(fragAmount * Kerl.HASH_LENGTH)
    const messageDigest = normalizeMessageDigest(getMessageDigest(message, fragAmount))
    const kerl = new Kerl()

    for (let i = 0; i < fragAmount; i++) {
        const keyFragment = pk.slice(i * Kerl.HASH_LENGTH, (i + 1) * Kerl.HASH_LENGTH)
        if (messageDigest[i] == 13) {
            console.error("ALERT! digest is 13 at index", i)
        }
        for (let j = 0; j < 13 - messageDigest[i % messageDigest.length]; j++) {
            kerl.initialize()
            kerl.reset()
            kerl.absorb(keyFragment, 0, Kerl.HASH_LENGTH)
            kerl.squeeze(keyFragment, 0, Kerl.HASH_LENGTH)
        }
        for (let j = 0; j < Kerl.HASH_LENGTH; j++) {
            signature[i * Kerl.HASH_LENGTH + j] = keyFragment[j]
        }
    }

    return signature
}

function verifyMessage(signature, message, pub) {
    const fragAmount = signature.length / Kerl.HASH_LENGTH
    const digests = new Int8Array(pub.length)
    const security = signature.length / FRAG_SIZE

    const messageDigest = normalizeMessageDigest(getMessageDigest(message, fragAmount))

    for (let i = 0; i < security; i++) {
        const digestFragment = new Int8Array(FRAG_SIZE)
        const signatureFragment = signature.slice(i * FRAG_SIZE, (i + 1) * FRAG_SIZE)
        for (let j = 0; j < PK_FRAGMENTS; j++) {
            const fragment = signatureFragment.slice(j * Kerl.HASH_LENGTH, (j + 1) * Kerl.HASH_LENGTH)
            for (let k = messageDigest[(i * PK_FRAGMENTS + j) % messageDigest.length] + 13; k-- > 0; ) {
                const jKerl = new Kerl()
                jKerl.initialize()
                jKerl.absorb(fragment, 0, fragment.length)
                jKerl.squeeze(fragment, 0, Kerl.HASH_LENGTH)
            }

            for (let k = 0; k < Kerl.HASH_LENGTH; k++) {
                digestFragment[j * Kerl.HASH_LENGTH + k] = fragment[k]
            }
        }

        const kerl = new Kerl()
        kerl.initialize();
        kerl.absorb(digestFragment, 0, digestFragment.length);
        kerl.squeeze(digestFragment, 0, Kerl.HASH_LENGTH)

        for (let j = 0; j < Kerl.HASH_LENGTH; j++) {
            digests[i * Kerl.HASH_LENGTH + j] = digestFragment[j]
        }
    }
    return (converter.trytes(pub) == converter.trytes(digests))
}

function getMessageDigest(trytes, fragments) {
    const trits = converter.trits(trytes)
    const padded = padTritsMultipleOf(Kerl.HASH_LENGTH, Kerl.HASH_LENGTH, trits)
    
    const kerl = new Kerl()
    kerl.initialize()
    kerl.absorb(padded, 0, padded.length)
    let messageDigest = new Int8Array(Math.ceil(fragments / Kerl.HASH_LENGTH) * Kerl.HASH_LENGTH)
    kerl.squeeze(messageDigest, 0, messageDigest.length)
    kerl.reset()
    return messageDigest
}

function normalizeMessageDigest(messageDigest) {
    const normalizedMessageDigest = new Int8Array(converter.trytes(messageDigest).split("")
        .map(tryte => converter.trits(tryte))
        .map(trits => converter.value(trits)))
    while (normalizedMessageDigest.some(value => value == 13)) {
        const index = normalizedMessageDigest.findIndex(value => value == 13)
        normalizedMessageDigest[index]--
    }
    let sum = normalizedMessageDigest.reduce((acc, v) => acc + v)
 
    if (sum >= 0) {
        while (sum-- > 0) {
            for (let j = 0; j < normalizedMessageDigest.length; j++) {
                if (normalizedMessageDigest[j] != 14 && normalizedMessageDigest[j] > -13) {
                    normalizedMessageDigest[j]--
                    break
                }
            }
        }
    } else {
        while (sum++ < 0) {
            for (let j = 0; j < normalizedMessageDigest.length; j++) {
                if (normalizedMessageDigest[j] != 12 && normalizedMessageDigest[j] < 13) {
                    normalizedMessageDigest[j]++
                    break
                }
            }
        }
    }

    return normalizedMessageDigest
}

module.exports = {
    createPrivateKey,
    createPublicKey,
    createKeyPair,
    createSignature,
    verifyMessage
}