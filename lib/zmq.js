const transaction = require('@iota/transaction-converter')
const zmq = require('zeromq')
let sock

let serverAddress = undefined
let connectedTo = undefined

const subscriptions = new Map()
const bundles = new Map()

const URL_ERROR = "Server URL is not set"

function setServerAddress(address) {
    serverAddress = address
}

function subscribe(address, callback) {
    if (subscriptions.size === 0 && connectedTo === undefined) {
        connect()
    }
    if (subscriptions.has(address)) {
        subscriptions.get(address).push(callback)
    } else {
        subscriptions.set(address, [callback])
    }
    // if (!watched.includes(address)) {
    //     watched.push(address)
    // }
    return {
        address,
        callback,
        unsubscribe() {
            if (subscriptions.has(address)) {
                const index = subscriptions.get(address).indexOf(callback)
                
                if (index >= 0) {
                    subscriptions.get(address).splice(index, 1)
                    // no subscriptions for this address left?
                    if (subscriptions.get(address).length == 0) {
                        subscriptions.delete(address)
                        // no watched addresses left?
                        if (subscriptions.size === 0) {
                            disconnect()
                        }
                        // const addyIndex = watched.indexOf(address)
                        // watched.splice(addyIndex, 1)
                        
                        // if (watched.length == 0) {
                        //     disconnect()
                        // }
                    }
                }
            }
        }
    }
}

function disconnect() {
    sock.disconnect(connectedTo)
    connectedTo = undefined
}

function connect() {
    if (!serverAddress) {
        throw new Error(URL_ERROR)
    }
    sock = zmq.socket('sub')
    sock.connect(serverAddress)
    connectedTo = serverAddress
    sock.subscribe('tx_trytes')
    sock.on('message', function(topic) {
        const tp = topic.toString()
        const arr = tp.split(' ')
     
        const address = arr[1].slice(2187, 2268)
        if (subscriptions.has(address)) {
            const tx = transaction.asTransactionObject(arr[1], arr[2])
            if (!bundles.has(tx.bundle)) {
                bundles.set(tx.bundle, [tx])
            } else {
                const bundle = bundles.get(tx.bundle)
                bundle.push(tx)
                // bundle complete, notify subscribers
                if (bundle.length == tx.lastIndex + 1) {
                    bundles.delete(tx.bundle)
                    bundle.sort((a, b) => a.currentIndex - b.currentIndex)

                    subscriptions.get(tx.address).forEach(cb => cb(bundle))
                }
            }
        }
    })
}

module.exports = {
    setServerAddress,
    subscribe,
    disconnect
}