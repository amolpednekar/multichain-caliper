
'use strict'


var fs = require('fs')
var os = require('os')

/**
 * Message handler
 */

process.on('message', function(msg) {

    messageHandle(msg)

    function messageHandle(message) {
        
    //create a global array with element array[0] = array1[txID]=obj
    var globalArray = []    
    var promises = []
    var no_Of_Tx = 0
    
    console.log(message.length)
    
    message.forEach(function(element,index){

        var map = []
        //element is an array of objects with TXID for one round
        element.forEach(function(internal_element){

            map[internal_element.id] = internal_element
            no_Of_Tx++

        })

        globalArray[index] = map


    })

    console.log("Length of Final Global Array with maps :",globalArray.length)

    console.log("Number of Tx:", no_Of_Tx)

    computeResult(globalArray,no_Of_Tx)
        .then((values)=>{
        
            console.log("Result",values)
            process.send({cmd: 'result', data: values});
        
    })
   
}     

})

function computeResult(msg,no_Of_Tx) {

    return new Promise(function(resolve,reject){

              getResultConfirmation(msg,no_Of_Tx)
                .then((resultWithValidTime)=>{
                        resolve(resultWithValidTime)
                                 
            })
    })
   
}

function getResultConfirmation(globalArray,no_Of_Tx){
    
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

    var consumer = new Consumer(client1,topics,options);
	var finalresult =[];	
	var isTxfound;
	var pendingCounter=0

   consumer.on('message', function(message) {
		
		var buf = new Buffer(message.value); // Read string into a buffer.
		var data = buf.toString('utf-8')

        console.log("Block Number ",JSON.parse(data).block.header.number)
        console.log("pending counter ",pendingCounter)

			var block = JSON.parse(data).block

					for (var index=0; index < block.data.data.length; index++) {
                        var channel_header = block.data.data[index].payload.header.channel_header;
                        
                        // find in the globalArray if the Id exists or not. It will be present but in any one of the array in global Array
                        if (globalArray[0][channel_header.tx_id]!=undefined || globalArray[0][channel_header.tx_id]!=null){
                           
                            // present at index 0
                            var object = globalArray[0][channel_header.tx_id]
                            object.time_valid = JSON.parse(data).validTime;
                            object.status = "success";
                            globalArray[0][channel_header.tx_id] = object
                            pendingCounter++

                        }else if (globalArray[1][channel_header.tx_id]!=undefined || globalArray[1][channel_header.tx_id]!=null){
                            // present at index 1
                            
                            var object = globalArray[1][channel_header.tx_id]
                            object.time_valid = JSON.parse(data).validTime;
                            object.status = "success";
                            globalArray[1][channel_header.tx_id] = object
                            pendingCounter++
                            
                        }else if (globalArray[2][channel_header.tx_id]!=undefined || globalArray[2][channel_header.tx_id]!=null){
                            // present at index 2
                            
                            var object = globalArray[2][channel_header.tx_id]
                            object.time_valid = JSON.parse(data).validTime;
                            object.status = "success";
                            globalArray[2][channel_header.tx_id] = object
                            pendingCounter++

                        }else if (globalArray[3][channel_header.tx_id]!=undefined || globalArray[3][channel_header.tx_id]!=null){
                            // present at index 3
                            
                            var object = globalArray[3][channel_header.tx_id]
                            object.time_valid = JSON.parse(data).validTime;
                            object.status = "success";
                            globalArray[3][channel_header.tx_id] = object
                            pendingCounter++

                        }else if (globalArray[4][channel_header.tx_id]!=undefined || globalArray[4][channel_header.tx_id]!=null){
                            // present at index 4
                            
                            var object = globalArray[4][channel_header.tx_id]
                            object.time_valid = JSON.parse(data).validTime;
                            object.status = "success";
                            globalArray[4][channel_header.tx_id] = object
                            pendingCounter++
                        }else {

                            // not present in at all // ** no need to handle actually**

                        }
                        if (pendingCounter == no_Of_Tx)
                        {
                            console.log("All resolved")
                            resolve(globalArray)
                        }
                        
                }	

               
           

	});

	consumer.on('error',function(error){

		console.log(error)
	})
  })
}

function getDefaultTxStats(globalArray) {

   return new Promise(function(resolve,reject){

    console.log("Get default stats function",globalArray)

    var finalArrayWithStats = []
   
    for (var roundIndex=0; roundIndex < globalArray.length; roundIndex++){

        let roundData =  globalArray[roundIndex]
        console.log("Each round data lenght ",roundData.length)
        var roundArrayWithStats = []
        var succ = 0, fail = 0, delay = 0;
        var minValid, maxValid, minCreate, maxCreate;
        var minDelay = 100000, maxDelay = 0;
        var throughput = {};

    roundData.forEach(function(element){
  
   // for(let i = 0 ; i < results.length ; i++) {
        let stat   = element
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
   // }

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
        roundArrayWithStats.push(stats)
    })
 
    finalArrayWithStats[roundIndex] = roundArrayWithStats
  }
          resolve(finalArrayWithStats)
 })

}



