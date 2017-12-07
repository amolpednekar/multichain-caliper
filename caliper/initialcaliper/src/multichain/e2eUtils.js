let multichain = require("multichain-node");
var fs = require('fs');

var max = 1;
var min = 0;

function init(config_path) {
    //console.log("Config path", config_path, typeof(config_path))

    return new Promise((resolve, reject) => {
        var data = fs.readFileSync(config_path);
        fileData = new Buffer(data).toString('utf-8');
        fileData = JSON.parse(fileData);
        let multichainObject = multichain(fileData.multichain.network[0]);  // master node
        multichainObject.create({ type: "stream", name: fileData.multichain.stream.name, open: true }, (err, success) => {
            if (err) {
                console.log("Error creating stream: ", err);
                reject(err);
            }
            else {
                console.log("Successfully created stream: ", success);
                resolve(success);
            }
        });
    })

}

function installSmartContract() {
    return Promise.resolve();
}

function getContext(config_path) {
    var data = fs.readFileSync(config_path);
    let i = Math.random() * (max - min) + min;
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