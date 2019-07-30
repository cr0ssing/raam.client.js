const converter =  require("@iota/converter")
const valid = require("@iota/validators")
const add = require('@iota/signing').add
const merkle = require('./merkle')
const sign = require('./sign')
const sender = require('./message')
const file = require('./file')
const {digest} = require('./helpers')
const RAAMReader = require('./raamReader')

const Errors = {
    INCOMPLETE_TREE: "Tree is in an incomplete state. Channel root can't be derived.",
    INDEX_USED: "A message with this index was already published.",
    INVALID_MESSAGE: "Message to be published has to be in trytes format.",
    INVALID_INDEX: top => `Index must be between 0 and ${top}.`,
    PUBLIC_NOT_ALLOWED: 'Messages can not be made public if channel password is set'
}

/**
 * @classdesc This class is used to publish messages in a RAAM channel. It also provides the methods of {@link RAAMReader}.
 * 
 * @extends RAAMReader
 * @typicalname raam
 */
class RAAM extends RAAMReader {
    /**
     * @constructs RAAM
     * @param {Array.<Leaf>} leafs - The leafs of the merkle tree which will be used as the signing 
     * keys of the messages.
     * @param {Array.<Node>} hashes - The nodes of the merkle tree which will be used for the 
     * authentication path of the messages.
     * @param {number} height - A number between 1 and 26 representing the height 
     * of the merkle tree used for this channel.
     * @param {object} [options] - Optional parameters.
     * @param {API} [options.iota] - A composed IOTA API for communication with a full node providing POW.
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @throws {Error} if tree is incomplete.
     */
    constructor(leafs, hashes, height, {iota, channelPassword} = {}) {
        super(channelRootOrThrow(hashes, height), 
            {iota, channelPassword, security: converter.trytes(hashes[0][0].hash).length / 81, height})
        this.leafs = leafs
        this.hashes = hashes
    }

    /**
     * An object containing public and private key for one-time signing a message.
     * @typedef {object} Leaf
     * @property {Int8Array} public - The verifying key as trits.
     * @property {Int8Array} private - The signing key as trits.
     * @property {number} index - The index in the merkle tree at leaf level, representing which message is signed
     * with this key.
     * @property {number} height - The level in the merkle tree, which is always 0.
     */;

    /**
     * An object representing a node of a merkle tree with a hash, and the position of the node by height and index.
     * @typedef {object} Node
     * @property {Int8Array} hash - The hash of the direct children of this node in the merkle tree as trits.
     * @property {number} index - The index in the level of the merkle tree from left to right.
     * @property {number} height - The level of the node in the merkle tree.
     */;

    /**
     * An object representing a message as transfers for a iota transaction bundle.
     * @typedef {object} MessageTransfers
     * @property {Array.<Transfer>} transfers - The array of transfers forming the transactions of a IOTA bundle.
     * @property {Message} message - The compiled RAAM message with all neccessary information to create its transfers.
     */;

    /** 
     * An object representing the compiled RAAM message with all neccessary information to create its transfers.
     * @typedef {object} Message
     * @property {number} index - The index of the message in the channel.
     * @property {number} height - A number between 1 and 26 representing the height 
     * of the merkle tree used for this channel.
     * @property {number} security - The security of the signing and encryption keys as a number between 1 and 4. 
     * @property {Trytes} message - The message to attach to the channel as trytes.
     * @property {Int8Array} signature - The signature created from the message digest with signing key from the merkle tree.
     * @property {Int8Array} verifyingKey - The key to verify the signature and to verify its membership of the merkle tree.
     * @property {Array.<Int8Array>} authPathHashes - The other merkle tree nodes to rebuild the merkle root.
     * @property {Int8Array} nextRoot - The root of another channel, used for branching or when channel is exausted.
     */;


    /**
     * Compiles the authentication path and a signature using the correct signing key. Converts the encrypted payload
     * of the message into transaction transfers. This message can be decoded by only using its address.
     * 
     * @param {Trytes} message - The message to attach to the channel as trytes.
     * @param {object} [options] - Optional parameters.
     * @param {number} [options.index = this.cursor] - The index of the message in the channel.
     * @param {Trytes} [options.tag = 'RAAM'] - Tag
     * @param {Int8Array} [options.nextRoot] - The root of another channel, used for branching or when channel is exausted.
     *
     * @returns {MessageTransfers} 
     * @throws
     * - if message isn't formatted as trytes.
     * - if index is not between zero and the maximal index of the channel.
     * - if a message was already found at this index.
     * - if channel password is set.
     */
    createPublicMessageTransfers(message, {index = this.cursor, tag = 'RAAM', nextRoot} = {}) {
        if (this.channelPassword != undefined) {
            throw new Error(Errors.PUBLIC_NOT_ALLOWED)
        }
        const messagePassword = sender.publicPassword(this.channelRoot, index)
        return this.createMessageTransfers(message, {index, tag, messagePassword, nextRoot})
    }

    /**
     * Compiles the authentication path and a signature using the correct signing key. Converts the encrypted payload
     * of the message into transaction transfers.
     * 
     * @param {Trytes} message - The message to attach to the channel as trytes.
     * @param {object} [options] - Optional parameters.
     * @param {number} [options.index = this.cursor] - The index of the message in the channel.
     * @param {Trytes} [options.tag = 'RAAM'] - Tag
     * @param {Trytes} [options.messagePassword] - The password to encrypt this message with.
     * @param {Int8Array} [options.nextRoot] - The root of another channel, used for branching or when channel is exausted.
     *
     * @returns {MessageTransfers} 
     * @throws
     * - if message isn't formatted as trytes.
     * - if index is not between zero and the maximal index of the channel.
     * - if a message was already found at this index.
     */
    createMessageTransfers(message, {index = this.cursor, tag = 'RAAM', messagePassword, nextRoot} = {}) {
        if (!valid.isTrytes(message) && message != "") {
            throw new Error(Errors.INVALID_MESSAGE)
        }
        if (index < 0 || index >= Math.pow(2, this.height)) {
            throw new Error(Errors.INVALID_INDEX(Math.pow(2, this.height) - 1))
        }
        if (this.messages[index]) {
            throw new Error(Errors.INDEX_USED)
        }
        
        const authPath = merkle.getAuthPath(index, this.height)
        const authPathHashes = authPath.map((i, level) => this.hashes[level][i].hash)
        const {private: signingKey, public: verifyingKey} = this.leafs[index]
        const sigDigest =  digest(message, index, authPathHashes, verifyingKey, nextRoot)
        const signature = sign.createSignature(signingKey, sigDigest)
        return sender.createTransfers(this.channelRoot, message, signature, index, verifyingKey, 
            authPathHashes, {tag, channelPassword: this.channelPassword, messagePassword, nextRoot})
    }

    /**
     * Takes transaction transfers and converts them into a transaction bundle, which is then attached 
     * to the tangle. POW is done remotely. Increases the cursor, so that it points to the next index 
     * where a message can be attached. Message is stored locally after publishing.
     * @param {Array.<Transfer>} transfers - The array of transfers forming the transactions of a IOTA bundle.
     * @param {object} [options] - Optional parameters.
     * @param {Message} [options.message] - The compiled RAAM message with all neccessary information to create its transfers.
     * If it's passed message will be stored locally after publishing.
     * @param {number} [options.depth = 3] - Depth
     * @param {number} [options.mwm = 14] - Min weight magnitude
     * @param {API} [options.iota = this.iota] - A composed IOTA API for communication with a full node providing POW.
     * 
     * @returns {Promise}
     * @fulfil {Transaction[]} - The bundle of the attached message.
     * @reject {Error} 
     * - if message is too long
     */
    async publishMessageTransfers(transfers, {message, depth = 3, mwm = 14, iota = this.iota}) {
       const {bundle} = await sender.sendTransfers(iota, transfers, {message, depth, mwm})
       if (message) {
            this.messages[message.index] = message.message
            if (message.nextRoot) {
                this.branches[message.index] = message.nextRoot
            }
            this.cursor = this.messages.length
        }
        return bundle
    }

    /**
     * Compiles the authentication path and a signature using the correct signing key. Converts the encrypted payload
     * of the message into a transaction bundle, which is then attached to the tangle. POW is done remotely.
     * Increases the cursor, so that it points to the next index where a message can be attached.  Message is stored 
     * locally after publishing. This message can be decoded by only using its address.
     * 
     * @param {Trytes} message - The message to attach to the channel as trytes.
     * @param {object} [options] - Optional parameters.
     * @param {number} [options.index = this.cursor] - The index of the message in the channel.
     * @param {Trytes} [options.tag = 'RAAM'] - Tag
     * @param {number} [options.depth = 3] - Depth
     * @param {number} [options.mwm = 14] - Min weight magnitude
     * @param {API} [options.iota = this.iota] - A composed IOTA API for communication with a full node providing POW.
     * @param {Int8Array} [options.nextRoot] - The root of another channel, used for branching or when channel is exausted.
     *
     * @returns {Promise}
     * @fulfil {Transaction[]} - The bundle of the attached message.
     * @reject {Error} 
     * - if message is too long
     * - if message isn't formatted as trytes.
     * - if index is not between zero and the maximal index of the channel.
     * - if a message was already found at this index.
     * - if channel password is set.
     */
    async publishPublic(message, {index = this.cursor, tag = 'RAAM', depth = 3, mwm = 14, iota = this.iota, nextRoot} = {}) {
        const {transfers, message: payload} = this.createPublicMessageTransfers(message, {index, tag, nextRoot})
        return await this.publishMessageTransfers(transfers, {message: payload, depth, mwm, iota})
    }

    /**
     * Compiles the authentication path and a signature using the correct signing key. Converts the encrypted payload
     * of the message into a transaction bundle, which is then attached to the tangle. POW is done remotely.
     * Increases the cursor, so that it points to the next index where a message can be attached.  Message is stored 
     * locally after publishing.
     * 
     * @param {Trytes} message - The message to attach to the channel as trytes.
     * @param {object} [options] - Optional parameters.
     * @param {number} [options.index = this.cursor] - The index of the message in the channel.
     * @param {Trytes} [options.tag = 'RAAM'] - Tag
     * @param {number} [options.depth = 3] - Depth
     * @param {number} [options.mwm = 14] - Min weight magnitude
     * @param {API} [options.iota = this.iota] - A composed IOTA API for communication with a full node providing POW.
     * @param {Trytes} [options.messagePassword] - The password to encrypt this message with.
     * @param {Int8Array} [options.nextRoot] - The root of another channel, used for branching or when channel is exausted.
     *
     * @returns {Promise}
     * @fulfil {Transaction[]} - The bundle of the attached message.
     * @reject {Error} 
     * - if message is too long
     * - if message isn't formatted as trytes.
     * - if index is not between zero and the maximal index of the channel.
     * - if a message was already found at this index.
     */
    async publish(message, {index = this.cursor, tag = 'RAAM', depth = 3, mwm = 14, iota = this.iota, messagePassword, nextRoot} = {}) {
        const {transfers, message: payload} = this.createMessageTransfers(message, {index, tag, messagePassword, nextRoot})
        return await this.publishMessageTransfers(transfers, {message: payload, depth, mwm, iota})
    }

    /**
     * Creates a RAAM channel from a seed. For that a merkle tree is created consisting of all one-time signing keys that
     * sign the messages of the channel. For bigger values of height/amount this can take a while.
     * After creation a RAAM instance for read/write operations of the channel is returned.
     * It's possible to save the merkle tree to a file, which can be used to fastly reinitialize the channel. This file needs to
     * be stored in save place, as everybody who accesses it can publishes messages to this channel.
     * Feedback in the creation process is provided by an optional callback.
     * 
     * @param {Trytes} seed - The seed from which the signing keys are created.
     * @param {object} [options] - Optional parameters.
     * @param {number} [options.amount] - The maximum amount of messages that can be published in this channel.
     * @param {number} [options.height = Math.ceil(Math.log2(amount))] - A number between 1 and 26 representing the height 
     * of the merkle tree used for this channel.
     * @param {API} [options.iota = this.iota] - A composed IOTA API for communication with a full node providing POW.
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @param {number} [options.security = 2] - The security of the signing and encryption keys as a number between 1 and 4. 
     * @param {number} [options.offset = 0] - The starting index used for building the subroots from which the keys are created.
     * @param {boolean} [options.saveToFile = false] - whether to save the created merkle tree to a file, which can be used for
     * fast reinitializing the channel.
     * @param {string} [options.fileName = channelKeys.json] - The filename of the file where the merkle tree is saved.
     * @param {ProgressCallback} [options.progressCallback] - A callback function called after the given timeout reporting the
     * progress of the channel creation.
     * @param {number} [options.timeout = 5000] - The timeout after the progressCallback is triggered.
     * @returns {Promise}
     * @fulfil {RAAM}
     */
    static async fromSeed(seed, {amount, height = amount ? Math.ceil(Math.log2(amount)) : undefined,
        iota, channelPassword, security = 2, offset = 0, saveToFile = false, 
        fileName = "channelKeys.json", progressCallback, timeout = 5000} = {}) {
        let s = seed
        if (channelPassword) {
            s = s.concat(channelPassword)
        }
        
        let callback
        if (saveToFile) {
            const fileCallback = file.getFileWriter(fileName)
            
            if (progressCallback) {
                callback = async (leafs, hashes) => {
                    await progressCallback(leafs, hashes)
                    fileCallback(leafs, hashes)
                }
            } else {
                callback = fileCallback
            }
        } else {
            callback = progressCallback
        }
        const {leafs, hashes} = await merkle.createTree(s, height, {security, offset, progressCallback: callback, timeout})
        return new RAAM(leafs, hashes, height, {iota, channelPassword})
    }

    /**
     * Callback function that is called after a given timeout to report the progress in channel creation. 
     * @callback ProgressCallback
     * @param {Array.<Leaf>} leafs - an array containing all leafs created since the last callback.
     * @param {Array.<Node>} hashes - an array containing all hashes in the merkle tree created since the last callback.
     */;
    
    /**
     * Initializes a RAAM channel from a file containing the signing keys for this channel. 
     * 
     * @param {string} fileName - The name of the file to load.
     * @param {object} [options] - Optional parameters.
     * @param {API} [options.iota = this.iota] - A composed IOTA API for communication with a full node providing POW.
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @param {number} [options.amount] - The maximum amount of messages that can be published in this channel.
     * @param {number} [options.height = Math.ceil(Math.log2(amount))] - A number between 1 and 26 representing the height 
     * of the merkle tree used for this channel.
     * @param {Trytes} [options.seed] - The seed from which the signing keys are created.
     * @param {number} [options.offset = 0] - The starting index used for building the subroots from which the keys are created.
     * @param {ProgressCallback} [options.progressCallback] - A callback function called after the given timeout reporting the
     * progress of the channel creation.
     * @param {number} [options.timeout = 5000] - The timeout after the progressCallback is triggered.
     * @returns {RAAM}
     * 
     */
    static fromFile(fileName, 
        {iota, channelPassword, seed, amount, height = amount ? Math.ceil(Math.log2(amount)) : undefined, 
            offset, progressCallback, timeout = 5000} = {}) {
        const {leafs, hashes, height: storedHeight} = file.readFile(fileName)
        if (height && storedHeight < height) {
            // TODO complete tree, if not
            height = storedHeight
        }
        
        return new RAAM(leafs, hashes, height, {iota, channelPassword})
    }
}

function channelRootOrThrow(hashes, height) {
    if (hashes[height] == undefined || hashes[height][0] == undefined) {
        throw new Error(Errors.INCOMPLETE_TREE)
    }
    return hashes[height][0].hash
}

RAAM.RAAMReader = RAAMReader
RAAM.RAAM = RAAM.default = RAAM

module.exports = RAAM