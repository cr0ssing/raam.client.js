const prepareTransfers = require('@iota/core').createPrepareTransfers()

const converter = require('@iota/converter')
const add = require('@iota/signing/out/signing/src/add').default
const Kerl = require('@iota/kerl').default
const {intToTrytes, trytesToInt, concat, padTritsMultipleOf, padTrytesMultipleOf, alphabet} = require('./helpers')
const {encrypt, decrypt} = require("./encrypt")

const INDEX_TRYTES = 6
const MESSAGE_LENGTH_TRYTES = 3
const SECURITY_TRYTES = 1
const HEIGHT_TRYTES = 1
const PREFIX_LENGTH = INDEX_TRYTES + MESSAGE_LENGTH_TRYTES + SECURITY_TRYTES + HEIGHT_TRYTES

const MESSAGE_FRAGMENT_TRYTES = 2187

const Errors = {
    INVALID_HEIGHT: "Merkle tree height must be between 2 and 26",
    INVALID_SECURITY_LEVEL: "Key security must be between 1 and 4",
    INVALID_INDEX: "Index is either negative or to big for amount of provided authentication hashes.",
    WRONG_INDEX: "Message has different index than requested. Please check channel root.",
    WRONG_HEIGHT: "Message has different merkle tree height than requested. Please check channel root.",
    WRONG_SECURITY: "Message has different key security than requested. Please check channel root.",
    SHORT_MESSAGE: "The message is to short. Either hashes for authenticaton path or signature parts are missing."
}

function intToPaddedTrytes(value, length) {
    let trytes = intToTrytes(value)
    while (trytes.length < length) {
        trytes = "9".concat(trytes)
    }
    return trytes
}

async function sendMessage(iota, merkleRoot, message, sig, index, verifyingKey, authPathHashes, 
    {tag = 'RAAM', depth = 3, mwm = 14, channelPassword, nextRoot, messagePassword} = {}) {
    let indexTrytes = intToPaddedTrytes(index, INDEX_TRYTES)
    
    const security = converter.trytes(merkleRoot).length / 81
    if (security < 1 || security > 4) {
        throw new Error(Errors.INVALID_SECURITY_LEVEL)
    }
    const nextRootSec = nextRoot ? converter.trytes(nextRoot).length / 81 : 0
    const securityTryte = alphabet.charAt(nextRootSec * 4 + security - 1)

    let lengthTrytes = intToPaddedTrytes(message.length, MESSAGE_LENGTH_TRYTES)

    const indexTrits = converter.trits(intToTrytes(index))
    const pwTrits = channelPassword ? converter.trits(channelPassword) : undefined
    const address = getAddress(merkleRoot, pwTrits, indexTrits)
    const mpTrits = messagePassword ? converter.trits(messagePassword) : undefined
    const key = getKey(merkleRoot, pwTrits, indexTrits, mpTrits)

    const height = authPathHashes.length
    if (height < 2 || height > 26) {
        throw new Error(Errors.INVALID_HEIGHT)
    }
    if (index < 0 || index >= Math.pow(2, height)) {
        throw new Error(Errors.INVALID_INDEX)
    }
    const heightTryte = intToPaddedTrytes(height, HEIGHT_TRYTES)

    const hashes = converter.trytes(concat(verifyingKey, concat(...authPathHashes)))
    let payload = indexTrytes + securityTryte + heightTryte + lengthTrytes + message + hashes
    if (nextRoot) {
        payload += converter.trytes(nextRoot)
    }
    
    const messageFragment = encrypt(padTrytesMultipleOf(MESSAGE_FRAGMENT_TRYTES, MESSAGE_FRAGMENT_TRYTES, payload), key)
    const transfers = []
    for (let i = 0; i < Math.ceil(messageFragment.length / MESSAGE_FRAGMENT_TRYTES); i++) {
        transfers.push({
            address,
            value: 0,
            message: messageFragment.slice(i * MESSAGE_FRAGMENT_TRYTES, (i + 1) * MESSAGE_FRAGMENT_TRYTES),
            tag
        })
    }
    const sigTrytes = converter.trytes(sig)
    for (let i = 0; i < Math.ceil(sigTrytes.length / MESSAGE_FRAGMENT_TRYTES); i++) {
        transfers.push({
            address,
            value: 0,
            message: sigTrytes.slice(i * MESSAGE_FRAGMENT_TRYTES, (i + 1) * MESSAGE_FRAGMENT_TRYTES),
            tag
        })
    }

    const trytes = await prepareTransfers("9".repeat(81), transfers)
    const bundle = await iota.sendTrytes(trytes, depth, mwm)
    return {
        bundle,
        message: {
            index,
            height, 
            security,
            message,
            signature: sig,
            verifyingKey,
            authPathHashes,
            nextRoot
        }
    }
}

function getKey(merkleRoot, pwTrits, indexTrits, messageKey) {
    const a = messageKey || (pwTrits || merkleRoot)
    return converter.trytes(add(a, indexTrits))
}

function getAddress(merkleRoot, password, indexTrits) {
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
    return converter.trytes(buffer)
}

async function getMessage(iota, merkleRoot, index, {channelPassword, messagePassword, height, security}) {
    const indexTrytes = intToTrytes(index)
    const indexTrits = converter.trits(indexTrytes)
    const pwTrits = channelPassword ? converter.trits(channelPassword) : undefined
    const address = getAddress(merkleRoot, pwTrits, indexTrits)
    const mpTrits = messagePassword ? converter.trits(messagePassword) : undefined
    const key = getKey(merkleRoot, pwTrits, indexTrits, mpTrits)

    const hashes = await iota.findTransactions({
        addresses: [address]
    })
    const response = await iota.getTransactionObjects(hashes)
        
    let bundles = response.reduce((acc, v) => {
        if (Object.keys(acc).includes(v.bundle)) {
            acc[v.bundle].push(v)
        } else {
            acc[v.bundle] = [v]
        }
        return acc
    }, {})

    bundles = Object.keys(bundles).map(k => bundles[k]).filter(txs => txs.length >= 2)
    bundles.sort((a, b) => a[0].timestamp - b[0].timestamp)
    bundles.forEach(b => b.sort((a, b) => a.currentIndex - b.currentIndex))

    const result = {
        skipped: [],
        message: undefined
    }
    for(let i = 0; i < bundles.length; i++) {
        try {
            result.message = processBundle(index, bundles[i], key, {height, security})
            break
        } catch (error) {
            const bundle = bundles[i][0].bundle
            result.skipped.push({bundle, error})
        }
    }
    return result
}

function processBundle(index, txs, key, {height, security} = {}) {
    if (txs.length < 2) {
        throw new Error(Errors.SHORT_MESSAGE)
    }

    const result = {
        authPathHashes: []
    }

    // extract length and meta data
    const firstDecrypted = decrypt(txs[0].signatureMessageFragment, key)
    let start = 0
    result.index = trytesToInt(firstDecrypted.slice(start, INDEX_TRYTES))
    start += INDEX_TRYTES
    if (index != result.index) {
        throw new Error(Errors.WRONG_INDEX)
    }
    // this tryte contains the security of the keys and of the nextRoot iff set
    const secTryteIndex = alphabet.indexOf(firstDecrypted.slice(start, start + SECURITY_TRYTES))
    result.security = secTryteIndex % 4 + 1
    const nextRootLength = Math.floor(secTryteIndex / 4) * 81
    start += SECURITY_TRYTES

    if (security && security != result.security) {
        throw new Error(Errors.WRONG_SECURITY)
    }
    result.height = trytesToInt(firstDecrypted.slice(start, start + HEIGHT_TRYTES))
    start += HEIGHT_TRYTES
    if (height && height != result.height) {
        throw new Error(Errors.WRONG_HEIGHT)
    }
    const messageLength = trytesToInt(firstDecrypted.slice(start, start + MESSAGE_LENGTH_TRYTES))
    const hashLength = result.security * 81
    // payloadLength = messageLength + #height auth path hashes + verifying key + nextRoot
    const payloadLength = messageLength + (result.height + 1) * hashLength + nextRootLength
    
    // it's possible to say amount of payload transactions = txs.length - security
    // but this way you can't check if signature transactions are missing
    let payloadTransactions = Math.ceil(payloadLength / MESSAGE_FRAGMENT_TRYTES)
    
    if (txs.length - payloadTransactions < security) {
        throw new Error(Errors.SHORT_MESSAGE)
    }

    // extract payload
    let cipher = txs[0].signatureMessageFragment
    let remainingLength = payloadLength - (MESSAGE_FRAGMENT_TRYTES - PREFIX_LENGTH)
    for (let i = 1; i < payloadTransactions; i++) {
        cipher = cipher.concat(txs[i].signatureMessageFragment.slice(0, remainingLength))
        remainingLength -= MESSAGE_FRAGMENT_TRYTES
    }

    const decrypted = decrypt(cipher, key).slice(PREFIX_LENGTH)
    result.message = decrypted.slice(0, messageLength)

    // extract hashes
    const startHashes = messageLength + hashLength
    result.verifyingKey = converter.trits(decrypted.slice(messageLength, startHashes))

    const authHashesLength = result.height * hashLength
    const endHashes = startHashes + authHashesLength
    const hashes =  decrypted.slice(startHashes, endHashes)
    for (let i = 0; i < hashes.length / hashLength; i++) {
        const hash = hashes.slice(i * hashLength, (i + 1) * hashLength)
        const trits = converter.trits(hash)
        result.authPathHashes.push(trits)
    }

    //extract nextRoot
    result.nextRoot = converter.trits(decrypted.slice(endHashes, endHashes + nextRootLength))

    // extract signature
    result.signature = new Int8Array(result.security * MESSAGE_FRAGMENT_TRYTES * 3)
    for (let i = payloadTransactions; i < txs.length; i++) {
        result.signature.set(converter.trits(txs[i].signatureMessageFragment), 
            (txs[i].currentIndex - payloadTransactions) * MESSAGE_FRAGMENT_TRYTES * 3)
    }

    return result
}

module.exports = {
    sendMessage,
    getMessage
}