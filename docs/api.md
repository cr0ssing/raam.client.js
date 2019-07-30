# API Reference
## Classes

<dl>
<dt><a href="#RAAM">RAAM</a> ⇐ <code><a href="#RAAMReader">RAAMReader</a></code></dt>
<dd><p>This class is used to publish messages in a RAAM channel. It also provides the methods of <a href="#RAAMReader">RAAMReader</a>.</p>
</dd>
<dt><a href="#RAAMReader">RAAMReader</a></dt>
<dd><p>This class is used to read messages from a RAAM channel. Any instance stores read messages by
this instance for later use. This way, queries to a node are minimized.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Leaf">Leaf</a> : <code>object</code></dt>
<dd><p>An object containing public and private key for one-time signing a message.</p>
</dd>
<dt><a href="#Node">Node</a> : <code>object</code></dt>
<dd><p>An object representing a node of a merkle tree with a hash, and the position of the node by height and index.</p>
</dd>
<dt><a href="#MessageTransfers">MessageTransfers</a> : <code>object</code></dt>
<dd><p>An object representing a message as transfers for a iota transaction bundle.</p>
</dd>
<dt><a href="#Message">Message</a> : <code>object</code></dt>
<dd><p>An object representing the compiled RAAM message with all neccessary information to create its transfers.</p>
</dd>
<dt><a href="#ProgressCallback">ProgressCallback</a> : <code>function</code></dt>
<dd><p>Callback function that is called after a given timeout to report the progress in channel creation.</p>
</dd>
<dt><a href="#ReadCallback">ReadCallback</a> : <code>function</code></dt>
<dd><p>Callback function that is called after each message request.</p>
</dd>
<dt><a href="#Subscription">Subscription</a> : <code>object</code></dt>
<dd><p>An object containing information about the created subscription, including the 
function to end the subscription.</p>
</dd>
<dt><a href="#SingleSubscription">SingleSubscription</a> : <code>object</code></dt>
<dd><p>An object containing information about the created subscription, including the 
function to end the subscription.</p>
</dd>
<dt><a href="#SingleSubscription">SingleSubscription</a> : <code>object</code></dt>
<dd><p>An object containing information about the created subscription, including the 
function to end the subscription.</p>
</dd>
<dt><a href="#SingleResult">SingleResult</a> : <code>object</code></dt>
<dd><p>Container class for the result of a single fetched message.</p>
</dd>
<dt><a href="#FetchResult">FetchResult</a> : <code>object</code></dt>
<dd><p>Conainer class for the result of a fetch request.</p>
</dd>
</dl>

<a name="RAAM"></a>

## RAAM ⇐ [<code>RAAMReader</code>](#RAAMReader)
This class is used to publish messages in a RAAM channel. It also provides the methods of [RAAMReader](#RAAMReader).

**Kind**: global class  
**Extends**: [<code>RAAMReader</code>](#RAAMReader)  

* [RAAM](#RAAM) ⇐ [<code>RAAMReader</code>](#RAAMReader)
    * [new RAAM(leafs, hashes, height, [options])](#new_RAAM_new)
    * _instance_
        * [.createPublicMessageTransfers(message, [options])](#RAAM+createPublicMessageTransfers) ⇒ [<code>MessageTransfers</code>](#MessageTransfers)
        * [.createMessageTransfers(message, [options])](#RAAM+createMessageTransfers) ⇒ [<code>MessageTransfers</code>](#MessageTransfers)
        * [.publishMessageTransfers(transfers, [options])](#RAAM+publishMessageTransfers) ⇒ <code>Promise</code>
        * [.publishPublic(message, [options])](#RAAM+publishPublic) ⇒ <code>Promise</code>
        * [.publish(message, [options])](#RAAM+publish) ⇒ <code>Promise</code>
        * [.syncChannel([options])](#RAAMReader+syncChannel) ⇒ <code>Promise</code>
        * [.fetch([options])](#RAAMReader+fetch) ⇒ <code>Promise</code>
        * [.fetchPublic([options])](#RAAMReader+fetchPublic) ⇒ <code>Promise</code>
        * [.subscribe(callback, [options])](#RAAMReader+subscribe) ⇒ [<code>Subscription</code>](#Subscription)
        * [.subscribePublic(callback, [options])](#RAAMReader+subscribePublic) ⇒ [<code>Subscription</code>](#Subscription)
    * _static_
        * [.fromSeed(seed, [options])](#RAAM.fromSeed) ⇒ <code>Promise</code>
        * [.fromFile(fileName, [options])](#RAAM.fromFile) ⇒ [<code>RAAM</code>](#RAAM)

<a name="new_RAAM_new"></a>

### new RAAM(leafs, hashes, height, [options])

| Param | Type | Description |
| --- | --- | --- |
| leafs | [<code>Array.&lt;Leaf&gt;</code>](#Leaf) | The leafs of the merkle tree which will be used as the signing  keys of the messages. |
| hashes | [<code>Array.&lt;Node&gt;</code>](#Node) | The nodes of the merkle tree which will be used for the  authentication path of the messages. |
| height | <code>number</code> | A number between 1 and 26 representing the height  of the merkle tree used for this channel. |
| [options] | <code>object</code> | Optional parameters. |
| [options.iota] | <code>API</code> | A composed IOTA API for communication with a full node providing POW. |
| [options.channelPassword] | <code>Trytes</code> | The optional password for the channel as trytes. |

<a name="RAAM+createPublicMessageTransfers"></a>

### raam.createPublicMessageTransfers(message, [options]) ⇒ [<code>MessageTransfers</code>](#MessageTransfers)
Compiles the authentication path and a signature using the correct signing key. Converts the encrypted payloadof the message into transaction transfers. This message can be decoded by only using its address.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Throws**:

- - if message isn't formatted as trytes.- if index is not between zero and the maximal index of the channel.- if a message was already found at this index.- if channel password is set.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| message | <code>Trytes</code> |  | The message to attach to the channel as trytes. |
| [options] | <code>object</code> |  | Optional parameters. |
| [options.index] | <code>number</code> | <code>this.cursor</code> | The index of the message in the channel. |
| [options.tag] | <code>Trytes</code> | <code>&#x27;RAAM&#x27;</code> | Tag |
| [options.nextRoot] | <code>Int8Array</code> |  | The root of another channel, used for branching or when channel is exausted. |

<a name="RAAM+createMessageTransfers"></a>

### raam.createMessageTransfers(message, [options]) ⇒ [<code>MessageTransfers</code>](#MessageTransfers)
Compiles the authentication path and a signature using the correct signing key. Converts the encrypted payloadof the message into transaction transfers.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Throws**:

- - if message isn't formatted as trytes.- if index is not between zero and the maximal index of the channel.- if a message was already found at this index.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| message | <code>Trytes</code> |  | The message to attach to the channel as trytes. |
| [options] | <code>object</code> |  | Optional parameters. |
| [options.index] | <code>number</code> | <code>this.cursor</code> | The index of the message in the channel. |
| [options.tag] | <code>Trytes</code> | <code>&#x27;RAAM&#x27;</code> | Tag |
| [options.messagePassword] | <code>Trytes</code> |  | The password to encrypt this message with. |
| [options.nextRoot] | <code>Int8Array</code> |  | The root of another channel, used for branching or when channel is exausted. |

<a name="RAAM+publishMessageTransfers"></a>

### raam.publishMessageTransfers(transfers, [options]) ⇒ <code>Promise</code>
Takes transaction transfers and converts them into a transaction bundle, which is then attached to the tangle. POW is done remotely. Increases the cursor, so that it points to the next index where a message can be attached. Message is stored locally after publishing.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Fulfil**: <code>Transaction[]</code> - The bundle of the attached message.  
**Reject**: <code>Error</code> - if message is too long  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| transfers | <code>Array.&lt;Transfer&gt;</code> |  | The array of transfers forming the transactions of a IOTA bundle. |
| [options] | <code>object</code> |  | Optional parameters. |
| [options.message] | [<code>Message</code>](#Message) |  | The compiled RAAM message with all neccessary information to create its transfers. If it's passed message will be stored locally after publishing. |
| [options.depth] | <code>number</code> | <code>3</code> | Depth |
| [options.mwm] | <code>number</code> | <code>14</code> | Min weight magnitude |
| [options.iota] | <code>API</code> | <code>this.iota</code> | A composed IOTA API for communication with a full node providing POW. |

<a name="RAAM+publishPublic"></a>

### raam.publishPublic(message, [options]) ⇒ <code>Promise</code>
Compiles the authentication path and a signature using the correct signing key. Converts the encrypted payloadof the message into a transaction bundle, which is then attached to the tangle. POW is done remotely.Increases the cursor, so that it points to the next index where a message can be attached.  Message is stored locally after publishing. This message can be decoded by only using its address.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Fulfil**: <code>Transaction[]</code> - The bundle of the attached message.  
**Reject**: <code>Error</code> - if message is too long- if message isn't formatted as trytes.- if index is not between zero and the maximal index of the channel.- if a message was already found at this index.- if channel password is set.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| message | <code>Trytes</code> |  | The message to attach to the channel as trytes. |
| [options] | <code>object</code> |  | Optional parameters. |
| [options.index] | <code>number</code> | <code>this.cursor</code> | The index of the message in the channel. |
| [options.tag] | <code>Trytes</code> | <code>&#x27;RAAM&#x27;</code> | Tag |
| [options.depth] | <code>number</code> | <code>3</code> | Depth |
| [options.mwm] | <code>number</code> | <code>14</code> | Min weight magnitude |
| [options.iota] | <code>API</code> | <code>this.iota</code> | A composed IOTA API for communication with a full node providing POW. |
| [options.nextRoot] | <code>Int8Array</code> |  | The root of another channel, used for branching or when channel is exausted. |

<a name="RAAM+publish"></a>

### raam.publish(message, [options]) ⇒ <code>Promise</code>
Compiles the authentication path and a signature using the correct signing key. Converts the encrypted payloadof the message into a transaction bundle, which is then attached to the tangle. POW is done remotely.Increases the cursor, so that it points to the next index where a message can be attached.  Message is stored locally after publishing.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Fulfil**: <code>Transaction[]</code> - The bundle of the attached message.  
**Reject**: <code>Error</code> - if message is too long- if message isn't formatted as trytes.- if index is not between zero and the maximal index of the channel.- if a message was already found at this index.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| message | <code>Trytes</code> |  | The message to attach to the channel as trytes. |
| [options] | <code>object</code> |  | Optional parameters. |
| [options.index] | <code>number</code> | <code>this.cursor</code> | The index of the message in the channel. |
| [options.tag] | <code>Trytes</code> | <code>&#x27;RAAM&#x27;</code> | Tag |
| [options.depth] | <code>number</code> | <code>3</code> | Depth |
| [options.mwm] | <code>number</code> | <code>14</code> | Min weight magnitude |
| [options.iota] | <code>API</code> | <code>this.iota</code> | A composed IOTA API for communication with a full node providing POW. |
| [options.messagePassword] | <code>Trytes</code> |  | The password to encrypt this message with. |
| [options.nextRoot] | <code>Int8Array</code> |  | The root of another channel, used for branching or when channel is exausted. |

<a name="RAAMReader+syncChannel"></a>

### raam.syncChannel([options]) ⇒ <code>Promise</code>
Reads messages from the channel until the index where no message is found. Alle found messages will be stored locallyand be returned. Sets the cursor to the first index where no message was found.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Fulfil**: [<code>FetchResult</code>](#FetchResult)  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Optional parameters. |
| [options.iota] | <code>API</code> | A composed IOTA API for communication with a full node. |
| [options.callback] | [<code>ReadCallback</code>](#ReadCallback) | Callback function that is called after each message request. |
| [options.messagePassword] | <code>Trytes</code> | The default message password which will be used to decrypt  all found messages. |
| [options.messagePasswords] | <code>Array.&lt;Trytes&gt;</code> | An array containing different message passwords for  different messages. The ith element is the password for the ith message in the channel. |

<a name="RAAMReader+fetch"></a>

### raam.fetch([options]) ⇒ <code>Promise</code>
Reads a single message with given index or an amount of messages by giving start and index from the channel. Only indexes where no message is already stored locally are queried from the given fullnode, since they are immutable. Returns all found messages in an array. Indexes where no message was foundwill be left empty. Also skipped bundles at the queried addresses, channel roots of provided branches anderrors are returned per index as arrays.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Fulfil**: [<code>FetchResult</code>](#FetchResult)  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Optional parameters. |
| [options.iota] | <code>API</code> | A composed IOTA API for communication with a full node. |
| [options.index] | <code>number</code> | The index in the channel of the message to fetch.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to fetch. If start and index aren't set start is 0. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.callback] | [<code>ReadCallback</code>](#ReadCallback) | Callback function that is called after each message request. |
| [options.messagePassword] | <code>Trytes</code> | The default message password which will be used to decrypt  all found messages. |
| [options.messagePasswords] | <code>Array.&lt;Trytes&gt;</code> | An array containing different message passwords for  different messages. The ith element is the password for the ith message in the channel. |

<a name="RAAMReader+fetchPublic"></a>

### raam.fetchPublic([options]) ⇒ <code>Promise</code>
Reads a single public message with given index or an amount of public messages by giving start and index from the channel. Only indexes where no message is already stored locally are queried from the given fullnode, since they are immutable. Returns all found messages in an array. Indexes where no message was foundwill be left empty. Also skipped bundles at the queried addresses, channel roots of provided branches anderrors are returned per index as arrays.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Fulfil**: [<code>FetchResult</code>](#FetchResult)  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Optional parameters. |
| [options.iota] | <code>API</code> | A composed IOTA API for communication with a full node. |
| [options.index] | <code>number</code> | The index in the channel of the message to fetch.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to fetch. If start and index aren't set start is 0. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.callback] | [<code>ReadCallback</code>](#ReadCallback) | Callback function that is called after each message request. |

<a name="RAAMReader+subscribe"></a>

### raam.subscribe(callback, [options]) ⇒ [<code>Subscription</code>](#Subscription)
Subscribes to a given set of messages in the channel. A callback will be called when a message arrives.Subscriptions to messages already present locally are omitted and a callback is not called for them. Thearriving messages are stored locally. For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connectionis established if the first subscription is created and closed when all subscriptions have been cancelled.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Returns**: [<code>Subscription</code>](#Subscription) - An object containing information about the created subscription, including the function to end the subscription.  
**Throws**:

- <code>Error</code> if the serverURL is not passed and hasn't been set already.


| Param | Type | Description |
| --- | --- | --- |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.serverURL] | <code>String</code> | The URL for the ZMQ stream of an IOTA full node. Is used iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because there is no default. |
| [options.index] | <code>number</code> | The index in the channel of the message to subscribe to.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to subscribe to. If start and index aren't set start is the first index where no message is present locally. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.subscribeFollowing] | <code>boolean</code> | if set to true, when a subscribed message arrives, the  next message will be subscribed, if it's not already present locally and not yet subscribed. |
| [options.messagePassword] | <code>Trytes</code> | The default message password which will be used to decrypt  all found messages. |
| [options.messagePasswords] | <code>Array.&lt;Trytes&gt;</code> | An array containing different message passwords for  different messages. The ith element is the password for the ith message in the channel. |

<a name="RAAMReader+subscribePublic"></a>

### raam.subscribePublic(callback, [options]) ⇒ [<code>Subscription</code>](#Subscription)
Subscribes to a given set of public messages in the channel. A callback will be called when a message arrives.Subscriptions to public messages already present locally are omitted and a callback is not called for them. Thearriving messages are stored locally. For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connectionis established if the first subscription is created and closed when all subscriptions have been cancelled.

**Kind**: instance method of [<code>RAAM</code>](#RAAM)  
**Returns**: [<code>Subscription</code>](#Subscription) - An object containing information about the created subscription, including the function to end the subscription.  
**Throws**:

- <code>Error</code> if the serverURL is not passed and hasn't been set already.


| Param | Type | Description |
| --- | --- | --- |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.serverURL] | <code>String</code> | The URL for the ZMQ stream of an IOTA full node. Is used iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because there is no default. |
| [options.index] | <code>number</code> | The index in the channel of the message to subscribe to.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to subscribe to. If start and index aren't set start is the first index where no message is present locally. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.subscribeFollowing] | <code>boolean</code> | if set to true, when a subscribed message arrives, the  next message will be subscribed, if it's not already present locally and not yet subscribed. |

<a name="RAAM.fromSeed"></a>

### RAAM.fromSeed(seed, [options]) ⇒ <code>Promise</code>
Creates a RAAM channel from a seed. For that a merkle tree is created consisting of all one-time signing keys thatsign the messages of the channel. For bigger values of height/amount this can take a while.After creation a RAAM instance for read/write operations of the channel is returned.It's possible to save the merkle tree to a file, which can be used to fastly reinitialize the channel. This file needs tobe stored in save place, as everybody who accesses it can publishes messages to this channel.Feedback in the creation process is provided by an optional callback.

**Kind**: static method of [<code>RAAM</code>](#RAAM)  
**Fulfil**: [<code>RAAM</code>](#RAAM)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| seed | <code>Trytes</code> |  | The seed from which the signing keys are created. |
| [options] | <code>object</code> |  | Optional parameters. |
| [options.amount] | <code>number</code> |  | The maximum amount of messages that can be published in this channel. |
| [options.height] | <code>number</code> | <code>Math.ceil(Math.log2(amount))</code> | A number between 1 and 26 representing the height  of the merkle tree used for this channel. |
| [options.iota] | <code>API</code> | <code>this.iota</code> | A composed IOTA API for communication with a full node providing POW. |
| [options.channelPassword] | <code>Trytes</code> |  | The optional password for the channel as trytes. |
| [options.security] | <code>number</code> | <code>2</code> | The security of the signing and encryption keys as a number between 1 and 4. |
| [options.offset] | <code>number</code> | <code>0</code> | The starting index used for building the subroots from which the keys are created. |
| [options.saveToFile] | <code>boolean</code> | <code>false</code> | whether to save the created merkle tree to a file, which can be used for fast reinitializing the channel. |
| [options.fileName] | <code>string</code> | <code>&quot;channelKeys.json&quot;</code> | The filename of the file where the merkle tree is saved. |
| [options.progressCallback] | [<code>ProgressCallback</code>](#ProgressCallback) |  | A callback function called after the given timeout reporting the progress of the channel creation. |
| [options.timeout] | <code>number</code> | <code>5000</code> | The timeout after the progressCallback is triggered. |

<a name="RAAM.fromFile"></a>

### RAAM.fromFile(fileName, [options]) ⇒ [<code>RAAM</code>](#RAAM)
Initializes a RAAM channel from a file containing the signing keys for this channel.

**Kind**: static method of [<code>RAAM</code>](#RAAM)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| fileName | <code>string</code> |  | The name of the file to load. |
| [options] | <code>object</code> |  | Optional parameters. |
| [options.iota] | <code>API</code> | <code>this.iota</code> | A composed IOTA API for communication with a full node providing POW. |
| [options.channelPassword] | <code>Trytes</code> |  | The optional password for the channel as trytes. |
| [options.amount] | <code>number</code> |  | The maximum amount of messages that can be published in this channel. |
| [options.height] | <code>number</code> | <code>Math.ceil(Math.log2(amount))</code> | A number between 1 and 26 representing the height  of the merkle tree used for this channel. |
| [options.seed] | <code>Trytes</code> |  | The seed from which the signing keys are created. |
| [options.offset] | <code>number</code> | <code>0</code> | The starting index used for building the subroots from which the keys are created. |
| [options.progressCallback] | [<code>ProgressCallback</code>](#ProgressCallback) |  | A callback function called after the given timeout reporting the progress of the channel creation. |
| [options.timeout] | <code>number</code> | <code>5000</code> | The timeout after the progressCallback is triggered. |

<a name="RAAMReader"></a>

## RAAMReader
This class is used to read messages from a RAAM channel. Any instance stores read messages bythis instance for later use. This way, queries to a node are minimized.

**Kind**: global class  

* [RAAMReader](#RAAMReader)
    * [new RAAMReader(channelRoot, [options])](#new_RAAMReader_new)
    * _instance_
        * [.syncChannel([options])](#RAAMReader+syncChannel) ⇒ <code>Promise</code>
        * [.fetch([options])](#RAAMReader+fetch) ⇒ <code>Promise</code>
        * [.fetchPublic([options])](#RAAMReader+fetchPublic) ⇒ <code>Promise</code>
        * [.subscribe(callback, [options])](#RAAMReader+subscribe) ⇒ [<code>Subscription</code>](#Subscription)
        * [.subscribePublic(callback, [options])](#RAAMReader+subscribePublic) ⇒ [<code>Subscription</code>](#Subscription)
    * _static_
        * [.fetchPublicMessages(iota, address, [options])](#RAAMReader.fetchPublicMessages) ⇒ <code>Promise</code>
        * [.fetchMessages(iota, channelRoot, [options])](#RAAMReader.fetchMessages) ⇒ <code>Promise</code>
        * [.fetchSingle(iota, channelRoot, index, [options])](#RAAMReader.fetchSingle) ⇒ <code>Promise</code>
        * [.fetchPublic(iota, address, [options])](#RAAMReader.fetchPublic) ⇒ <code>Promise</code>
        * [.subscribeIndex(channelRoot, index, callback, [options])](#RAAMReader.subscribeIndex) ⇒ [<code>SingleSubscription</code>](#SingleSubscription)
        * [.subscribePublic(address, callback, [options])](#RAAMReader.subscribePublic) ⇒ [<code>SingleSubscription</code>](#SingleSubscription)

<a name="new_RAAMReader_new"></a>

### new RAAMReader(channelRoot, [options])

| Param | Type | Description |
| --- | --- | --- |
| channelRoot | <code>Int8Array</code> | The channel root by that the channel is identified as trits. |
| [options] | <code>object</code> | Optional parameters. |
| [options.iota] | <code>API</code> | A composed IOTA API for communication with a full node. |
| [options.channelPassword] | <code>Trytes</code> | The optional password for the channel as trytes. |
| [options.security] | <code>number</code> | The security of the signing and encryption keys as a number between 1 and 4.  This is parameter is only used as an extra verification information. |
| [options.amount] | <code>number</code> | The maximum amount of messages in this channel.  From this the height of the channel can be calculated. This is parameter is only used as an extra verification information. |
| [options.height] | <code>number</code> | The height as a number between 1 and 26 of the channel yielding the maximum  amount of messages of the channel. This is parameter is only used as an extra verification information. |

<a name="RAAMReader+syncChannel"></a>

### raamReader.syncChannel([options]) ⇒ <code>Promise</code>
Reads messages from the channel until the index where no message is found. Alle found messages will be stored locallyand be returned. Sets the cursor to the first index where no message was found.

**Kind**: instance method of [<code>RAAMReader</code>](#RAAMReader)  
**Fulfil**: [<code>FetchResult</code>](#FetchResult)  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Optional parameters. |
| [options.iota] | <code>API</code> | A composed IOTA API for communication with a full node. |
| [options.callback] | [<code>ReadCallback</code>](#ReadCallback) | Callback function that is called after each message request. |
| [options.messagePassword] | <code>Trytes</code> | The default message password which will be used to decrypt  all found messages. |
| [options.messagePasswords] | <code>Array.&lt;Trytes&gt;</code> | An array containing different message passwords for  different messages. The ith element is the password for the ith message in the channel. |

<a name="RAAMReader+fetch"></a>

### raamReader.fetch([options]) ⇒ <code>Promise</code>
Reads a single message with given index or an amount of messages by giving start and index from the channel. Only indexes where no message is already stored locally are queried from the given fullnode, since they are immutable. Returns all found messages in an array. Indexes where no message was foundwill be left empty. Also skipped bundles at the queried addresses, channel roots of provided branches anderrors are returned per index as arrays.

**Kind**: instance method of [<code>RAAMReader</code>](#RAAMReader)  
**Fulfil**: [<code>FetchResult</code>](#FetchResult)  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Optional parameters. |
| [options.iota] | <code>API</code> | A composed IOTA API for communication with a full node. |
| [options.index] | <code>number</code> | The index in the channel of the message to fetch.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to fetch. If start and index aren't set start is 0. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.callback] | [<code>ReadCallback</code>](#ReadCallback) | Callback function that is called after each message request. |
| [options.messagePassword] | <code>Trytes</code> | The default message password which will be used to decrypt  all found messages. |
| [options.messagePasswords] | <code>Array.&lt;Trytes&gt;</code> | An array containing different message passwords for  different messages. The ith element is the password for the ith message in the channel. |

<a name="RAAMReader+fetchPublic"></a>

### raamReader.fetchPublic([options]) ⇒ <code>Promise</code>
Reads a single public message with given index or an amount of public messages by giving start and index from the channel. Only indexes where no message is already stored locally are queried from the given fullnode, since they are immutable. Returns all found messages in an array. Indexes where no message was foundwill be left empty. Also skipped bundles at the queried addresses, channel roots of provided branches anderrors are returned per index as arrays.

**Kind**: instance method of [<code>RAAMReader</code>](#RAAMReader)  
**Fulfil**: [<code>FetchResult</code>](#FetchResult)  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Optional parameters. |
| [options.iota] | <code>API</code> | A composed IOTA API for communication with a full node. |
| [options.index] | <code>number</code> | The index in the channel of the message to fetch.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to fetch. If start and index aren't set start is 0. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.callback] | [<code>ReadCallback</code>](#ReadCallback) | Callback function that is called after each message request. |

<a name="RAAMReader+subscribe"></a>

### raamReader.subscribe(callback, [options]) ⇒ [<code>Subscription</code>](#Subscription)
Subscribes to a given set of messages in the channel. A callback will be called when a message arrives.Subscriptions to messages already present locally are omitted and a callback is not called for them. Thearriving messages are stored locally. For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connectionis established if the first subscription is created and closed when all subscriptions have been cancelled.

**Kind**: instance method of [<code>RAAMReader</code>](#RAAMReader)  
**Returns**: [<code>Subscription</code>](#Subscription) - An object containing information about the created subscription, including the function to end the subscription.  
**Throws**:

- <code>Error</code> if the serverURL is not passed and hasn't been set already.


| Param | Type | Description |
| --- | --- | --- |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.serverURL] | <code>String</code> | The URL for the ZMQ stream of an IOTA full node. Is used iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because there is no default. |
| [options.index] | <code>number</code> | The index in the channel of the message to subscribe to.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to subscribe to. If start and index aren't set start is the first index where no message is present locally. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.subscribeFollowing] | <code>boolean</code> | if set to true, when a subscribed message arrives, the  next message will be subscribed, if it's not already present locally and not yet subscribed. |
| [options.messagePassword] | <code>Trytes</code> | The default message password which will be used to decrypt  all found messages. |
| [options.messagePasswords] | <code>Array.&lt;Trytes&gt;</code> | An array containing different message passwords for  different messages. The ith element is the password for the ith message in the channel. |

<a name="RAAMReader+subscribePublic"></a>

### raamReader.subscribePublic(callback, [options]) ⇒ [<code>Subscription</code>](#Subscription)
Subscribes to a given set of public messages in the channel. A callback will be called when a message arrives.Subscriptions to public messages already present locally are omitted and a callback is not called for them. Thearriving messages are stored locally. For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connectionis established if the first subscription is created and closed when all subscriptions have been cancelled.

**Kind**: instance method of [<code>RAAMReader</code>](#RAAMReader)  
**Returns**: [<code>Subscription</code>](#Subscription) - An object containing information about the created subscription, including the function to end the subscription.  
**Throws**:

- <code>Error</code> if the serverURL is not passed and hasn't been set already.


| Param | Type | Description |
| --- | --- | --- |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.serverURL] | <code>String</code> | The URL for the ZMQ stream of an IOTA full node. Is used iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because there is no default. |
| [options.index] | <code>number</code> | The index in the channel of the message to subscribe to.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to subscribe to. If start and index aren't set start is the first index where no message is present locally. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.subscribeFollowing] | <code>boolean</code> | if set to true, when a subscribed message arrives, the  next message will be subscribed, if it's not already present locally and not yet subscribed. |

<a name="RAAMReader.fetchPublicMessages"></a>

### RAAMReader.fetchPublicMessages(iota, address, [options]) ⇒ <code>Promise</code>
Reads one or more messages located by their addresses. Returns all found messages in a Map mapping addresses toSingleResult objects. Also skipped bundles at the queried addresses, channel roots of provided branches anderrors are returned in the SingleResults.

**Kind**: static method of [<code>RAAMReader</code>](#RAAMReader)  
**Fulfil**: <code>Map.&lt;Trytes, SingleResult&gt;</code>  

| Param | Type | Description |
| --- | --- | --- |
| iota | <code>API</code> | A composed IOTA API for communication with a full node. |
| address | <code>Array.&lt;Trytes&gt;</code> | An array of IOTA addresses used to locate the messages. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.callback] | [<code>ReadCallback</code>](#ReadCallback) | Callback function that is called after each message request. |
| [options.channelRoot] | <code>Int8Array</code> | The channel root by that the channel is identified as trits.  This is parameter is only used as an extra verification information. |
| [options.security] | <code>number</code> | The security of the signing and encryption keys as a number between 1 and 4.  This is parameter is only used as an extra verification information. |
| [options.height] | <code>number</code> | The height as a number between 1 and 26 of the channel yielding the maximum  amount of messages of the channel. This is parameter is only used as an extra verification information. |

<a name="RAAMReader.fetchMessages"></a>

### RAAMReader.fetchMessages(iota, channelRoot, [options]) ⇒ <code>Promise</code>
Reads a single message with given index or an amount of messages by giving start and index from the channel with the given channel root. Returns all found messages in an array. Indexes where no message was found will be left empty. Also skipped bundles at the queried addresses, channel roots of provided branches and errors are returned per index as arrays.

**Kind**: static method of [<code>RAAMReader</code>](#RAAMReader)  
**Fulfil**: [<code>FetchResult</code>](#FetchResult)  

| Param | Type | Description |
| --- | --- | --- |
| iota | <code>API</code> | A composed IOTA API for communication with a full node. |
| channelRoot | <code>Int8Array</code> | The channel root by that the channel is identified as trits. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.index] | <code>number</code> | The index in the channel of the message to fetch.  If start is set too, index is not used. |
| [options.start] | <code>number</code> | The start index in the channel of the messages to fetch. If start and index aren't set start is 0. |
| [options.end] | <code>number</code> | The end index in the channel of the messages to fetch. If end is undefined messages will be fetched until an index where no message is found is reached. |
| [options.channelPassword] | <code>Trytes</code> | The optional password for the channel as trytes. |
| [options.callback] | [<code>ReadCallback</code>](#ReadCallback) | Callback function that is called after each message request. |
| [options.messagePassword] | <code>Trytes</code> | The default message password which will be used to decrypt  all found messages. |
| [options.messagePasswords] | <code>Array.&lt;Trytes&gt;</code> | An array containing different message passwords for  different messages. The ith element is the password for the ith message in the channel. |
| [options.security] | <code>number</code> | The security of the signing and encryption keys as a number between 1 and 4.  This is parameter is only used as an extra verification information. |
| [options.height] | <code>number</code> | The height as a number between 1 and 26 of the channel yielding the maximum  amount of messages of the channel. This is parameter is only used as an extra verification information. |

<a name="RAAMReader.fetchSingle"></a>

### RAAMReader.fetchSingle(iota, channelRoot, index, [options]) ⇒ <code>Promise</code>
Reads a single message with given index from the channel with the given channel root. Returns thefound message iff any, the index, skipped bundles at the queried address and errors.

**Kind**: static method of [<code>RAAMReader</code>](#RAAMReader)  
**Fulfil**: [<code>SingleResult</code>](#SingleResult)  

| Param | Type | Description |
| --- | --- | --- |
| iota | <code>API</code> | A composed IOTA API for communication with a full node. |
| channelRoot | <code>Int8Array</code> | The channel root by that the channel is identified as trits. |
| index | <code>number</code> | The index in the channel of the message to fetch.  If start is set too index is not used. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.channelPassword] | <code>Trytes</code> | The optional password for the channel as trytes. |
| [options.messagePassword] | <code>Trytes</code> | The message password which will be used to decrypt  the found message. |
| [options.security] | <code>number</code> | The security of the signing and encryption keys as a number between 1 and 4.  This is parameter is only used as an extra verification information. |
| [options.height] | <code>number</code> | The height as a number between 1 and 26 of the channel yielding the maximum  amount of messages of the channel. This is parameter is only used as an extra verification information. |

<a name="RAAMReader.fetchPublic"></a>

### RAAMReader.fetchPublic(iota, address, [options]) ⇒ <code>Promise</code>
Reads a single public message from the given address. Returns thefound message iff any, the index, skipped bundles at the queried address and errors.

**Kind**: static method of [<code>RAAMReader</code>](#RAAMReader)  
**Fulfil**: [<code>SingleResult</code>](#SingleResult)  

| Param | Type | Description |
| --- | --- | --- |
| iota | <code>API</code> | A composed IOTA API for communication with a full node. |
| address | <code>Trytes</code> | An IOTA address used to locate the message. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.index] | <code>number</code> | The index in the channel of the message to fetch. Not used for locating message.  This is parameter is only used as an extra verification information. |
| [options.channelRoot] | <code>Int8Array</code> | The channel root by that the channel is identified as trits.  This is parameter is only used as an extra verification information. |
| [options.security] | <code>number</code> | The security of the signing and encryption keys as a number between 1 and 4.  This is parameter is only used as an extra verification information. |
| [options.height] | <code>number</code> | The height as a number between 1 and 26 of the channel yielding the maximum  amount of messages of the channel. This is parameter is only used as an extra verification information. |

<a name="RAAMReader.subscribeIndex"></a>

### RAAMReader.subscribeIndex(channelRoot, index, callback, [options]) ⇒ [<code>SingleSubscription</code>](#SingleSubscription)
Subscribes to a given index in a RAAM channel. A callback will be called when a message arrives.For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connectionis established if the first subscription is created and closed when all subscriptions have been cancelled.

**Kind**: static method of [<code>RAAMReader</code>](#RAAMReader)  
**Returns**: [<code>SingleSubscription</code>](#SingleSubscription) - An object containing information about the created subscription, including the function to end the subscription.  
**Throws**:

- <code>Error</code> if the serverURL is not passed and hasn't been set already.


| Param | Type | Description |
| --- | --- | --- |
| channelRoot | <code>Int8Array</code> | The channel root by that the channel is identified as trits. |
| index | <code>number</code> | The index in the channel of the message to subscribe to. |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.serverURL] | <code>String</code> | The URL for the ZMQ stream of an IOTA full node. Is used iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because there is no default. |
| [options.subscribeFollowing] | <code>boolean</code> | if set to true, when a subscribed message arrives, the  next message will be subscribed. |
| [options.channelPassword] | <code>Trytes</code> | The optional password for the channel as trytes. |
| [options.messagePassword] | <code>Trytes</code> | The message password which will be used to decrypt  the found message. |
| [options.security] | <code>number</code> | The security of the signing and encryption keys as a number between 1 and 4.  This is parameter is only used as an extra verification information. |
| [options.height] | <code>number</code> | The height as a number between 1 and 26 of the channel yielding the maximum  amount of messages of the channel. This is parameter is only used as an extra verification information. |

<a name="RAAMReader.subscribePublic"></a>

### RAAMReader.subscribePublic(address, callback, [options]) ⇒ [<code>SingleSubscription</code>](#SingleSubscription)
Subscribes to public RAAM messages on a given address. A callback will be called when a message arrives.For reacting to new arriving messages a ZMQ stream of an IOTA full node is listened. The URL to it can be passed.If it's not passed the last one is used. There can be only a connection to one ZMQ stream at a time. The connectionis established if the first subscription is created and closed when all subscriptions have been cancelled.

**Kind**: static method of [<code>RAAMReader</code>](#RAAMReader)  
**Returns**: [<code>SingleSubscription</code>](#SingleSubscription) - An object containing information about the created subscription, including the function to end the subscription.  
**Throws**:

- <code>Error</code> if the serverURL is not passed and hasn't been set already.


| Param | Type | Description |
| --- | --- | --- |
| address | <code>Trytes</code> | An IOTA address used to locate the message. |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| [options] | <code>Object</code> | Optional parameters. |
| [options.serverURL] | <code>String</code> | The URL for the ZMQ stream of an IOTA full node. Is used iff not connected to another ZMQ stream already. The URL needs to be passed at least once, because there is no default. |
| [options.subscribeFollowing] | <code>boolean</code> | if set to true, when a subscribed message arrives, the  next message will be subscribed. |
| [options.index] | <code>number</code> | The index in the channel of the message to subscribe to. This is parameter is only used as an extra verification information. |
| [options.channelRoot] | <code>Int8Array</code> | The channel root by that the channel is identified as trits. This is parameter is only used as an extra verification information. |
| [options.security] | <code>number</code> | The security of the signing and encryption keys as a number between 1 and 4.  This is parameter is only used as an extra verification information. |
| [options.height] | <code>number</code> | The height as a number between 1 and 26 of the channel yielding the maximum  amount of messages of the channel. This is parameter is only used as an extra verification information. |

<a name="Leaf"></a>

## Leaf : <code>object</code>
An object containing public and private key for one-time signing a message.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| public | <code>Int8Array</code> | The verifying key as trits. |
| private | <code>Int8Array</code> | The signing key as trits. |
| index | <code>number</code> | The index in the merkle tree at leaf level, representing which message is signed with this key. |
| height | <code>number</code> | The level in the merkle tree, which is always 0. |

<a name="Node"></a>

## Node : <code>object</code>
An object representing a node of a merkle tree with a hash, and the position of the node by height and index.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| hash | <code>Int8Array</code> | The hash of the direct children of this node in the merkle tree as trits. |
| index | <code>number</code> | The index in the level of the merkle tree from left to right. |
| height | <code>number</code> | The level of the node in the merkle tree. |

<a name="MessageTransfers"></a>

## MessageTransfers : <code>object</code>
An object representing a message as transfers for a iota transaction bundle.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| transfers | <code>Array.&lt;Transfer&gt;</code> | The array of transfers forming the transactions of a IOTA bundle. |
| message | [<code>Message</code>](#Message) | The compiled RAAM message with all neccessary information to create its transfers. |

<a name="Message"></a>

## Message : <code>object</code>
An object representing the compiled RAAM message with all neccessary information to create its transfers.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | The index of the message in the channel. |
| height | <code>number</code> | A number between 1 and 26 representing the height  of the merkle tree used for this channel. |
| security | <code>number</code> | The security of the signing and encryption keys as a number between 1 and 4. |
| message | <code>Trytes</code> | The message to attach to the channel as trytes. |
| signature | <code>Int8Array</code> | The signature created from the message digest with signing key from the merkle tree. |
| verifyingKey | <code>Int8Array</code> | The key to verify the signature and to verify its membership of the merkle tree. |
| authPathHashes | <code>Array.&lt;Int8Array&gt;</code> | The other merkle tree nodes to rebuild the merkle root. |
| nextRoot | <code>Int8Array</code> | The root of another channel, used for branching or when channel is exausted. |

<a name="ProgressCallback"></a>

## ProgressCallback : <code>function</code>
Callback function that is called after a given timeout to report the progress in channel creation.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| leafs | [<code>Array.&lt;Leaf&gt;</code>](#Leaf) | an array containing all leafs created since the last callback. |
| hashes | [<code>Array.&lt;Node&gt;</code>](#Node) | an array containing all hashes in the merkle tree created since the last callback. |

<a name="ReadCallback"></a>

## ReadCallback : <code>function</code>
Callback function that is called after each message request.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | Error that occured while getting the message iff any. |
| index | <code>number</code> | The index of the message. |
| message | <code>Trytes</code> | The fetched message if the request was successful. |
| skipped | <code>Array.&lt;object&gt;</code> | An array containing skipped bundles that  were found at the same address that the message has. Elements <code>{bundle, error}</code> contain  the bundle hash and the error causing the skipping. |
| nextRoot | <code>Int8Array</code> | The nextRoot of the message iff any. |
| channelRoot | <code>Int8Array</code> | The channelRoot of the message. |

<a name="Subscription"></a>

## Subscription : <code>object</code>
An object containing information about the created subscription, including the function to end the subscription.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| start | <code>number</code> | The start index in the channel of the subscribed messages. |
| end | <code>number</code> | The end index in the channel of the subscribed messages. |
| subscribeFollowing | <code>boolean</code> | whether the following index will be subscribed when a message arrives and is not yet present locally or subscribed. |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| unsubscribe | <code>function</code> | When called the subscription to all specified indexes will be ended. |

<a name="SingleSubscription"></a>

## SingleSubscription : <code>object</code>
An object containing information about the created subscription, including the function to end the subscription.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | The index of the currently subscribed message. |
| channelRoot | <code>Int8Array</code> | The channel root by that the channel is identified as trits. |
| subscribeFollowing | <code>boolean</code> | whether the following index will be subscribed when a message arrives. |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| unsubscribe | <code>function</code> | When called the current subscription will be ended. |

<a name="SingleSubscription"></a>

## SingleSubscription : <code>object</code>
An object containing information about the created subscription, including the function to end the subscription.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | The index of the currently subscribed message. |
| channelRoot | <code>Int8Array</code> | The channel root by that the channel is identified as trits. |
| subscribeFollowing | <code>boolean</code> | whether the following index will be subscribed when a message arrives. |
| callback | [<code>ReadCallback</code>](#ReadCallback) | The callback that is called if a subscribed message arrives. |
| unsubscribe | <code>function</code> | When called the current subscription will be ended. |

<a name="SingleResult"></a>

## SingleResult : <code>object</code>
Container class for the result of a single fetched message.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message | <code>Trytes</code> | The fetched message, iff any. |
| index | <code>number</code> | The index of the fetched message. |
| nextRoot | <code>Int8Array</code> | The nextRoot, iff any, provided by the message. |
| skipped | <code>Array.&lt;object&gt;</code> | An array containing skipped bundles that  were found at the same address that the message has. Elements <code>{bundle, error}</code> contain  the bundle hash and the error causing the skipping. |
| channelRoot | <code>Int8Array</code> | The channelRoot of the message. |

<a name="FetchResult"></a>

## FetchResult : <code>object</code>
Conainer class for the result of a fetch request.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| messages | <code>Array.&lt;Trytes&gt;</code> | Array of found messages, where the message at start index is  the first message in the array. Elements where no message was found will be left empty. |
| errors | <code>Array.&lt;Error&gt;</code> | Array of errors that occured while fetching messages. |
| skipped | <code>Array.&lt;Array.&lt;object&gt;&gt;</code> | An array containing skipped bundles that  were found at the same addresses that the messages have. Elements are arrays containing objects <code>{bundle, error}</code> consisting of the bundle hash and the error causing the skipping. If no bundles where skipped for a message the array element is empty. |
| branches | <code>Array.&lt;Int8Array&gt;</code> | The nextRoot, iff any, provided by a certain message. |

* * * 

&copy; 2018 Robin Lamberti \<lamberti.robin@gmail.com\>. Documented by [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown).
