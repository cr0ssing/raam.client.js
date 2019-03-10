import {API} from '@iota/core';
import {Trytes, Transfer, Hash} from '@iota/core/typings/types';
import {RAAMReader, Security} from './raamReader';

/**
 * An object containing public and private key for one-time signing a message.
 * @typedef {object} Leaf
 * @property {Int8Array} public - The verifying key as trits.
 * @property {Int8Array} private - The signing key as trits.
 * @property {number} index - The index in the merkle tree at leaf level, representing which message is signed
 * with this key.
 * @property {number} height - The level in the merkle tree, which is always 0.
 */
 export class Leaf {
     public readonly public: Int8Array;
     public readonly private: Int8Array;
     public readonly index: number;
     public readonly height: number; 
 }

/**
 * An object representing a node of a merkle tree with a hash, and the position of the node by height and index.
 * @typedef {object} Node
 * @property {Int8Array} hash - The hash of the direct children of this node in the merkle tree as trits.
 * @property {number} index - The index in the level of the merkle tree from left to right.
 * @property {number} height - The level of the node in the merkle tree.
 */
export class Node {
    public readonly hash: Int8Array;
    public readonly index: number;
    public readonly height: number;
}

/**
 * An object representing a message as transfers for a iota transaction bundle.
 * @typedef {object} MessageTransfers
 * @property {Array.<Transfer>} transfers - The array of transfers forming the transactions of a IOTA bundle.
 * @property {Message} message - The compiled RAAM message with all neccessary information to create its transfers.
 */
export class MessageTransfers {
    public readonly message: Message;
    public readonly transfers: Transfer[];
}

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
 */
export class Message {
    public readonly index: number;
    public readonly height: number;
    public readonly security: Security;
    public readonly message: Trytes;
    public readonly signature: Int8Array;
    public readonly verifyingKey: Int8Array;
    public readonly authPathHashes: Int8Array[];
}

export {RAAMReader} from './raamReader';

/**
 * Callback function that is called after a given timeout to report the progress in channel creation. 
 * @callback ProgressCallback
 * @param {Array.<Leaf>} leafs - an array containing all leafs created since the last callback.
 * @param {Array.<Node>} hashes - an array containing all hashes in the merkle tree created since the last callback.
 */
export type ProgressCallback = (leafs: Leaf[], hashes: Node[]) => void;

/**
 * @classdesc This class is used to publish messages in a RAAM channel. It also provides the methods of {@link RAAMReader}.
 * 
 * @extends RAAMReader
 * @typicalname raam
 */
export class RAAM extends RAAMReader {
    public readonly leafs: Leaf[];
    public readonly hashes: Node[];

    /**
     * @constructs RAAM
     * @param {Array.<Leaf>} leafs - The leafs of the merkle tree which will be used as the signing 
     * keys of the messages.
     * @param {Array.<Node>} hashes - The nodes of the merkle tree which will be used for the 
     * authentication path of the messages.
     * @param {object} [options] - Optional parameters.
     * @param {API} [options.iota] - A composed IOTA API for communication with a full node providing POW.
     * @param {Trytes} [options.channelPassword] - The optional password for the channel as trytes.
     * @throws {Error} if tree is incomplete.
     */
    public constructor(leafs: Leaf[], hashes: Node[], height: number, 
        {iota, channelPassword}?: {iota?: API, channelPassword?: Trytes});

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
    public createMessageTransfers(message: Trytes, {index, tag, messagePassword, nextRoot}?: 
        {index?: number, tag?: Trytes, messagePassword?: Trytes, nextRoot?: Int8Array}): MessageTransfers;

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
     * @fulfil {Hash} - The bundle hash of the attached message.
     * @reject {Error} 
     * - if message is too long
     */
    public publishMessageTransfers(transfers: Transfer[], {message, depth, mwm, iota}?: 
        {message?: Message, depth?: number, mwm?: number, iota?: API}): Promise<Hash>;

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
     * @fulfil {Hash} - The bundle hash of the attached message.
     * @reject {Error} 
     * - if message is too long
     * - if message isn't formatted as trytes.
     * - if index is not between zero and the maximal index of the channel.
     * - if a message was already found at this index.
     */
    public publish(message: Trytes, {index, tag , depth, mwm , iota, messagePassword, nextRoot}?: 
        {index?: number, tag?: Trytes, depth?: number, mwm?: number, iota?: API, 
            messagePassword?: Trytes, nextRoot?: Int8Array}): Promise<Hash>;
    
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
    public static fromSeed(seed: Trytes, {amount, height,
        iota, channelPassword, security , offset, saveToFile, 
        fileName, progressCallback, timeout}?: {amount?: number, height?: number,
            iota?: API, channelPassword?: Trytes, security?: Security , offset?: number, saveToFile?: boolean, 
            fileName?: string, progressCallback?: ProgressCallback, timeout?: number}): Promise<RAAM>;
    
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
    public static fromFile(fileName: string, 
        {iota, channelPassword, seed, amount, height, offset, progressCallback, timeout}?: 
            {iota?: API, channelPassword?: Trytes, seed?: Trytes, amount?: number, height?: number, 
                offset?: number, progressCallback?: ProgressCallback, timeout?: number}): RAAM;
}

export default RAAM;