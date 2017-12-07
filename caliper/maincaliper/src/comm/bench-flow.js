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
var roundName = []
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
var allRoundarray = []
var results = [];           // original output of recent test round
var resultsbyround = [];    // processed output of each test round
var round = 0;              // test round
var cache = {};            // memory cache to store defined output from child process, so different test case could exchange data if needed
                            // this should only be used to exchange small amount of data
var json2csv = require('json2csv');
var fs = require('fs');
const os = require('os');
var startProcessTime = process.uptime();
var endtime = 0; 

/**
* Read cached data by key name
* @key {string}
* @return {Object}, cached data
*/
function getCache(key) {
    return cache[key];
}

function populateAccounts(count){
	var account = []
	for(var i=0;i<count;i++){
		account.push("accountno_"+i)
	}
	return account;
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
module.exports.run = function(config_path,kafka_child) {
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
	
        return blockchain.init();
		
    })
    .then( () => {
	
      //  return blockchain.installSmartContract();
		return new Promise(function(resolve, reject) {
			return resolve();
		})

    })
    .then( () => {

        monitor.start().then(()=>{
            console.log('started monitor successfully');
        })
        .catch( (err) => {
            console.log('could not start monitor, ' + (err.stack ? err.stack : err));
        });
		
		
        var allTests  = require(config_path).test.rounds;
        roundName = allTests
        var clientNum = require(config_path).test.clients;
        var testIdx   = 0;
        var testNum   = allTests.length;
        return allTests.reduce( (prev, item) => {
            return prev.then( () => {
                ++testIdx;
                return defaultTest(item, clientNum, (testIdx === testNum))
            });
        }, Promise.resolve());
    })
    .then( () => {
    
        var gloablArray = []
        console.log('----------finished test----------\n');
        
        kafka_child.kill()

        endtime = process.uptime();

        console.log("All rounds array input size:",gloablArray.length)
        printResultsByRound();
        monitor.printMaxStats();
        monitor.stop();

        let config = require(config_path);
        if (config.hasOwnProperty('command') && config.command.hasOwnProperty('end')){
            console.log(config.command.end);
            let end = exec(config.command.end);
            end.stdout.pipe(process.stdout);
            end.stderr.pipe(process.stderr);
        } 

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
						
                    }else if(parseInt(args.arguments[key])>0 && msg.cmd=="query"){
					
						msg.args[key] = populateAccounts(args.arguments[key])
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
                            fs.unlink('offset.txt', function(error) {
                                if (error) {
                                    console.log("Error deleting")
                                }else{
                                console.log('Deleted offset.txt!!');
                                }
                            });
                            console.log('wait 5 seconds for next round...');
                            return sleep(5000).then( () => {
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
                allRoundarray.push(message.data)
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
function processResult(opt,t ){
console.log(results)

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

    //printResultsByRound()
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
    return ['Name', 'Succ', 'Fail', 'Send Rate', 'Max Delay', 'Min Delay', 'Avg Delay', 'Throughput','Delay_c2e','Delay_e2o','Delay_o2v'];
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

	console.log("*************STATS****************")
	console.log("success",r.succ)
	console.log("valid_max",r.valid.max)
	console.log("valid_min",r.valid.min)
    var row = [];
    row.push(r.opt);
    row.push(r.succ);
    row.push(r.fail);
    (r.create.max === r.create.min) ? row.push((r.succ + r.fail) + ' tps') : row.push(((r.succ + r.fail) / (r.create.max - r.create.min)).toFixed(0) + ' tps');
    row.push(r.delay.max.toFixed(4) + ' s');
    row.push(r.delay.min.toFixed(4) + ' s');
    row.push((r.delay.sum / r.succ).toFixed(4) + ' s');

    // intermediate late
   
//    row.push(max.toString() + ' tps');
//    row.push(min.toString() + ' tps');
    (r.valid.max === r.valid.min) ? row.push(r.succ + ' tps') : row.push(((r.succ / (r.valid.max - r.valid.min)).toFixed(0)) + ' tps');
    if(r.opt!='query'){
		row.push((r.delayC2E.sum / r.succ).toFixed(4) + ' s');
		row.push((r.delayE2O.sum / r.succ).toFixed(4) + ' s');
		row.push((r.delayO2V.sum / r.succ).toFixed(4) + ' s');
		
	}else{
	
		row.push(0);
		row.push(0);
		row.push(0);
	
	}

    return row;
}

/**
* print the performance testing results of all test rounds
*/
function printResultsByRound() {
    var mydata=[]
	var resultTable = [];
    var title = getResultTitle();
	var newtitle = ['Name', 'Succ', 'Fail', 'Send_Rate', 'Max_Delay', 'Min_Delay', 'Avg_Delay', 'Throughput','Delay_c2e','Delay_e2o','Delay_o2v','T0_time','T1_time','Tn_time','ratio']                              
 	//cosnole.log(title.length)
    title.unshift('Test');
    resultTable[0] = title;

    for(let i = 0 ; i < resultsbyround.length ; i++) {
        
		var row = getResultValue(resultsbyround[i]);
		var obj={
			'Name':row[0],
			'Succ':row[1],
			'Fail':row[2],
			'Send_Rate':row[3],
			'Max_Delay':row[4],
			'Min_Delay':row[5],
			'Avg_Delay':row[6],
            'Throughput':row[7],
            'Delay_c2e':row[8],
            'Delay_e2o':row[9],
            'Delay_o2v':row[10],
			'T0_time':resultsbyround[i].create.min,
			'T1_time':resultsbyround[i].valid.min,
			'Tn_time':resultsbyround[i].valid.max,
			'ratio':((resultsbyround[i].valid.max - resultsbyround[i].create.min)/(resultsbyround[i].valid.max - resultsbyround[i].valid.min))
		}
		mydata.push(obj)
		//console.log("obj:\n",obj)
        row.unshift(i);
        resultTable.push(row);
    }
	
    console.log('###all test results:###');
	var fields_avg=['Name','SendRate_Avg','Avg_Delay','Avg_Throughput','Min_delay','Max_delay','No_of_failed_tx','Delay_c2e','Delay_e2o','Delay_o2v','avg_ratio']
	var data_avg=[];
	var data_method =[]
	var sum_avg,sum_throughput,sum_sendrate,avg_delay,avg_throughput,avg_sendrate,sum_fail,avg_fail,avg_Delay_c2e, avg_Delay_e2o ,avg_Delay_o2v,sum_Delay_c2e,sum_Delay_e2o,sum_Delay_o2v 
	var sum_ratio,avg_ratio
    var result = json2csv({ data: mydata, fields: newtitle });
    console.log("File data",result)
    console.log("mydata data",mydata)

	fs.writeFile(os.hostname()+'_statistics.csv', result, function(err) {
	  if (err){
		console.log(err)
	  }else{
	  
		 var newLine= "\r\n";
		// console.log('csv file saved');
		 for(let j = 0 ; j < mydata.length ; j++) {
		 
            var obj1 = mydata[j];
 
			var temp_arr = data_method[obj1.Name];
			if(temp_arr==null||temp_arr==undefined){
					var temp =[];
					var o ={
						'SendRate_Avg':parseInt(obj1.Send_Rate)||0,
						'delay':parseFloat(obj1.Avg_Delay)||0,
						'throughput':parseFloat(obj1.Throughput)||0,
						'mindelay':parseFloat(obj1.Min_Delay)||0,
						'maxdelay':parseFloat(obj1.Max_Delay)||0,
                        'No_of_failed_tx':parseInt(obj1.Fail)||0,
                        'Delay_c2e':parseFloat(obj1.Delay_c2e)||0,
                        'Delay_e2o':parseFloat(obj1.Delay_e2o)||0,
                        'Delay_o2v':parseFloat(obj1.Delay_o2v)||0,
						'ratio':parseFloat(obj1.ratio)||0
					}
					temp.push(o)
					data_method[obj1.Name]= temp
			}else{
					
					var o ={
						'SendRate_Avg':parseInt(obj1.Send_Rate)||0,
						'delay':parseFloat(obj1.Avg_Delay)||0,
						'throughput':parseFloat(obj1.Throughput)||0,
						'mindelay':parseFloat(obj1.Min_Delay)||0,
						'maxdelay':parseFloat(obj1.Max_Delay)||0,
                        'No_of_failed_tx':parseInt(obj1.Fail)||0,
                        'Delay_c2e':parseFloat(obj1.Delay_c2e)||0,
                        'Delay_e2o':parseFloat(obj1.Delay_e2o)||0,
                        'Delay_o2v':parseFloat(obj1.Delay_o2v)||0,
						'ratio':parseFloat(obj1.ratio)||0
                    }
                console.log(temp_arr)
				temp_arr.push(o)
				data_method[obj1.Name] = temp_arr
			}
			
		 }
		 
		 for(var key in data_method){
		 
			
            var value = data_method[key]
             sum_Delay_c2e = 0
             sum_Delay_e2o = 0
             sum_Delay_o2v = 0
			sum_avg=0;
			sum_throughput =0;
			sum_sendrate =0;
			sum_fail=0;
			sum_ratio = 0;
			
			var mindelay = value[0].mindelay;
			var maxdelay = value[0].maxdelay;
			for(var i=0;i<value.length;i++){
                //console.log("delay in value = ",value[i].delay)
                console.log("value: ",value[i])
				sum_avg+=value[i].delay;
				sum_throughput+=value[i].throughput;
				sum_sendrate+=value[i].SendRate_Avg;
                sum_fail+=value[i].No_of_failed_tx;
                sum_Delay_c2e+=value[i].Delay_c2e
                sum_Delay_e2o+=value[i].Delay_e2o
                sum_Delay_o2v+=value[i].Delay_o2v
				sum_ratio+=value[i].ratio
				
				if(mindelay > value[i].mindelay){
					mindelay = value[i].mindelay
				}
				
				if(maxdelay < value[i].maxdelay){
					maxdelay = value[i].maxdelay
				}
			}
			//console.log("Sum: ",sum_avg);
			//console.log("Sum: ",sum_throughput);
			avg_delay =  sum_avg/value.length;
			avg_throughput = sum_throughput/value.length;
			avg_sendrate = sum_sendrate/value.length;
            avg_fail = sum_fail/value.length
            avg_Delay_c2e = sum_Delay_c2e/value.length;
            avg_Delay_e2o = sum_Delay_e2o/value.length;
            avg_Delay_o2v = sum_Delay_o2v/value.length;
			avg_ratio = sum_ratio/value.length;

			var obj2 = {
				"Name": key,
				"SendRate_Avg":avg_sendrate,
				'Avg_Delay':avg_delay,
				'Avg_Throughput':avg_throughput,
				'Min_delay':mindelay,
				'Max_delay':maxdelay,
                'No_of_failed_tx':avg_fail,
                'Delay_c2e':avg_Delay_c2e,
                'Delay_e2o':avg_Delay_e2o,
                'Delay_o2v':avg_Delay_o2v,
				'avg_ratio':avg_ratio

            }
            console.log(obj2)
			data_avg.push(obj2)
		 
		 }
		 
		 var toCsv = {
			data: data_avg,
			fields: fields_avg
		};
		var csv1 = newLine+newLine+json2csv(toCsv) + newLine+newLine;
		//console.log(csv1)
        fs.appendFile(os.hostname()+'_statistics.csv', csv1, function (err) {
            if (err) throw err;
            console.log('The "data to append" was appended to file!');
			
			var timeStarted = endtime - startProcessTime;
			console.log("Time Started: ",timeStarted);
			var timeFields =["Time taken"]
			var dataTime = [];
			var a = {
				"Time taken":timeStarted
			}
			dataTime.push(a)
			var toCsvTime = {
					data: dataTime,
					fields: timeFields
			};
			var csvtime = newLine+newLine+json2csv(toCsvTime) + newLine+newLine;
			
			fs.appendFile(os.hostname()+'_statistics.csv', csvtime, function (err) {
				if (err) throw err;
				console.log('The "data to append" was appended to file!');
			});
			
        });
	  }
	 
	});
	
    printTable(resultTable);
	
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}