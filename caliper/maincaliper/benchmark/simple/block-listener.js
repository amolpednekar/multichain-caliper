'use strict';

var kafka = require('kafka-node');
var app = require('express')();
//var http = require('http').Server(app);
//var io = require('socket.io')(http);
var fs = require('fs')
var path = require('path');
var Promise = require('promise');
var net = require('net');

var HighLevelProducer = kafka.HighLevelProducer;
var KeyedMessage = kafka.KeyedMessage;
let kafka_config = require("./kafka-config.json")

let zk_url = kafka_config.zk_url
var client_kafka = new kafka.Client(zk_url, kafka_config.topic, {
    sessionTimeout: 3000000,
    spinDelay: 100,
    retries: 2
});

client_kafka.on('error', function (error) {
    console.error("ERROR: ", error);
});

var producer = new HighLevelProducer(client_kafka, { requireAcks: -1 })


console.log("Client started")

producer.on('ready', function () {

    producer.createTopics([kafka_config.topic], false, function (err, data) {
        if (err) {

            console.log("Error creating Topic: ", err)
        }
    })
})

var server = net.createServer(function(socket) {
	//socket.write('Echo server\r\n');
    //socket.pipe(socket);
    socket.on('data',(data)=>{
        //console.log("server",data.toString('utf8'));
        var event_data = {}
        event_data.validTime = new Date().getTime() / 1000;
        console.log("event txid", data.toString('utf8'));
        event_data.block = data.toString('utf8');

        // TODO:convert to bytes and then store
        var payload = [{
            topic: kafka_config.topic,
            messages: JSON.stringify(event_data),
            partition: 0,
            attributes: 1 /* Use GZip compression for the payload */
        }];

        producer.send(payload, function (error, result) {
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
server.listen(1339, '10.244.51.108');

producer.on('error', function (error) {
    console.error("Producer Error: ", error);
});

