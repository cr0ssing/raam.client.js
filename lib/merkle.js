const sign = require('./sign')
const Kerl = require('@iota/kerl').default
const converter = require('@iota/converter')
const iotaSigning = require('@iota/signing')

function getAuthPath(index, h) {
    const result = []
    for (let i = 0; i < h; i++) {
        const floor = Math.floor(index / Math.pow(2, i))
        result[i] = floor % 2 == 0 ? floor + 1 : floor - 1
    }
    return result
}

function verifyMerkleTree(public, verificationKey, index, authPathHashes) {
    const producedHashes = [verificationKey]
    for (let i = 1; i <= authPathHashes.length; i++) {
        const hashes = [producedHashes[i - 1]]
        const floor = Math.floor(index / Math.pow(2, i - 1))
        if (floor % 2 == 0) {
            hashes.push(authPathHashes[i - 1])
        } else {
            hashes.unshift(authPathHashes[i - 1])
        }
        const kerl = new Kerl()
        kerl.initialize()
        hashes.forEach(hash => kerl.absorb(hash, 0, hash.length))
        const buffer = new Int8Array(verificationKey.length)
        kerl.squeeze(buffer, 0, verificationKey.length)
        producedHashes[i] = buffer
    }
    return converter.trytes(public) == converter.trytes(producedHashes[producedHashes.length - 1])
}

async function createTree(seed, h, {security = 2, offset = 0, progressCallback, timeout = 5000} = {}) {
    const stack = []
    const leafs = []
    const hashes = []
    for (let i = 0; i <= h; i++) {
        hashes.push([])
    }
    
    // configure callback
    let progress
    if (progressCallback) {
        let nextPushedLeaf = 0
        const nextPushedHash = new Array(h + 1).fill(0)
        progress = async function() {
            await progressCallback(leafs.slice(nextPushedLeaf), hashes.map((a, i) => {
                const result = a.slice(nextPushedHash[i])
                nextPushedHash[i] = a.length
                return result
            }))
            nextPushedLeaf = leafs.length
        }
    }
    
    let lastTime = new Date().getTime()
    //build tree, starting from leafs
    for (let i = 0; i <= Math.pow(2, h) - 1; i++) {
        const subseed = iotaSigning.subseed(converter.trits(seed), i + offset)
        const leaf = sign.createKeyPair(converter.trytes(subseed), security)
        leaf.index = i
        leaf.height = 0
        leafs.push(leaf)
        let node = {hash: leaf.public, height: 0, index: leaf.index}
        
        // build all parent nodes that are buildable
        while (stack.length > 0 && stack[stack.length - 1].height == node.height) {
            const kerl = new Kerl()
            kerl.initialize()
            const first = stack.pop()
            kerl.absorb(first.hash, 0, first.hash.length)
            kerl.absorb(node.hash, 0, node.hash.length)
            const buffer = new Int8Array(security * Kerl.HASH_LENGTH)
            kerl.squeeze(buffer, 0, security * Kerl.HASH_LENGTH)
            const height = first.height + 1
            node = {
                hash: buffer,
                height,
                index: hashes[height].length
            }
            hashes[height].push(node)
        }
        stack.push(node)
        if (progress && new Date().getTime() - lastTime > timeout) {
            await progress()
            lastTime = new Date().getTime()
        }
    }

    hashes[0] = leafs.map(({public, height, index}) => ({hash: public, height, index}))
    if (progress) {
        await progress()
    }
    return {root: stack.pop().hash, leafs, hashes}
}

module.exports = {
    createTree,
    verifyMerkleTree,
    getAuthPath
}