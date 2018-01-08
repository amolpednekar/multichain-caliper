'use strict';

var kafka = require('kafka-node');
var fs = require('fs')
var path = require('path');
var Promise = require('promise');
var net = require('net');


class MultichainListener {
    constructor(kafka_config, client_kafka, producer) {
        this.client_kafka = client_kafka
        this.producer = producer
        this.kafka_config = kafka_config
    }

    getBlocks() {
        var self = this
        self.producer.on('ready', function () {
            var server = net.createServer(function (socket) {
                socket.on('data', (data) => {
                    var event_data = {}
                    event_data.validTime = new Date().getTime() / 1000;
                    event_data.blockHash = data.toString('utf8');

                    console.log("blockhash: ", data.toString('utf8'));

                    var payload = [{
                        topic: self.kafka_config.topic,
                        messages: JSON.stringify(event_data),
                        partition: 0,
                        attributes: 1 /* Use GZip compression for the payload */
                    }];

                    self.producer.send(payload, function (error, result) {
                        if (error) {
                            console.error(error);
                        } else {
                            var formattedResult = result[0]
                            // console.log('result: ', result)
                        }
                    });


                })
            });

            // start listener
            server.listen(1440, '10.244.51.108');

            server.timeout = 0;
        })

        self.producer.on('error', function (error) {
            console.error("Error", error);
        });
    }
}

module.exports = MultichainListener;