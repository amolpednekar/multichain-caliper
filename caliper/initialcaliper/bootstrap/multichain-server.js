const async = require('async')

const multichain = require('multichain-node')({
    "port": "999",
    "host": "10.80.39.8",
    "user": "username",
    "pass": "password"
})

const streamName = "mystream";
const data = "AB";
var numberOfBlocks;
/*args[0] - TYPE OF ACTION 
    1 - pre-populate
*/

/*args[1] - NUMBER OF ITERATIONS */

args = process.argv.slice(2);

if (args[0] === "1") {

    const requestArray = [];

    requestArray.push(function (callback) {
        createStream(multichain, streamName, callback);
    });

    console.log("Creating & Adding items to stream, please wait..");

    for (let i = 0; i < args[1]; i++) {
        requestArray.push(function (callback) {
            publishToStream(multichain, streamName, "account_no" + i, value, callback)
        });
    }

    async.series(requestArray,
        function (err, results) {
            if (err) {
                console.log("Failure during prepopulation caliper", err)
                throw err;
            }
            console.log("Successfully prepopulated caliper with", results.length, "values.");
        });

}

if (args[0] === "2") {
    const requestArray = [];

    

}

function getNumberOfBlocks(multichain, resolve, reject) {
    multichain.getBlockchainInfo((err, success) => {
        if (err) {
            console.log("Error: ", err);
            return reject(err);
        }
        return resolve(success.blocks);
    })
}

function createStream(multichain, streamName, callback) {
    multichain.create({ type: "stream", name: "mystream", open: true }, (err, success) => {
        if (err) {
            console.log("Error creating stream: ", err);
            callback(null, success);
        }
        else {
            console.log("Successfully created stream: ", success);
            callback(null, success);
        }
    })
}

function publishToStream(multichain, streamName, key, value, callback) {
    console.log("called publishtostream")
    multichain.publish({ stream: streamName, key: key, data: data }, (err, success) => {
        if (err) {
            callback(err, null);
        }
        else {
            callback(null, success);
        }
    })
}
