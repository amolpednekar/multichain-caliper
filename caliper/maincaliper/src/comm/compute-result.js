
'use strict'


var fs = require('fs')
var os = require('os')

/**
 * Message handler
 */

process.on('message', function(msg) {

    messageHandle(msg)

    function messageHandle(message) {
        
    var promises = []
    
    console.log(message.length)
    for (var i=0; i<message.length;i++){
      
            promises.push(computeResult(message[i],os.hostname()+"_"+i))
        }
   
   Promise.all(promises).then((values)=>{

    console.log("Result",values)
    process.send({cmd: 'result', data: values});

   })
    
 }

})

function computeResult(msg,groupID) {

    return new Promise(function(resolve,reject){

              getResultConfirmation(msg,groupID)
                .then((resultWithValidTime)=>{

                    console.log(resultWithValidTime)
                // send the data with valid time to getDefaultTxStats function
                getDefaultTxStats(resultWithValidTime)
                    .then((finalResult)=>{
                    
                        resolve(finalResult)

                })          

            })
    })
   
}

function getResultConfirmation(results,groupID){
    
    console.log("getResultConfirmation")

  return new Promise(function(resolve,reject){
        
    var kafka = require('kafka-node');	
    var Consumer = kafka.Consumer;        //requestTimeout:300000
    var Client1 = kafka.KafkaClient;
    var kafkaBrokers = '10.51.235.65:9092,10.51.235.65:7092,10.51.235.65:8092';

    var client1 = new kafka.KafkaClient({kafkaHost: '10.51.235.65:9092,10.51.235.65:7092,10.51.235.65:8092',requestTimeout:3000000});
    
    var options = {
        autoCommit: true,
        fetchMaxWaitMs: 1000,
        fetchMaxBytes: 4096 * 4096,
        encoding: 'buffer',
        fromOffset:true
        //requestTimeout:300000
       // groupId: groupID
        };

    var topics = [{
        topic: 'node-test',
        offset: 0
    }];

    var HighLevelConsumer = kafka.HighLevelConsumer
    var consumer = new Consumer(client1,topics,options);

	var finalresult =[];	
	var isTxfound;
	var pendingCounter=0

   consumer.on('message', function(message) {
		
		var buf = new Buffer(message.value); // Read string into a buffer.
		var data = buf.toString('utf-8')
		
		console.log("groupid:results length:",groupID,results.length)

		console.log("Block Number ",JSON.parse(data).block.header.number)

	for(var i =0;i<results.length;i++){
			isTxfound = false;
			var inputTx = results[i];
			var block = JSON.parse(data).block

					for (var index=0; index < block.data.data.length; index++) {
						var channel_header = block.data.data[index].payload.header.channel_header;
						if(channel_header.tx_id == inputTx.id){
													
							inputTx.time_valid = JSON.parse(data).validTime;
							inputTx.status = "success";
							isTxfound =true;
							results.splice(i,1)
							i--
							finalresult.push(inputTx)
							
						}
					
					}
			
			}
			if(results.length<=0){
				console.log("Length is 0")
				resolve(finalresult);
			}
	
	});

	consumer.on('error',function(error){

		console.log(error)
	})
  })
}

function getDefaultTxStats(results) {
   return new Promise(function(resolve,reject){
   
    var succ = 0, fail = 0, delay = 0;
    var minValid, maxValid, minCreate, maxCreate;
    var minDelay = 100000, maxDelay = 0;
    var throughput = {};
    for(let i = 0 ; i < results.length ; i++) {
        let stat   = results[i];
        let create = stat['time_create'];

        if(typeof minCreate === 'undefined') {
            minCreate = create;
            maxCreate = create;
        }
        else {
            if(create < minCreate) {
                minCreate = create;
            }
            if(create > maxCreate) {
                maxCreate = create;
            }
        }

        if(stat.status === 'success') {
            succ++;
            let valid = stat['time_valid'];
            let d     = valid - create;
            if(typeof minValid === 'undefined') {
                minValid = valid;
                maxValid = valid;
            }
            else {
                if(valid < minValid) {
                    minValid = valid;
                }
                if(valid > maxValid) {
                    maxValid = valid;
                }
            }

            delay += d;
            if(d < minDelay) {
                minDelay = d;
            }
            if(d > maxDelay) {
                maxDelay = d;
            }

            let idx = Math.round(valid).toString();
            if(typeof throughput[idx] === 'undefined') {
                throughput[idx] = 1;
            }
            else {
                throughput[idx] += 1;
            }
        }
        else {
            fail++;
        }
    }

    var stats = {
        'succ' : succ,
        'fail' : fail,
        'create' : {'min' : minCreate, 'max' : maxCreate},
        'valid'  : {'min' : minValid,  'max' : maxValid },
        'delay'  : {'min' : minDelay,  'max' : maxDelay, 'sum' : delay },
        'throughput' : throughput
    };

   // getdefaultstats from fabric.js
   var minDelayC2E = 100000, maxDelayC2E = 0, sumDelayC2E = 0; // time from created to endorsed
   var minDelayE2O = 100000, maxDelayE2O = 0, sumDelayE2O = 0; // time from endorsed to ordered
   var minDelayO2V = 100000, maxDelayO2V = 0, sumDelayO2V = 0; // time from ordered to recorded
   var hasValue = true;
   for(let i = 0 ; i < results.length ; i++) {
       let stat = results[i];
       if(!stat.hasOwnProperty('time_endorse')) {
           hasValue = false;
           break;
       }
       if(stat.status === 'success') {
           let delayC2E = stat['time_endorse'] - stat['time_create'];
           let delayE2O = stat['time_order'] - stat['time_endorse'];
           let delayO2V = stat['time_valid'] - stat['time_order'];

           if(delayC2E < minDelayC2E) {
               minDelayC2E = delayC2E;
           }
           if(delayC2E > maxDelayC2E) {
               maxDelayC2E = delayC2E;
           }
           sumDelayC2E += delayC2E;

           if(delayE2O < minDelayE2O) {
               minDelayE2O = delayE2O;
           }
           if(delayE2O > maxDelayE2O) {
               maxDelayE2O = delayE2O;
           }
           sumDelayE2O += delayE2O;

           if(delayO2V < minDelayO2V) {
               minDelayO2V = delayO2V;
           }
           if(delayO2V > maxDelayO2V) {
               maxDelayO2V = delayO2V;
           }
           sumDelayO2V += delayO2V;
       }
   }

   if(hasValue) {
       stats['delayC2E'] = {'min': minDelayC2E, 'max': maxDelayC2E, 'sum': sumDelayC2E};
       stats['delayE2O'] = {'min': minDelayE2O, 'max': maxDelayE2O, 'sum': sumDelayE2O};
       stats['delayO2V'] = {'min': minDelayO2V, 'max': maxDelayO2V, 'sum': sumDelayO2V};
   }

   resolve(stats)
 })
}



