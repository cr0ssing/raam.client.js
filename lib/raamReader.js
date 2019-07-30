const merkle = require('./merkle')
const sign = require('./sign')
const reader = require('./message')
const {digest, isTrits, intToTrytes, publicPassword} = require('./helpers')
const converter =  require("@iota/converter")
const zmq = require('./zmq')
const {lazy} = require('lazy-arr')

const Errors = {
    VERIFICATION_FAILED: "Verification of message failed. Message digest doesn't match signature.",
    AUTHENTICATION_FAILED: "Authentication of message failed. Channel root could not be reconstructed.",
    PUBLIC_NOT_ALLOWED: 'Public messages can not be read if channel password is set'
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
     * @param {number} [options.height] - The height as a number between 1 and 26 of the channel yielding the maximum 
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
     * @param {number} index - The index of the message.
     * @param {Trytes} message - The fetched message if the request was successful.
     * @param {Array.<object>} skipped - An array containing skipped bundles that 
     * were found at the same address that the message has. Elements <code>{bundle, error}</code> contain 
     * the bundle hash and the error causing the skipping.
     * @param {Int8Array} nextRoot - The nextRoot of the message iff any.
     * @param {Int8Array} channelRoot - The channelRoot of the message.
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
     * If start is set too, index is not used. 
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
        const messages = this.messages
        const intervals = getIntervals(messages, start, end)

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
     * Reads a single public message with given index or an amount of public messages by giving start and index from 
     * the channel. Only indexes where no message is already stored locally are queried from the given full
     * node, since they are immutable. Returns all found messages in an array. Indexes where no message was found
     * will be left empty. Also skipped bundles at the queried addresses, channel roots of provided branches and
     * errors are returned per index as arrays.
     * 
     * @param {Object} [options] - Optional parameters.
     * @param {API} [options.iota] - A composed IOTA API for communication with a full node.
     * @param {number} [options.index] - The index in the channel of the message to fetch. 
     * If start is set too, index is not used. 
     * @param {number} [options.start] - The start index in the channel of the messages to fetch.
     * If start and index aren't set start is 0.
     * @param {number} [options.end] - The end index in the channel of the messages to fetch.
     * If end is undefined messages will be fetched until an index where no message is found is reached.
     * @param {ReadCallback} [options.callback] - Callback function that is called after each message request.
     * 
     * @returns {Promise}
     * @fulfil {FetchResult}
     */
    async fetchPublic({iota = this.iota, index, start, end, callback} = {}) {
        if (this.channelPassword != undefined) {
            throw new Error(Errors.PUBLIC_NOT_ALLOWED)
        }
        const messagePasswords = lazy(i => reader.publicPassword(this.channelRoot, i))
        return this.fetch({iota, index, start, end, messagePasswords, callback})
    }

    /**
     * An object containing information about the created subscription, including the 
     * function to end the subscription.
     * @typedef {object} Subscription
     * @property {number} start - The start index in the channel of the subscribed messages.
     * @property {number} end - The end index in the channel of the subscribed messages.
     * @property {boolean} subscribeFollowing - whether the following index will be subscribed
     * when a message arrives and is not yet present locally or subscribed.
     * @property {ReadCallback} callback - The callback that is called if a subscribed message arrives.
     * @property {Function} unsubscribe - When called the subscription to all specified indexes will be ended.
     */;

    /**
     * Subscribes to a given set of messages in the channel. A callback will be called when a message arrives.
     * Subscriptions to messages already present locally are omitted and a callback is not called for them. The
     * arriving messages are stored locally. 
     * 
     * For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.
     * If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connection
     * is established if the first subscription is created and closed when all subscriptions have been cancelled.
     * 
     * @param {ReadCallback} callback - The callback that is called if a subscribed message arrives.
     * @param {Object} [options] - Optional parameters.
     * @param {String} [options.serverURL] - The URL for the ZMQ stream of an IOTA full node. Is used
     * iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because
     * there is no default.
     * @param {number} [options.index] - The index in the channel of the message to subscribe to. 
     * If start is set too, index is not used. 
     * @param {number} [options.start] - The start index in the channel of the messages to subscribe to.
     * If start and index aren't set start is the first index where no message is present locally.
     * @param {number} [options.end] - The end index in the channel of the messages to fetch.
     * If end is undefined messages will be fetched until an index where no message is found is reached.
     * @param {boolean} [options.subscribeFollowing] - if set to true, when a subscribed message arrives, the 
     * next message will be subscribed, if it's not already present locally and not yet subscribed.
     * @param {Trytes} [options.messagePassword] - The default message password which will be used to decrypt 
     * all found messages.
     * @param {Array.<Trytes>} [options.messagePasswords] - An array containing different message passwords for 
     * different messages. The ith element is the password for the ith message in the channel.
     * 
     * @returns {Subscription} An object containing information about the created subscription, including the 
     * function to end the subscription.
     * @throws {Error} if the serverURL is not passed and hasn't been set already.
     */
    subscribe(callback, {serverURL, index, start, end, subscribeFollowing = false, messagePassword, messagePasswords} = {}) {
        ({start, end} = getRange(index, start, end))
        if (end && end < start) {
            return
        }

        const intervals = getIntervals(this.messages, start, end)
        const last = intervals[intervals.length - 1]
        if (!last.end) {
            last.end = last.start
        }
        const subs = []
        const doSubscribe = i => {
            const wrap = (error, index, message, skipped, nextRoot) => {
                if (message != null) {
                    this.messages[index] = message
                    if (subscribeFollowing && this.messages[i + 1] == undefined
                        && !intervals.some(({start: a, end: b}) => i + 1 >= a && i + 1 <= b)) {
                        doSubscribe(i + 1)
                    }
                }
                callback(error, index, message, skipped, nextRoot, this.channelRoot)
            }

            const pw = messagePasswords == undefined || messagePasswords.length <= i ? messagePassword : messagePasswords[i]
            const sub = RAAMReader.subscribeIndex(this.channelRoot, i, wrap, 
                {serverURL, channelPassword: this.channelPassword, 
                    messagePassword: pw, height: this.height, security: this.security})
            subs.push(sub)
        }
        
        for (let {start: s, end: e} of intervals) {
            for (let i = s; e != undefined ? i <= e : i <= s; i++) {
                doSubscribe(i)
            }
        }
        return {
            start,
            end,
            subscribeFollowing,
            callback,
            unsubscribe() {
                subs.forEach(s => s.unsubscribe())
            }
        }
    }

    /**
     * Subscribes to a given set of public messages in the channel. A callback will be called when a message arrives.
     * Subscriptions to public messages already present locally are omitted and a callback is not called for them. The
     * arriving messages are stored locally. 
     * 
     * For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.
     * If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connection
     * is established if the first subscription is created and closed when all subscriptions have been cancelled.
     * 
     * @param {ReadCallback} callback - The callback that is called if a subscribed message arrives.
     * @param {Object} [options] - Optional parameters.
     * @param {String} [options.serverURL] - The URL for the ZMQ stream of an IOTA full node. Is used
     * iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because
     * there is no default.
     * @param {number} [options.index] - The index in the channel of the message to subscribe to. 
     * If start is set too, index is not used. 
     * @param {number} [options.start] - The start index in the channel of the messages to subscribe to.
     * If start and index aren't set start is the first index where no message is present locally.
     * @param {number} [options.end] - The end index in the channel of the messages to fetch.
     * If end is undefined messages will be fetched until an index where no message is found is reached.
     * @param {boolean} [options.subscribeFollowing] - if set to true, when a subscribed message arrives, the 
     * next message will be subscribed, if it's not already present locally and not yet subscribed.
     * 
     * @returns {Subscription} An object containing information about the created subscription, including the 
     * function to end the subscription.
     * @throws {Error} if the serverURL is not passed and hasn't been set already.
     */
    subscribePublic(callback, {serverURL, index, start, end, subscribeFollowing = false} = {}) {
        if (this.channelPassword != undefined) {
            throw new Error(Errors.PUBLIC_NOT_ALLOWED)
        }
        const messagePasswords = lazy(i => reader.publicPassword(this.channelRoot, i))
        return this.subscribe(callback, {serverURL, index, start, end, subscribeFollowing, messagePasswords})
    }

    /**
     * Reads one or more messages located by their addresses. Returns all found messages in a Map mapping addresses to
     * SingleResult objects. Also skipped bundles at the queried addresses, channel roots of provided branches and
     * errors are returned in the SingleResults.
     * 
     * @param {API} iota - A composed IOTA API for communication with a full node.
     * @param {Array.<Trytes>} address - An array of IOTA addresses used to locate the messages.
     * @param {Object} [options] - Optional parameters.
     * @param {ReadCallback} [options.callback] - Callback function that is called after each message request.
     * @param {Int8Array} [options.channelRoot] - The channel root by that the channel is identified as trits. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.security] - The security of the signing and encryption keys as a number between 1 and 4. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.height] - The height as a number between 1 and 26 of the channel yielding the maximum 
     * amount of messages of the channel. This is parameter is only used as an extra verification information.
     * 
     * @returns {Promise}
     * @fulfil {Map.<Trytes, SingleResult>}
     */
    static async fetchPublicMessages(iota, addresses, {callback, channelRoot, height, security} = {}) {
        const result = new Map()
        for (let address of addresses) {
            try {
                const singleResult = await RAAMReader.fetchPublic(iota, address, {channelRoot, height, security})
                result.set(address, singleResult)
                if (callback) {
                    await callback(undefined, singleResult.index, singleResult.message, singleResult.skipped, 
                        singleResult.nextRoot, singleResult.channelRoot)
                }
            } catch (e) {
                if (callback) {
                    await callback(e, undefined, undefined)
                }
                result.set(address, e)
            }
        }
        return result
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
     * If start is set too, index is not used. 
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
     * @param {number} [options.height] - The height as a number between 1 and 26 of the channel yielding the maximum 
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
                if (messagePasswords) {
                    messagePasswords[i]
                }
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
                            await callback(undefined, index, undefined, singleSkipped, undefined, channelRoot)
                        }
                        break;
                    }
                } else {
                    result.messages[arrayIndex] = message
                }
                
                if (callback) {
                    await callback(undefined, index, message, singleSkipped, nextRoot, channelRoot)
                }
            } catch (e) {
                if (callback) {
                    await callback(e, index, undefined, undefined, undefined, channelRoot)
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
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @param {Trytes} [options.messagePassword] - The message password which will be used to decrypt 
     * the found message.
     * @param {number} [options.security] - The security of the signing and encryption keys as a number between 1 and 4. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.height] - The height as a number between 1 and 26 of the channel yielding the maximum 
     * amount of messages of the channel. This is parameter is only used as an extra verification information.
     * 
     * @returns {Promise}
     * @fulfil {SingleResult}
     */
    static async fetchSingle(iota, channelRoot, index, {channelPassword, messagePassword, height, security} = {}) {
        const {message: response, skipped} = await reader.getMessage(iota, channelRoot, index, {channelPassword, messagePassword, height, security})
        if (!response) {
            return new SingleResult(undefined, index, undefined, skipped, channelRoot)
        }
        return processMessage(response, channelRoot, index, skipped)
    }

    /**
     * Reads a single public message from the given address. Returns the
     * found message iff any, the index, skipped bundles at the queried address and errors.
     * 
     * @param {API} iota - A composed IOTA API for communication with a full node.
     * @param {Trytes} address - An IOTA address used to locate the message.
     * @param {Object} [options] - Optional parameters.
     * @param {number} [options.index] - The index in the channel of the message to fetch. Not used for locating message. 
     * This is parameter is only used as an extra verification information.
     * @param {Int8Array} [options.channelRoot] - The channel root by that the channel is identified as trits. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.security] - The security of the signing and encryption keys as a number between 1 and 4. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.height] - The height as a number between 1 and 26 of the channel yielding the maximum 
     * amount of messages of the channel. This is parameter is only used as an extra verification information.
     * 
     * @returns {Promise}
     * @fulfil {SingleResult}
     */
    static async fetchPublic(iota, address, {index, channelRoot, height, security} = {}) {
        const {message: response, skipped} = await reader.getPublicMessage(iota, address, {index, height, security})
        if (!response) {
            return new SingleResult(undefined, index, undefined, skipped)
        }
        if (!channelRoot) {
            channelRoot = merkle.recreateMerkleTree(response.verifyingKey, response.index, response.authPathHashes)
        }
        return processMessage(response, channelRoot, index, skipped)
    }

    /**
     * An object containing information about the created subscription, including the 
     * function to end the subscription.
     * @typedef {object} SingleSubscription
     * @property {number} index - The index of the currently subscribed message.
     * @property {Int8Array} channelRoot - The channel root by that the channel is identified as trits.
     * @property {boolean} subscribeFollowing - whether the following index will be subscribed
     * when a message arrives.
     * @property {ReadCallback} callback - The callback that is called if a subscribed message arrives.
     * @property {Function} unsubscribe - When called the current subscription will be ended.
     */;

    /**
     * Subscribes to a given index in a RAAM channel. A callback will be called when a message arrives.
     * 
     * For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.
     * If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connection
     * is established if the first subscription is created and closed when all subscriptions have been cancelled.
     * 
     * @param {Int8Array} channelRoot - The channel root by that the channel is identified as trits.
     * @param {number} index - The index in the channel of the message to subscribe to. 
     * @param {ReadCallback} callback - The callback that is called if a subscribed message arrives.
     * @param {Object} [options] - Optional parameters.
     * @param {String} [options.serverURL] - The URL for the ZMQ stream of an IOTA full node. Is used
     * iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because
     * there is no default.
     * @param {boolean} [options.subscribeFollowing] - if set to true, when a subscribed message arrives, the 
     * next message will be subscribed.
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @param {Trytes} [options.messagePassword] - The message password which will be used to decrypt 
     * the found message.
     * @param {number} [options.security] - The security of the signing and encryption keys as a number between 1 and 4. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.height] - The height as a number between 1 and 26 of the channel yielding the maximum 
     * amount of messages of the channel. This is parameter is only used as an extra verification information.
     * 
     * @returns {SingleSubscription} An object containing information about the created subscription, including the 
     * function to end the subscription.
     * @throws {Error} if the serverURL is not passed and hasn't been set already.
     */
    static subscribeIndex(channelRoot, index, callback, {serverURL, subscribeFollowing = false, channelPassword, messagePassword, height, security, origin} = {}) {
        if (serverURL) {
            zmq.setServerAddress(serverURL)
        }
        const indexTrits = converter.trits(intToTrytes(index))
        const address = reader.getAddress(channelRoot, channelPassword, indexTrits)
        const key = reader.getKey(channelRoot, channelPassword, indexTrits, messagePassword)
        let result = origin || {index, callback, channelRoot, subscribeFollowing}
        let sub
        sub = zmq.subscribe(address, bundle => {
            try {
                const response = reader.processBundle(bundle, key, {index, height, security})
                try {
                    const {message, nextRoot} = processMessage(response, channelRoot, index)
                    callback(null, index, message, [], nextRoot, channelRoot)
                    if (subscribeFollowing) {
                        const newSub = this.subscribeIndex(channelRoot, index + 1, callback, 
                            {serverURL, subscribeFollowing, channelPassword, messagePassword, height, security, origin: result})
                        result.index = index + 1
                        result.unsubscribe = newSub.unsubscribe
                    }
                    sub.unsubscribe()
                } catch (e2) {
                    // error in the verification of the message
                    callback(e2, index, undefined, undefined, undefined, channelRoot)
                }
            } catch (e) {
                // error in the formatting of the message
                const bundle = bundle[0].bundle
                callback(null, index, null, [{bundle, error}], undefined, channelRoot)
            }
        })
        result.unsubscribe = sub.unsubscribe
        return result
    }

    /**
     * An object containing information about the created subscription, including the 
     * function to end the subscription.
     * @typedef {object} SingleSubscription
     * @property {number} index - The index of the currently subscribed message.
     * @property {Int8Array} channelRoot - The channel root by that the channel is identified as trits.
     * @property {boolean} subscribeFollowing - whether the following index will be subscribed
     * when a message arrives.
     * @property {ReadCallback} callback - The callback that is called if a subscribed message arrives.
     * @property {Function} unsubscribe - When called the current subscription will be ended.
     */;

    /**
     * Subscribes to public RAAM messages on a given address. A callback will be called when a message arrives.
     * 
     * For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.
     * If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connection
     * is established if the first subscription is created and closed when all subscriptions have been cancelled.
     * 
     * @param {Trytes} address - An IOTA address used to locate the message.
     * @param {ReadCallback} callback - The callback that is called if a subscribed message arrives.
     * @param {Object} [options] - Optional parameters.
     * @param {String} [options.serverURL] - The URL for the ZMQ stream of an IOTA full node. Is used
     * iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because
     * there is no default.
     * @param {boolean} [options.subscribeFollowing] - if set to true, when a subscribed message arrives, the 
     * next message will be subscribed.
     * @param {number} [options.index] - The index in the channel of the message to subscribe to.
     * This is parameter is only used as an extra verification information.
     * @param {Int8Array} [options.channelRoot] - The channel root by that the channel is identified as trits.
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.security] - The security of the signing and encryption keys as a number between 1 and 4. 
     * This is parameter is only used as an extra verification information.
     * @param {number} [options.height] - The height as a number between 1 and 26 of the channel yielding the maximum 
     * amount of messages of the channel. This is parameter is only used as an extra verification information.
     * 
     * @returns {SingleSubscription} An object containing information about the created subscription, including the 
     * function to end the subscription.
     * @throws {Error} if the serverURL is not passed and hasn't been set already.
     */
    static subscribePublic(address, callback, {serverURL, subscribeFollowing = false, index, channelRoot, height, security, origin} = {}) {
        if (serverURL) {
            zmq.setServerAddress(serverURL)
        }
        let result = origin || {index, callback, channelRoot, subscribeFollowing}
        const sub = zmq.subscribe(address, bundle => {
            try {
                const response = reader.processBundle(bundle, address, {index, height, security})
                if (!channelRoot) {
                    channelRoot = merkle.recreateMerkleTree(response.verifyingKey, response.index, response.authPathHashes)
                    result.channelRoot = channelRoot
                }
                if (index === undefined) {
                    index = response.index
                    result.index = index
                }
                try {
                    const {message, nextRoot} = processMessage(response, channelRoot, index)
                    callback(null, index, message, [], nextRoot, channelRoot)
                    if (subscribeFollowing) {
                        const nextIndexTrits = converter.trits(intToTrytes(index + 1))
                        const nextAddress = reader.getAddress(channelRoot, undefined, nextIndexTrits)
                        const newSub = this.subscribePublic(nextAddress, callback, 
                            {serverURL, subscribeFollowing, channelRoot, index: index + 1, height, security, origin: result})
                        result.index = index + 1
                        result.unsubscribe = newSub.unsubscribe
                    }
                    sub.unsubscribe()
                } catch (e2) {
                    // error in the verification of the message
                    callback(e2, index, undefined, undefined, undefined, channelRoot)
                }
            } catch (e) {
                // error in the formatting of the message
                const bundle = bundle[0].bundle
                callback(null, index, null, [{bundle, error}], undefined, channelRoot)
            }
        })
        result.unsubscribe = sub.unsubscribe
        return result
    }
}

function getIntervals(messages, start, end) {
    const intervals = []
    // check if requested messages are already stored
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
    return intervals
}

function processMessage(response, channelRoot, index, skipped) {
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
    return new SingleResult(message, index, nextRoot, skipped, channelRoot)
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
 * @property {Int8Array} channelRoot - The channelRoot of the message.
 */
class SingleResult {
    constructor(message, index, nextRoot, skipped, channelRoot) {
        this.message = message
        this.index = index
        this.nextRoot = nextRoot
        this.skipped = skipped
        this.channelRoot = channelRoot
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

RAAMReader.SingleResult = SingleResult
RAAMReader.FetchResult = FetchResult

module.exports = RAAMReader