var multichain = require("multichain-node");
var fs = require('fs');

var max = 3;
var min = 0;
var promisesArray = [];

function init(config_path) {
    //console.log("Config path", config_path, typeof(config_path))

    return new Promise((resolve, reject) => {

        var data = fs.readFileSync(config_path);
        fileData = new Buffer(data).toString('utf-8');
        fileData = JSON.parse(fileData);
        let multichainObject = multichain(fileData.multichain.network[0]);  // master node

        promisesArray.push(new Promise((resolve1, reject1) => {
            multichainObject.create({ type: "stream", name: fileData.multichain.stream.name, open: true }, (err, success) => {
                if (err) {
                    //console.log("Error creating stream: ", err);
                    return resolve1(err);
                }
                else {
                    console.log("Successfully created stream: ", success);
                    return resolve1(success);
                }
            })
        }));

        //grant send permissions to slave nodes
        for (let i = 1; i <= 1; i++) {
            multichainObject = multichain(fileData.multichain.network[i]);

            promisesArray.push(
                new Promise((resolve2, reject2) => {
                    multichainObject.listAddresses((err, info) => {
                        if (err) {
                            throw err;
                        }
                        multichainObject = multichain(fileData.multichain.network[0]);
                        multichainObject.grant({ addresses: info[0].address, permissions: "send" }, (err, info2) => {
                            if (err) {
                                console.log("init caliper master", err)
                                throw err;
                                return resolve2(err);

                            }
                            console.log("granted permission", info2);
                            return resolve2(info2);
                        })
                    })
                }));
        }

        console.log("promisesArray", promisesArray)

        Promise.all(promisesArray)
            .then((values) => {
                console.log("Success Init caliper", values)
                return resolve("Done");
            },
            ((errors) => {
                console.log("Failure Init caliper", errors)
                return resolve("Error");
            }));
    });
}


function installSmartContract() {
    return Promise.resolve();
}

function getContext(config_path) {
    var data = fs.readFileSync(config_path);
    let i = Math.random() * ((max + 1) - min) + min;
    let multichainObject = multichain(data.multichain.network[i]);
    return multichainObject;
}

function releaseContext(multichainObject) {
    multichainObject = null;
}

function publishToStream(multichainObject) {
    // generate random keys & publish
    key = "AMOL";
    data = "AB";
    multichainObject.publish({ stream: "mystream", key: key, data: data }, (err, success) => {
        if (err) {
            console.log("Error: ", err);
            return err;
        }
        console.log("Success: ", success);
        return success;
    });

    return false;
}

function queryStream(multichainObject) {
    // subscribe not required, autosubscribe=streams set for multichaind
    multichainObject.listStreamKeyItems({ stream: "myStream", key: key }, (err, success) => {
        if (err) {
            console.log("Error: ", err);
            throw err;
        }
        console.log("Success: ", success);
    })
}
module.exports = { init, installSmartContract }