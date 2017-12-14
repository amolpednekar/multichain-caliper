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

    console.log(args[1])
    console.log("Creating & Adding items to stream till", args[1], "blocks, please wait..");

    var rounds = 1;
    new Promise((resolve, reject) => {
        multichain.create({ type: "stream", name: "mystream", open: true }, (err, success) => {
            if (err) {
                resolve(err);
            }
            else {
                resolve(err);
            }
        })
    }).then((msg) => {
        console.log(msg)
        blockFill();
    })

    function blockFill() {
        new Promise((resolve, reject) => {
            getNumberOfBlocks(multichain, resolve, reject);
        }).then((numberOfBlocks) => {
            return new Promise((resolve2, reject2) => {
                console.log("numberOfBlocks>args[1]", numberOfBlocks < args[1], numberOfBlocks, args[1]);

                if (numberOfBlocks >= args[1]) {
                    return resolve2("Required blocks added");
                }

                multichain.publish({ stream: streamName, key: "account_no" + rounds++, data: data }, (err, txid) => {
                    if (err) {
                        return reject2(err);
                    }
                    blockFill();
                });
            });
        }, (error) => {
            console.log(error);
        }).then((successMessage) => {
            console.log("successMessage", successMessage);
        }, (errorMessage) => {
            console.log("errorMessage", errorMessage)
        })
    }

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
