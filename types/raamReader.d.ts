import {API} from '@iota/core';
import {Trytes} from '@iota/core/typings/types';

export as namespace RAAMReader;

export type Security = 1 | 2 | 3 | 4;

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
 */
export type ReadCallback = (error: Error, index: number, message: Trytes, skipped: any[], nextRoot: Int8Array) => void;

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
export class FetchResult {
    public readonly messages: Trytes[];
    public readonly errors: Error[];
    public readonly skipped: any[][];
    public readonly branches: Int8Array[];

    constructor(messages: Trytes[], errors: Error[], skipped: any[][], branches: Int8Array[]);
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
 */
export class Subscription {
    public readonly start: number;
    public readonly end: number;
    public readonly subscribeFollowing: boolean;
    public readonly callback: ReadCallback;
    
    constructor(start: number, end: number, subscribeFollowing: boolean, callback: ReadCallback, unsubscribe: () => void)

    public unsubscribe(): void;
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
export class SingleResult {
    public readonly message?: Trytes;
    public readonly index: number;
    public readonly nextRoot?: Int8Array;
    public readonly skipped: any[];
    public readonly channelRoot: Int8Array;

    constructor(message: Trytes | undefined, index: number, nextRoot: Int8Array | undefined, skipped: any[] | undefined, channelRoot: Int8Array);
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
 */
export class SingleSubscription {
    public readonly index: number;
    public readonly callback: ReadCallback;
    public readonly channelRoot: Int8Array;
    public readonly subscribeFollowing: boolean;

    public unsubscribe(): void;
}

/**
 * 
 * @classdesc This class is used to read messages from a RAAM channel. Any instance stores read messages by
 * this instance for later use. This way, queries to a node are minimized.
 * 
 */
export class RAAMReader {
    public readonly height?: number;
    public readonly security: Security;
    public readonly channelRoot: Int8Array;
    public channelPassword?: Trytes;
    public iota?: API;
    public cursor: number;
    public readonly messages: Trytes[];
    public readonly branches: Int8Array[];

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
    public constructor(channelRoot: Int8Array, {iota, channelPassword, security, 
        amount, height}: {iota?: API, channelPassword?: Trytes, security?: Security, 
            amount?: number, height?: number});

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
    public syncChannel({iota, callback, messagePassword, messagePasswords}?: 
        {iota?: API, callback?: ReadCallback, messagePassword?: Trytes, 
            messagePasswords?: Trytes[]}): Promise<FetchResult>;
    
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
    public fetch({iota, index, start, end, messagePassword, messagePasswords, callback}?: 
        {iota?: API, index?: number, start?: number, end?: number, messagePassword?: Trytes, 
            messagePasswords?: Trytes[], callback?: ReadCallback}): Promise<FetchResult>;

    /**
     * Reads a single lpublic message with given index or an amount of public messages by giving start and index from 
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
    public fetchPublic({iota, index, start, end, callback}?: 
        {iota?: API, index?: number, start?: number, end?: number, callback?: ReadCallback}): Promise<FetchResult>;

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
    public subscribe(callback: ReadCallback, {serverURL, index, start, end, subscribeFollowing, 
        messagePassword, messagePasswords}?: {serverURL?: string, index?: number, 
            start?: number, end?: number, subscribeFollowing?: boolean, messagePassword?: Trytes, 
            messagePasswords?: Trytes[]}): Subscription | Error;

    public subscribePublic(callback: ReadCallback, {serverURL, index, start, end, subscribeFollowing}?: 
        {serverURL?: string, index?: number, start?: number, end?: number, subscribeFollowing?: boolean}): Subscription | Error;

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
    public static fetchPublicMessages(iota: API, addresses: Trytes[], {callback, channelRoot, height, security}?: 
        {callback?: ReadCallback, channelRoot?: Int8Array, height?: number, security?: Security}): Promise<Map<Trytes, SingleResult>>;

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
    public static fetchMessages(iota: API, channelRoot: Int8Array, 
        {index, start, end, channelPassword, messagePassword, messagePasswords, callback, height, security}?: 
        {index?: number, start?: number, end?: number, channelPassword?: Trytes, messagePassword?: Trytes, 
            messagePasswords: Trytes[], callback?: ReadCallback, height?: number, security?: Security}): Promise<FetchResult>;

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
    public static fetchSingle(iota: API, channelRoot: Int8Array, index: number, 
        {channelPassword, messagePassword, height, security}?: {channelPassword?: Trytes, 
            messagePassword?: Trytes, height?: number, security?: Security}): Promise<SingleResult>;

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
    public static fetchPublic(iota: API, address: Trytes, {index, channelRoot, height, security}?: 
        {index?: number, channelRoot?: Int8Array, height?: number, security?: Security}): Promise<SingleResult>;

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
     * @returns {Subscription} An object containing information about the created subscription, including the 
     * function to end the subscription.
     * @throws {Error} if the serverURL is not passed and hasn't been set already.
     */
    public static subscribeIndex(channelRoot: Int8Array, index: number, callback: ReadCallback, 
        {serverURL, subscribeFollowing, channelPassword, messagePassword, height, security}?: 
            {serverURL?: string, subscribeFollowing?: boolean, channelPassword?: Trytes, messagePassword?: Trytes, height?: number, security?: Security}): SingleSubscription;
    
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
    public static subscribePublic(address: Trytes, callback: ReadCallback, {serverURL, subscribeFollowing, index, channelRoot, height, security}?: 
        {serverURL?: string, subscribeFollowing?: boolean, index: number, channelRoot?: Int8Array, height?: number, security?: Security}): SingleSubscription;
}