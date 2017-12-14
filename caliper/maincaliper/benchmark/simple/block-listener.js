'use strict'

var kafka_adapter = require('./kafka-adapter.js');

process.on('message', function(msg) {
    var ka = new kafka_adapter (msg.msg)
    ka.createTopic()
    ka.getBlocks()
})