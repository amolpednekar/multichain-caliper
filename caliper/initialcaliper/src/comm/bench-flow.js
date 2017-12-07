/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
* @file Implementation of the default test framework which start a test flow to run multiple tests according to the configuration file
*/


'use strict'

/* global variables */
var childProcess = require('child_process');
var exec = childProcess.exec;
var path = require('path');
var tape = require('tape');
var _test = require('tape-promise');
var test = _test(tape);
var table = require('table');
var Blockchain = require('../../src/comm/blockchain.js');
var Monitor = require('../../src/comm/monitor.js');
var blockchain;
var monitor;
var results = [];           // original output of recent test round
var resultsbyround = [];    // processed output of each test round
var round = 0;              // test round
var cache = {};             // memory cache to store defined output from child process, so different test case could exchange data if needed
                            // this should only be used to exchange small amount of data

/**
* Read cached data by key name
* @key {string}
* @return {Object}, cached data
*/
function getCache(key) {
    return cache[key];
}

/**
* Write data in the global cache
* @data {Object}, key/value
*/
function putCache(data) {
    if(typeof data === 'undefined') {
        return;
    }
    if(cache.hasOwnProperty(data.key)) {
        if(Array.isArray(data.value)) {
            cache[data.key].push.apply(cache[data.key], data.value);     // so if child processes return multiple arrays, combine them together as a single array
        }
        else {
            cache[v.key].push(data.value);
        }
    }
    else {
        if(Array.isArray(data.value)) {
            cache[data.key] = data.value;
        }
        else {
            cache[data.key] = [data.value];
        }
    }
}

var configPath;
/**
* Start a default test flow to run the tests
* @config_path {string},path of the local configuration file
*/
module.exports.run = function(config_path) {
	var startTime = process.uptime();
    configPath = config_path;
    blockchain = new Blockchain(config_path);
    monitor = new Monitor(config_path);

    var startPromise = new Promise((resolve, reject) => {
        let config = require(config_path);
        if (config.hasOwnProperty('command') && config.command.hasOwnProperty('start')){
            console.log(config.command.start);
            let child = exec(config.command.start, (err, stdout, stderr) => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);
        }
        else {
            resolve();
        }
    });

    startPromise.then(() => {
	
		console.log("Blockchain init ");
        return blockchain.init();
		
    },(err)=>{
	
	
		console.log("Error: ",err)
	
	
	})
    .then( () => {
	
		console.log("install smart contract");
        return blockchain.installSmartContract();
		
    })
    .then( () => {

		//console.log("Sucessfully created the channel, joined peers to channel and instantiated the chaincode");
		var endtime = process.uptime();
		var timeTaken = endtime-startTime;
		console.log("\nTime taken to sun script is: ",timeTaken)
		process.exit();
     
    })
    .catch( (err) => {
        console.log('unexpected error, ' + (err.stack ? err.stack : err));
    });
}

/**
* fork multiple child processes to do performance tests
* @args {Object}: testing arguments
* @clientNum {number}: define how many child processes should be forked
* @final {boolean}: =true, the last test; otherwise, =false
* @return {Promise}
*/
function defaultTest(args, clientNum, final) {
    return new Promise( function(resolve, reject) {
        var title = '\n\n**** End-to-end flow: testing \'' + args.cmd + '\' ****';
        test(title, (t) => {
            var testCmd     = args.cmd;
            var testRounds  = args.txNumbAndTps;
            var tests = []; // array of all test rounds
            for(let i = 0 ; i < testRounds.length ; i++) {
                let txPerClient  = Math.floor(testRounds[i][0] / clientNum);
                let tpsPerClient = Math.floor(testRounds[i][1] / clientNum);
                if(txPerClient < 1) {
                    txPerClient = 1;
                }
                if(tpsPerClient < 1) {
                    tpsPerClient = 1;
                }

                let msg = {
                              cmd : args.cmd,
                              numb: txPerClient,
                              tps:  tpsPerClient,
                              args: args.arguments,
                              cb  : args.callback,
                              config: configPath
                           };
                for( let key in args.arguments) {
                    if(args.arguments[key] === "*#out") { // from previous cached data
                        msg.args[key] = getCache(key);
                    }
                }
                if (args.hasOwnProperty('out')) {
                    msg.out = args.out;
                }
                tests.push(msg);
            }

            var testIdx = 0;
            return tests.reduce( function(prev, item) {
                return prev.then( () => {
                    console.log('----test round ' + round + '----');
                    results = [];   // clear results array
                    round++;
                    testIdx++;
                    var children = [];  // array of child processes
                    for(let i = 0 ; i < clientNum ; i++) {
                        children.push(loadProcess(item, i));
                    }
                    return Promise.all(children)
                    .then( () => {
                        t.pass('passed \'' + testCmd + '\' testing');
                        processResult(testCmd, t);
                        monitor.printDefaultStats();
                        return Promise.resolve();
                    })
                    .then( () => {
                        if(final && testIdx === tests.length) {
                            return Promise.resolve();
                        }
                        else {
                            console.log('wait 10 seconds for next round...');
                            return sleep(10000).then( () => {
                                return monitor.restart();
                            })
                        }
                    })
                    .catch( (err) => {
                        t.fail('failed \''  + testCmd + '\' testing, ' + (err.stack ? err.stack : err));
                        return Promise.resolve();   // continue with next round ?
                    });
                });
            }, Promise.resolve())
            .then( () => {
                t.end();
                return resolve();
            })
            .catch( (err) => {
                t.fail(err.stack ? err.stack : err);
                t.end();
                return reject(new Error('defaultTest failed'));
            });
        });
    });
}


/**
* fork a child process to act as a client to interact with backend's blockchain system
* @msg {Object}, message to be sent to child process
* @t {Object}, tape object
*/
function loadProcess(msg, t) {
    return new Promise( function(resolve, reject) {
        var child = childProcess.fork('../../src/comm/bench-client.js');
        child.on('message', function(message) {
            if(message.cmd === 'result') {
                results.push(message.data);
                resolve();
            }
            if(message.cmd === 'error') {
                reject('client encountered error, ' + message.data);
            }
            child.kill();
        });

        child.on('error', function(){
            reject('client encountered unexpected error');
        });

        child.on('exit', function(){
            console.log('client exited');
            resolve();
        });

        child.send(msg);
    });
}

/**
* merge testing results from multiple child processes and store the merged result in the global result array
* result format: {
*     succ : ,                            // number of succeeded txs
*     fail : ,                            // number of failed txs
*     create : {min: , max: },            // min/max time of tx created
*     valid  : {min: , max: },            // min/max time of tx becoming valid
*     delay  : {min: , max: , sum: },     // min/max/sum time of txs' processing delay
*     throughput : {time: ,...}           // tps of each time slot
*     out: {key, value}                   // output that should be cached for following tests
* }
* @opt, operation being tested
* @t, tape object
*/
// TODO: should be moved to a dependent 'analyser' module in which to do all result analysing work
function processResult(opt, t){
    if(results.length === 0) {
        t.fail('empty result');
        return;
    }

    var r = results[0];
    putCache(r.out);

    for(let i = 1 ; i < results.length ; i++) {
        let v = results[i];
        putCache(v.out);
        r.succ += v.succ;
        r.fail += v.fail;
        if(v.create.min < r.create.min) {
            r.create.min = v.create.min;
        }
        if(v.create.max > r.create.max) {
            r.create.max = v.create.max;
        }
        if(v.valid.min < r.valid.min) {
            r.valid.min = v.valid.min;
        }
        if(v.valid.max > r.valid.max) {
            r.valid.max = v.valid.max;
        }
        if(v.delay.min < r.delay.min) {
            r.delay.min = v.delay.min;
        }
        if(v.delay.max > r.delay.max) {
            r.delay.max = v.delay.max;
        }
        r.delay.sum += v.delay.sum;
        for(let j in v.throughput) {
            if(typeof r.throughput[j] === 'undefined') {
                r.throughput[j] = v.throughput[j];
            }
            else {
                r.throughput[j] += v.throughput[j];
            }
        }

        if(blockchain.gettype() === 'fabric' && r.hasOwnProperty('delayC2E')) {
            if(v.delayC2E.min < r.delayC2E.min) {
                r.delayC2E.min = v.delayC2E.min;
            }
            if(v.delayC2E.max > r.delayC2E.max) {
                r.delayC2E.max = v.delayC2E.max;
            }
            r.delayC2E.sum += v.delayC2E.sum;

            if(v.delayE2O.min < r.delayE2O.min) {
                r.delayE2O.min = v.delayE2O.min;
            }
            if(v.delayE2O.max > r.delayE2O.max) {
                r.delayE2O.max = v.delayE2O.max;
            }
            r.delayE2O.sum += v.delayE2O.sum;

            if(v.delayO2V.min < r.delayO2V.min) {
                r.delayO2V.min = v.delayO2V.min;
            }
            if(v.delayO2V.max > r.delayO2V.max) {
                r.delayO2V.max = v.delayO2V.max;
            }
            r.delayO2V.sum += v.delayO2V.sum;
        }
    }
    r['opt'] = opt;

    resultsbyround.push(r);

    var resultTable = [];
    resultTable[0] = getResultTitle();
    resultTable[1] = getResultValue(r);
    console.log('###test result:###');
    printTable(resultTable);
}

/**
* print table format value
* @value {Array}, values of the table
*/
function printTable(value) {
    var t = table.table(value, {border: table.getBorderCharacters('ramac')});
    console.log(t);
}

/**
* get the default result table's title
* @return {Array}, result table's title
*/
function getResultTitle() {
    // return ['OPT', 'Succ', 'Fail', 'Send Rate', 'Max Delay', 'Min Delay', 'Avg Delay', 'Max Throughput', 'Min Throughput', 'Avg Throughput'];
    return ['Name', 'Succ', 'Fail', 'Send Rate', 'Max Delay', 'Min Delay', 'Avg Delay', 'Throughput'];
}

/**
* get the default formatted result table's values
* @r {Object}, result's value
* @return {Array}, formatted result table's values
*/
function getResultValue(r) {
    var min = 1000000, max = 0, sum = 0;
    for(let v in r.throughput) {
        let t = r.throughput[v];
        if(t < min) {
            min = t;
        }
        if(t > max) {
            max = t;
        }
        sum += t;
    }

    var row = [];
    row.push(r.opt);
    row.push(r.succ);
    row.push(r.fail);
    (r.create.max === r.create.min) ? row.push((r.succ + r.fail) + ' tps') : row.push(((r.succ + r.fail) / (r.create.max - r.create.min)).toFixed(0) + ' tps');
    row.push(r.delay.max.toFixed(2) + ' s');
    row.push(r.delay.min.toFixed(2) + ' s');
    row.push((r.delay.sum / r.succ).toFixed(2) + ' s');
//    row.push(max.toString() + ' tps');
//    row.push(min.toString() + ' tps');
    (r.valid.max === r.valid.min) ? row.push(r.succ + ' tps') : row.push(((r.succ / (r.valid.max - r.valid.min)).toFixed(0)) + ' tps');
    return row;
}

/**
* print the performance testing results of all test rounds
*/
function printResultsByRound() {
    var resultTable = [];
    var title = getResultTitle();
    title.unshift('Test');
    resultTable[0] = title;

    for(let i = 0 ; i < resultsbyround.length ; i++) {
        var row = getResultValue(resultsbyround[i]);
        row.unshift(i);
        resultTable.push(row);
    }
    console.log('###all test results:###');
    printTable(resultTable);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
