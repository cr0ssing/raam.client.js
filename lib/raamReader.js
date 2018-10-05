const merkle = require('./merkle')
const sign = require('./sign')
const reader = require('./message')
const {digest, isTrits} = require('./helpers')
const converter =  require("@iota/converter")

const Errors = {
    VERIFICATION_FAILED: "Verification of message failed. Message digest doesn't match signature.",
    AUTHENTICATION_FAILED: "Authentication of message failed. Channel root could not be reconstructed." 
}

/**
 * 
 * @classdesc This class is used to read messages from a RAAM channel. Any instance stores read messages by
 * this instance for later use. This way, queries to a node are minimized.
 * 
 */
class RAAMReader {
    /**
     * @constructs RAAMReader
     * @param {Int8Array} channelRoot - The channel root by that the channel is identified as trits.
     * @param {object} [options] - Optional parameters.
     * @param {API} [options.iota] - A composed IOTA API for communication with a full node.
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @param {number} [options.security] - The security of the signing and encryption keys as a number between 1 and 4. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.amount] - The maximum amount of messages in this channel. 
     * From this the height of the channel can be calculated. This is parameter is only used as an extra verification information.
     * @param {number} [options.height] - The height as a number between 2 and 26 of the channel yielding the maximum 
     * amount of messages of the channel. This is parameter is only used as an extra verification information.
     */
    constructor(channelRoot, {iota, channelPassword, security, 
        amount, height = amount ? Math.ceil(Math.log2(amount)) : undefined} = {}) {
        this.height = height
        this.security = security
        this.channelRoot = isTrits(channelRoot) ? channelRoot : converter.trits(channelRoot)
        this.security = security || (this.channelRoot.length / 243)
        this.channelPassword = channelPassword
        this.iota = iota

        this.cursor = 0
        this.messages = []
        this.branches = []
    }

    /**
     * Reads messages from the channel until the index where no message is found. Alle found messages will be stored locally
     * and be returned. Sets the cursor to the first index where no message was found.
     * 
     * @param {Object} [options] - Optional parameters.
     * @param {API} [options.iota] - A composed IOTA API for communication with a full node.
     * @param {ReadCallback} [options.callback] - Callback function that is called after each message request.
     * @param {Trytes} [options.messagePassword] - The default message password which will be used to decrypt 
     * all found messages.
     * @param {Array.<Trytes>} [options.messagePasswords] - An array containing different message passwords for 
     * different messages. The ith element is the password for the ith message in the channel.
     * 
     * @returns {Promise}
     * @fulfil {FetchResult}
     */
    async syncChannel({iota = this.iota, callback, messagePassword, messagePasswords} = {}) {
        const result = await this.fetch({iota, callback, messagePassword, messagePasswords})
        this.cursor = result.messages.length
        return result
    }

    /**
     * Callback function that is called after each message request.
     * @callback ReadCallback
     * @param {Error} error - Error that occured while getting the message iff any.
     * @param {Trytes} message - The fetched message if the request was successful.
     * @param {Array.<object>} skipped - An array containing skipped bundles that 
     * were found at the same address that the message has. Elements <code>{bundle, error}</code> contain 
     * the bundle hash and the error causing the skipping.
     * @param {Int8Array} nextRoot - The nextRoot of the message iff any.
     */;


    /**
     * Reads a single message with given index or an amount of messages by giving start and index from 
     * the channel. Only indexes where no message is already stored locally are queried from the given full
     * node, since they are immutable. Returns all found messages in an array. Indexes where no message was found
     * will be left empty. Also skipped bundles at the queried addresses, channel roots of provided branches and
     * errors are returned per index as arrays.
     * 
     * @param {Object} [options] - Optional parameters.
     * @param {API} [options.iota] - A composed IOTA API for communication with a full node.
     * @param {number} [options.index] - The index in the channel of the message to fetch. 
     * If start is set too index is not used. 
     * @param {number} [options.start] - The start index in the channel of the messages to fetch.
     * If start and index aren't set start is 0.
     * @param {number} [options.end] - The end index in the channel of the messages to fetch.
     * If end is undefined messages will be fetched until an index where no message is found is reached.
     * @param {ReadCallback} [options.callback] - Callback function that is called after each message request.
     * @param {Trytes} [options.messagePassword] - The default message password which will be used to decrypt 
     * all found messages.
     * @param {Array.<Trytes>} [options.messagePasswords] - An array containing different message passwords for 
     * different messages. The ith element is the password for the ith message in the channel.
     * 
     * @returns {Promise}
     * @fulfil {FetchResult}
     */
    async fetch({iota = this.iota, index, start, end, messagePassword, messagePasswords, callback} = {}) {
        ({start, end} = getRange(index, start, end))
        if (end && end < start) {
            return new FetchResult([], [], [], [])
        }
        
        const intervals = []
        // check if requested messages are already stored
        const messages = this.messages
        let i = start
        const stop = end != null ? end : Math.max(0, messages.length - 1)
        outer: while (i <= stop) {
            while (messages[i] != undefined) {
                if (i == stop) {
                    break outer
                }
                i++
            }
            const s = i
            while (i <= stop && messages[i] == undefined) {
                i++
            }
            intervals.push({start: s, end: i - 1})
        }

        if (end == null) {
            if (intervals.length == 0) {
                intervals.push({start: i + 1})
            } else {
                intervals[intervals.length - 1].end = undefined
            }
        }

        const es = [], sk = []
        for (let {start: s, end: e} of intervals) {
            const {messages, errors, skipped: batchSkipped, branches} = await RAAMReader.fetchMessages(iota, this.channelRoot, 
                {start: s, end: e, channelPassword: this.channelPassword, messagePasswords, messagePassword, callback,
                height: this.height, security: this.security})
            messages.map((message, i) => ({message, index: i + s}))
                .filter(({message}) => message != undefined).forEach(({message, index}) => this.messages[index] = message)
            batchSkipped.map((skipped, i) => ({skipped, index: i + s}))
                .filter(({skipped}) => skipped != undefined).forEach(({skipped, index}) => sk[index] = skipped)
            errors.forEach(e => es.push(e))
            branches.map((nextRoot, i) => ({nextRoot, index: i + s}))
                .filter(({nextRoot}) => nextRoot != undefined).forEach(({index, nextRoot}) => this.branches[index] = nextRoot)
        }

        return {
            messages: end != undefined ? this.messages.slice(start, end + 1) : this.messages.slice(start),
            errors: es,
            skipped: sk,
            branches: end != undefined ? this.branches.slice(start, end + 1) : this.branches.slice(start),
        }
    }

    /**
     * Reads a single message with given index or an amount of messages by giving start and index from 
     * the channel with the given channel root. Returns all found messages in an array. Indexes where no 
     * message was found will be left empty. Also skipped bundles at the queried addresses, channel roots 
     * of provided branches and errors are returned per index as arrays.
     * 
     * @param {API} iota - A composed IOTA API for communication with a full node.
     * @param {Int8Array} channelRoot - The channel root by that the channel is identified as trits.
     * @param {Object} [options] - Optional parameters.
     * @param {number} [options.index] - The index in the channel of the message to fetch. 
     * If start is set too index is not used. 
     * @param {number} [options.start] - The start index in the channel of the messages to fetch.
     * If start and index aren't set start is 0.
     * @param {number} [options.end] - The end index in the channel of the messages to fetch.
     * If end is undefined messages will be fetched until an index where no message is found is reached.
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @param {ReadCallback} [options.callback] - Callback function that is called after each message request.
     * @param {Trytes} [options.messagePassword] - The default message password which will be used to decrypt 
     * all found messages.
     * @param {Array.<Trytes>} [options.messagePasswords] - An array containing different message passwords for 
     * different messages. The ith element is the password for the ith message in the channel.
     * @param {number} [options.security] - The security of the signing and encryption keys as a number between 1 and 4. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.height] - The height as a number between 2 and 26 of the channel yielding the maximum 
     * amount of messages of the channel. This is parameter is only used as an extra verification information.
     * 
     * @returns {Promise}
     * @fulfil {FetchResult}
     */
    static async fetchMessages(iota, channelRoot, 
        {index, start, end, channelPassword, messagePassword, messagePasswords, callback, height, security} = {}) {
        ({start, end} = getRange(index, start, end))
        const result = new FetchResult([], [], [], [])
        if (end && end < start) {
            return result
        }

        for (let i = start; end != undefined ? i <= end : true; i++) {
            const arrayIndex = i - start
            try {
                const pw = messagePasswords == undefined || messagePasswords.length <= i ? messagePassword : messagePasswords[i]
                const {message, skipped: singleSkipped, nextRoot} = await RAAMReader.fetchSingle(iota, channelRoot, i, {channelPassword, messagePassword: pw, security, height})
                if (singleSkipped.length > 0) {
                    result.skipped[arrayIndex] = singleSkipped
                }
                if (nextRoot) {
                    result.branches[arrayIndex] = nextRoot
                }
                if (message == undefined) {
                    if (end == undefined) {
                        if (callback) {
                            await callback(undefined, undefined, singleSkipped)
                        }
                        break;
                    }
                } else {
                    result.messages[arrayIndex] = message
                }
                
                if (callback) {
                    await callback(undefined, message, singleSkipped, nextRoot)
                }
            } catch (e) {
                if (callback) {
                    await callback(e, undefined)
                }
                result.errors.push(e)
                if (end == undefined) {
                    break;
                }
            }
        }
        
        return result
    }

    /**
     * Reads a single message with given index from the channel with the given channel root. Returns the
     * found message iff any, the index, skipped bundles at the queried address and errors.
     * 
     * @param {API} iota - A composed IOTA API for communication with a full node.
     * @param {Int8Array} channelRoot - The channel root by that the channel is identified as trits.
     * @param {number} index - The index in the channel of the message to fetch. 
     * If start is set too index is not used. 
     * @param {Object} [options] - Optional parameters.
     * @param {number} [options.start] - The start index in the channel of the messages to fetch.
     * If start and index aren't set start is 0.
     * @param {number} [options.end] - The end index in the channel of the messages to fetch.
     * If end is undefined messages will be fetched until an index where no message is found is reached.
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @param {Trytes} [options.messagePassword] - The message password which will be used to decrypt 
     * the found message.
     * @param {number} [options.security] - The security of the signing and encryption keys as a number between 1 and 4. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.height] - The height as a number between 2 and 26 of the channel yielding the maximum 
     * amount of messages of the channel. This is parameter is only used as an extra verification information.
     * 
     * @returns {Promise}
     * @fulfil {SingleResult}
     */
    static async fetchSingle(iota, channelRoot, index, {channelPassword, messagePassword, height, security} = {}) {
        const {message: response, skipped} = await reader.getMessage(iota, channelRoot, index, {channelPassword, messagePassword, height, security})
        if (!response) {
            return new SingleResult(undefined, index, undefined, skipped)
        }
        const {message, signature, authPathHashes, verifyingKey, nextRoot} = response
        const sigDigest = digest(message, index, authPathHashes, verifyingKey, nextRoot)
        const verified = sign.verifyMessage(signature, sigDigest, verifyingKey)
        if (!verified) {
            throw new Error(Errors.VERIFICATION_FAILED)
        }
        const authenticated = merkle.verifyMerkleTree(channelRoot, verifyingKey, index, authPathHashes)
        if (!authenticated) {
            throw new Error(Errors.AUTHENTICATION_FAILED)
        }
        return new SingleResult(message, index, nextRoot, skipped)
    }
}

/**
 * Container class for the result of a single fetched message.
 * @typedef {object} SingleResult
 * @property {Trytes} message - The fetched message, iff any.
 * @property {number} index - The index of the fetched message.
 * @property {Int8Array} nextRoot - The nextRoot, iff any, provided by the message.
 * @property {Array.<object>} skipped - An array containing skipped bundles that 
 * were found at the same address that the message has. Elements <code>{bundle, error}</code> contain 
 * the bundle hash and the error causing the skipping.
 */
class SingleResult {
    constructor(message, index, nextRoot, skipped) {
        this.message = message
        this.index = index
        this.nextRoot = nextRoot
        this.skipped = skipped
    }
}

/**
 * Conainer class for the result of a fetch request.
 * @typedef {object} FetchResult
 * @property {Array.<Trytes>} messages - Array of found messages, where the message at start index is 
 * the first message in the array. Elements where no message was found will be left empty.
 * @property {Array.<Error>} errors - Array of errors that occured while fetching messages.
 * @property {Array.<Array.<object>>} skipped - An array containing skipped bundles that 
 * were found at the same addresses that the messages have. Elements are arrays containing objects
 * <code>{bundle, error}</code> consisting of the bundle hash and the error causing the skipping.
 * If no bundles where skipped for a message the array element is empty.
 * @property {Array.<Int8Array>} branches - The nextRoot, iff any, provided by a certain message.
 */
class FetchResult {
    constructor(messages, errors, skipped, branches) {
        this.messages = messages
        this.errors = errors
        this.skipped = skipped
        this.branches = branches
    }
}

function getRange(index, start, end) {
    if (index != undefined) {
        if (end) {
            start = start || index
        } else if (start == undefined) {
            start = index
            end = index
        }
    } else if (start == undefined) {
        start = 0
    }
    return {start, end}
}

module.exports = RAAMReader