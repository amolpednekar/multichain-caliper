/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/


'use strict'

var path = require('path');
var childProcess = require('child_process');

var fs = require('fs')
var config_path;
if (process.argv.length < 3) {
    config_path = path.join(__dirname, 'config.json');
}
else {
    config_path = path.join(__dirname, process.argv[2]);
}

var kafka_child = childProcess.fork('block-listener.js');

kafka_child.on('error', function () {
    console.log('client encountered unexpected error');
});

kafka_child.on('exit', function () {
    console.log('client exited');
});

kafka_child.send({ msg: config_path });

// use default framework to run the tests
var framework = require('../../src/comm/bench-flow.js');

if (fs.existsSync('offset.txt')) {

    fs.unlink('offset.txt', function (error) {
        if (error) {

            console.log("Error deleting")

        } else {

            console.log('Deleted offset.txt!!');


            setTimeout(function () {
                framework.run(config_path, kafka_child);
            }, 3000)
        }
    });
}

else {

    setTimeout(function () {
        framework.run(config_path, kafka_child);
    }, 3000)
}


