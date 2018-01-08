var multichain = require("multichain-node");
// var multichain_api = require('multichain-api/RpcClient')
// var multichain_publish = require('multichain-api/Commands/Publish').Publish

var kafka_config = require("../../benchmark/simple/kafka-config.json")
var fs = require('fs');

var max = 2; // n+1
var min = 0;
var promisesArray = [];

function init(config_path) {

    return new Promise((resolve, reject) => {
        // actual init done in /initcaliper

        return resolve("Done");

    });

}

function installSmartContract() {
    return Promise.resolve();
}

function getContext(config_path) {
    var data = fs.readFileSync(config_path);
    fileData = new Buffer(data).toString('utf-8');
    fileData = JSON.parse(fileData);
    // this client sends to master peer
    let multichainObject = multichain(fileData.multichain.network[0]);
    return Promise.resolve(multichainObject);
}

function releaseContext(multichain_api_object) {
    multichainObject = null;
    return Promise.resolve();
}

function publishToStream(multichainObject, stream, args, timeout) {
    // generate random keys & publish
    var invoke_status = {
        id: "",
        status: 'created',
        time_create: new Date().getTime() / 1000,
        time_valid: 0,
        time_endorse: 0,
        time_order: 0,
        result: null
    };

    // let multichain_api_object2 = multichain_api.RpcClient({
    //     protocol: 'http',
    //     host: '10.80.39.8',
    //     port: 999,
    //     username: 'username',
    //     password: 'password'
    // })

    // multichain_api_object2(multichain_publish("mystream", args[0].key, args[0].data))
    //     .then(txid => {
    //         // console.log("txid", txid);
    //         invoke_status.id = txid.result;
    //         invoke_status.status = 'success';
    //         return Promise.resolve(invoke_status)
    //     })
    //     .catch((error) => {
    //         console.log("error in publishing data: ", error, "key:", args[0].key, "value:", args[0].data)
    //         invoke_status.status = 'failed';
    //         return Promise.resolve(invoke_status)
    //     });

    return sendDatatoStream(multichainObject, stream, args[0].key, args[0].data).then((txid) => {
        invoke_status.id = txid;
        invoke_status.status = 'success';
        return Promise.resolve(invoke_status)

    }, (err) => {
        console.log("error in publishing data: ", err, "key:", args[0].key, "value:", args[0].data)
        invoke_status.status = 'failed';
        return Promise.resolve(invoke_status)
    })
}

function sendDatatoStream(multichainObject, stream, key, data) {
    return new Promise((resolve, reject) => {
        multichainObject.publish({ stream: stream, key: key, data: data }, (err, success) => {
            if (err) {
                reject(err);
            }
            resolve(success);
        });
    });
}

function queryStream(multichainObject, stream, key, timeout) {
    // subscribe not required, autosubscribe=streams set for multichaind
    var query_status = {
        status: 'created',
        time_create: new Date().getTime() / 1000,
        time_valid: 0,
        result: null
    };

    return readDataFromStream(multichainObject, stream, key).then((data) => {
        query_status.status = 'success';
        query_status.time_valid = new Date().getTime() / 1000;
        return Promise.resolve(query_status)
    }, (err) => {
        console.log("error in querying data: ", err)
        query_status.status = 'failed';
        query_status.time_valid = new Date().getTime() / 1000;
        return Promise.resolve(query_status)
    })
}

function readDataFromStream(multichainObject, stream, key) {
    return new Promise((resolve, reject) => {
        multichainObject.listStreamKeyItems({ stream: stream, key: key }, (err, success) => {
            if (err) {
                console.log("Error: ", err);
                //throw err;
                reject(success);
            }
            resolve(err);
        })
    });
}

function getResultConfirmation(resultsArray, no_Of_Tx) {


    return new Promise(function (resolve, reject) {

        var offset_count = 0
        try {
            offset_count = fs.readFileSync("offset.txt")
        } catch (err) {
            offset_count = 0
        }

        var map = []

        //element is an array of objects with TXID for one round
        resultsArray.forEach(function (internal_element) {
            // console.log('internal_element.id: ',typeof internal_element.id)
            var index = "x0" + internal_element.id;
            map[index] = internal_element
            //no_Of_Tx++
        })

        var globalArray = []
        globalArray.push(map)
        var kafka = require('kafka-node');
        var Consumer = kafka.Consumer;
        var client1 = new kafka.KafkaClient({ kafkaHost: kafka_config.broker_urls, requestTimeout: 300000000 });

        var options = {
            autoCommit: true,
            fetchMaxWaitMs: 1000,
            fetchMaxBytes: 4096 * 4096,
            encoding: 'buffer',
            fromOffset: true
        };

        var topics = [{
            topic: kafka_config.topic,
            offset: offset_count
        }];

        var consumer = new Consumer(client1, topics, options);
        var finalresult = [];
        var isTxfound;
        var pendingCounter = 0

        var multichainObj = multichain(fileData.multichain.network[0]);

        consumer.on('message', function (message) {

            var buf = new Buffer(message.value); // Read string into a buffer.
            var data = buf.toString('utf-8');

            var data = JSON.parse(data);

            console.log("consumer data", data.blockHash)
            if (data.blockHash != null || data.blockHash !== undefined) {
                multichainObj.getBlock({ hash: data.blockHash }, (err, result) => {
                    if (err) {
                        console.log("getBlock Error", err)
                    }
                    else {
                        console.log("Tx ID length:", result.tx.length);
                        data.block = result.tx;
                        //console.log("event_data.block",event_data.block)

                        offset_count = message.offset
                        fs.writeFileSync("offset.txt", offset_count)


                        if (!data.block.extraData) {
                            // find in the globalArray if the Id exists or not. It will be present but in any one of the array in global Array

                            for (let i = 0; i < data.block.length; i++) {
                                eventTxId = "x0" + data.block[i];
                                if (globalArray[0][eventTxId] != undefined || globalArray[0][eventTxId] != null) {
                                    //console.log(" globalArray[0][eventTxId]", globalArray[0][eventTxId])
                                    // present at index 0
                                    var object = globalArray[0][eventTxId]
                                    object.time_valid = data.validTime;
                                    object.status = "success";
                                    globalArray[0][eventTxId] = object
                                    pendingCounter++
                                    finalresult.push(object)
                                    console.log("pendingCounter", pendingCounter)
                                } else {

                                    // not present // ** no need to handle actually**

                                }
                                if (pendingCounter == no_Of_Tx) {
                                    //console.log("All resolved")
                                    resolve(finalresult)
                                }

                            }
                            console.log("Completed parsing a block, block time:", data.validTime);
                        }
                    }
                })
            }
        });

        consumer.on('error', function (error) {
            //console.log("Error on consumer side",error)
        })
    })
}
module.exports = { init, installSmartContract, publishToStream, getContext, releaseContext, getResultConfirmation, queryStream }