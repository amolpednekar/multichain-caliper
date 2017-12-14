/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
* @file, definition of the BlockChain class, which is used to interact with backend's blockchain system
*/

'use strict'

var path = require('path');
var json2csv = require('json2csv');
var fs = require('fs');
const os = require('os');
var kafka = require('kafka-node');

var KafkaAdapter = class {
    constructor(configPath) {
        // make connection with kafka
        var HighLevelProducer = kafka.HighLevelProducer;
        var KeyedMessage = kafka.KeyedMessage;
        this.kafka_config = require("./kafka-config.json")

        let zk_url = this.kafka_config.zk_url
        this.client_kafka = new kafka.Client(zk_url, this.kafka_config.topic, { sessionTimeout: 30000, spinDelay: 100, retries: 2 });
        this.producer = new HighLevelProducer(this.client_kafka, { requireAcks: -1 })
        var args = require(configPath).blockchain;
        this.bcType = args.type;
        this.bcObj = null;
        if (this.bcType === 'fabric') {
            var FabricListener = require('./listener-fabric.js');
            this.bcObj = new FabricListener(this.kafka_config, this.client_kafka, this.producer);
        }
        else if (this.bcType === 'sawtooth') {
            var sawtooth = require('./sawtooth/listener-sawtooth.js')
            this.bcObj = new sawtooth(path.join(path.dirname(configPath), args.config));
        }
        else if (this.bcType === 'quorum') {
            var quorum = require('./listener-quorum.js')
            this.bcObj = new quorum(this.kafka_config, this.client_kafka, this.producer);
        }else if (this.bcType === 'multichain') {
            var multichain = require('./listener-multichain.js')
            this.bcObj = new multichain(this.kafka_config, this.client_kafka, this.producer);
        }
        else {
            throw new Error('Unknown blockchain type, ' + this.bcType);
        }
    }


    createTopic() {
        var self = this
        this.producer.on('ready', function () {
            self.producer.createTopics([self.kafka_config.topic], false, function (err, data) {
                if (err) {
                    console.log("Error creating Topic", err)

                } else {

                }
            })
        })
    }
    /**
    * return the blockchain type
    * @return {string}
    */
    gettype() {
        return this.bcType;
    }

    /**
    * get Blocks from the Blockchain node
    * the detailed smart contract's information should be defined in the configuration file
    * @return {Promise}
    */
    getBlocks() {
        return this.bcObj.getBlocks();
    }

}
module.exports = KafkaAdapter;