const transaction = require('@iota/transaction-converter')
const zmq = require('zeromq')
let sock

let serverAddress = undefined
let connectedTo = undefined

const watched = []
const subscriptions = {}
const bundles = {}

const URL_ERROR = "Server URL is not set"

function setServerAddress(address) {
    serverAddress = address
}

function subscribe(address, callback) {
    if (Object.keys(subscriptions).includes(address)) {
        subscriptions[address].push(callback)
    } else {
        subscriptions[address] = [callback]
    }
    if (watched == 0 && connectedTo == undefined) {
        connect()
    }
    if (!watched.includes(address)) {
        watched.push(address)
    }
    return {
        address,
        callback,
        unsubscribe() {
            const index = subscriptions[address].indexOf(callback)
            if (index >= 0) {
                subscriptions[address].splice(index, 1)
                // no subscriptions for this address left?
                if (subscriptions[address].length == 0) {
                    const addyIndex = watched.indexOf(address)
                    watched.splice(addyIndex, 1)
                    // no watched addresses left?
                    if (watched.length == 0) {
                        disconnect()
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
        if (watched.includes(address)) {
            const tx = transaction.asTransactionObject(arr[1], arr[2])
            if (!Object.keys(bundles).includes(tx.bundle)) {
                bundles[tx.bundle] = [tx]
            } else {
                const bundle = bundles[tx.bundle]
                bundle.push(tx)
                // bundle complete, notify subscribers
                if (bundle.length == tx.lastIndex + 1) {
                    bundle.sort((a, b) => a.currentIndex - b.currentIndex)
                    subscriptions[tx.address].forEach(cb => cb(bundle))
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