const converter =  require("@iota/converter")
const fs = require("fs")

function getStringWriter() {
    let string = ""
    const callback = (leafs, hashes) => {
        const append = leafs.map(({private, public, index, height}) => ({
                public: converter.trytes(public), 
                private: converter.trytes(private), 
                index, 
                height
            }))
            .concat(hashes.reduce((acc, a) => acc.concat(a), [])
                .map(({hash, index, height}) => ({
                    hash: converter.trytes(hash),
                    index,
                    height
                })))
            .map(l => JSON.stringify(l))
            .reduce((acc, e) => acc.concat(e + "\n"), "")
        string.concat(append)
        return append
    }
    const getString = () => string
    return {
        callback,
        getString
    }
}

function readFile(fileName) {
    const content = Buffer.from(fs.readFileSync(fileName)).toString()
    const leafs = []
    const hashes = []
    content.split("\n").filter(e => e).forEach(s => {
        const e = JSON.parse(s)
        const {index, height} = e
        if (Object.keys(e).includes("public")) {
            leafs[e.index] = {
                public: converter.trits(e.public),
                private: converter.trits(e.private),
                index,
                height
            }
        } else {
            if (!hashes[e.height]) {
                hashes[e.height] = []
            }
            hashes[e.height][e.index] = {
                hash: converter.trits(e.hash),
                index,
                height
            }
        }
    })
    return {
        leafs,
        hashes,
        merkleRoot: hashes[hashes.length - 1][0].hash,
        height: hashes.length - 1
    }
}

function getFileWriter(fileName) {
    const stringWriter = getStringWriter()
    const callback = (leafs, hashes) => {
        const append = stringWriter.callback(leafs, hashes)
        fs.appendFileSync(fileName, append)
    }
    return callback
}

module.exports = {
    getStringWriter,
    getFileWriter,
    readFile
}