var Client   = require('fabric-client')
var fs   = require('fs')
var path = require('path');
//get user arguments
var async = require('async')
var type_flag = process.argv[2];
var type = process.argv[3];
var cmd = process.argv[4];
var counter =0 ;
var startTime = null;
var endTime = null

var granularity = 1000000;
Client.addConfigFile("fabric.json");

var ORGS = Client.getConfigSetting('fabric').network;
var channelName = Client.getConfigSetting('fabric').channel[0].name;
var chaincodes = Client.getConfigSetting('fabric').chaincodes;

var client  = new Client();
var channel = client.newChannel(channelName);

Client.setConfigSetting('request-timeout', 200000000);

channel.addOrderer(
    client.newOrderer(
        ORGS.orderer.url,
		{"grpc.max_receive_message_length": -1,
		 "grpc.max_send_message_length":-1}
    )
);
targets = []
let peer = client.newPeer(
						"grpc://10.244.5.45:8057",
						{"grpc.max_receive_message_length": -1,
						 "grpc.max_send_message_length":-1}
			);
channel.addPeer(peer);
/*peer = client.newPeer(
						"grpc://10.244.5.44:8051",
						{"grpc.max_receive_message_length": -1,
						 "grpc.max_send_message_length":-1}
			);*/
			
Client.newDefaultKeyValueStore({path:"/hfc/hfc-test-kvs_peerOrg2"}).then((store) => {

    client.setStateStore(store);
    return getAdmin(client,"org2", ORGS.org2.mspid);
	
    
}).then((admin) => {

	console.log("successfully enrolled admin!!")
	eh = client.newEventHub();
					
	eh.setPeerAddr(
		"grpc://10.244.5.45:8059",
		{
			'request-timeout': 200000000,
			"grpc.max_receive_message_length": -1,
			"grpc.max_send_message_length":-1
		}
	);
					eh.connect();
					
					
	
	return channel.initialize();
	
}).then(()=>{
	
	console.log("successfully intitialized chain!!")
	return channel.queryInfo(targets[0], true)
	

},(err) => {
		console.log('Failed to initialize the channel: ',err);
	
}).then((blockchain_info)=>{

	height = blockchain_info.height.low;
	console.log("height: = ",height)
	
	if(type=="5"||type=="3"){
		if(cmd == "-a"){
			
			startTime =  new Date().getTime();
			var count = parseInt(process.argv[5])
			
			if(count <= granularity){
				return invokebycontext(chaincodes[0].id, chaincodes[0].version, ["0",count.toString()], "addaccounts","org1");
			
			}else{
				
				var promises = []
				var c = count/granularity;
				console.log("c: ",c)
				var rounds   = Array(c).fill(0);
				z=0;
				return new Promise(function(resolve,reject){
						
						eh.registerBlockEvent((block) => {
						
							console.log("transaction completed: ",c);
							console.log("start index: ",z);
							console.log("end index: ",z+granularity);
							c--;
							z = z+granularity;
							temp = z
							if(c>0){
							
								invokebycontext(chaincodes[0].id, chaincodes[0].version, [temp.toString(),(temp+granularity).toString()], "addaccounts","org1").then(()=>{
										
										console.log("invoke finished: ",temp.toString())
										//return sleep(1000)
								});
						
							}else{
									eh.disconnect();
									resolve();
							}
							
							
						});
					
						if(c>0){
						
								invokebycontext(chaincodes[0].id, chaincodes[0].version, [z.toString(),(z+granularity).toString()], "addaccounts","org1").then(()=>{
										
						
								});
						
						}
				})
				
				/*return rounds.reduce(function(prev, item) {
					
					return prev.then( () => {
							temp = z
							z+=granularity;
							return invokebycontext(chaincodes[0].id, chaincodes[0].version, [temp.toString(),(temp+granularity).toString()], "addaccounts","org1").then(()=>{
									
									console.log("invoke finished: ",temp.toString())
									return sleep(1000)
							});
					});
				},Promise.resolve()).then(() => {
				
							console.log("")
							Promise.resolve()
				})*/
				
			}
	
		
		}else if(cmd == "-d"){
			
			return invokebycontext(chaincodes[0].id, chaincodes[0].version, [], "deleteaccounts","org1");
		
		}else if(cmd == "-q"){
			startTime =  new Date().getTime();
			var count = process.argv[5]
			return querybycontext(chaincodes[0].id, chaincodes[0].version, [count], "checkprepopulatedata");
		}
		
	}else if(type=="2") {
	
		if(cmd == "-a"){
			
			var count = parseInt(process.argv[5])
			var batchsize = parseInt(process.argv[6])
			if(count > height){
			
				return growBlockchain(chaincodes[0].id, chaincodes[0].version, ["218931238","500"], "open","org1",(count-height),batchsize);
		
			}else{
				console.log("Blockchain size is already greater than the specified size")
			}
			
		}
	}else if(type =="4"){
	
		if(cmd == "-q"){
		
			var minblock = parseInt(process.argv[5]);
			var maxblock = parseInt(process.argv[6]);
			if((minblock > 0 && minblock <= height) && (maxblock > 0 && maxblock <= height) && (minblock <= maxblock) ){
				return rangeBlockQueries(minblock,maxblock)
				
			}else{
				console.log("Input not valid")
			}
		}
	}
	
}).then(()=>{
	endTime =  new Date().getTime();
	console.log("timeTaken: ",endTime-startTime)
	console.log("done")
	process.exit(1);
});

function rangeBlockQueries(minblock,maxblock){

	var promises = [];
	var maxbal_acc = null
	return new Promise((resolve,reject)=>{
		
		for(var i=minblock;i<=maxblock;i++){
	
			promises.push(checkBlockTransaction(i))
	
		}	
		Promise.all(promises).then((values) => {
		
			//console.log("values")
			var data_method =[];
			for(var i=0;i<values.length;i++){
				
				var value= values[i];
				for(var j=0;j<value.length;j++){
				
					var obj = value[j];
					var prev_bal = data_method[obj.acc];
					if(prev_bal==null||prev_bal==undefined){
						data_method[obj.acc]= obj.balance
					}else{
						bal= obj.balance + prev_bal;
						data_method[obj.acc] = bal
					}
				
				}
			}
			var largest =null;
			var output = []
			for(key in data_method){
				if(largest==null){
					largest = {
						"acc":key,
						"balance":data_method[key]
					}	
				}
				if(data_method[key]>=largest.balance){
				
					largest = {
						"acc":key,
						"balance":data_method[key]
					}
				}
			}
			console.log("Largest: ",largest)
			console.log("All accounts: ",data_method);
			resolve()
		});
	});
}
function checkBlockTransaction(blockid){
	
	
	var result = [];
	return new Promise((resolve,reject)=>{
	
		channel.queryBlock(blockid, targets[0], true).then((block)=>{
			var transactions = block.data.data;
			//console.log(transactions.length)
			for(var i=0;i<transactions.length;i++){
			
					var transaction = transactions[i].payload.data;
					//console.log(transaction)
					var payload = transaction.actions[0].payload.chaincode_proposal_payload.input.toString();
					payload = payload.replace(/(?!\w|\s)./g, '').replace(/\s+/g, ' ').replace(/^(\s*)([\W\w]*)(\b\s*$)/g, '$2')
					var arr = payload.split(" ");
					var acct = arr[2];
					var bal = arr[3];
					var obj = {
						"acc":acct,
						"balance":parseInt(bal)
					}
					result.push(obj)
			}
			resolve(result)
		});
	})
}

function growBlockchain(id, version, args, fnName,orgPath,blockheight,batchsize){
	
	var transactionsperround  = 4000;
	var idx=-1
	var sleeptime = 40000;
	var txpersec = 400;
	var totalTransaction = blockheight*batchsize;
	var rounds = Math.floor(totalTransaction/transactionsperround);
	console.log("rounds: ",rounds)
	var promises = [];

	var start = process.uptime();
	var rounds   = Array(rounds).fill(0);
	return new Promise(function(resolve,reject){
	
			eh.setPeerAddr(ORGS[orgPath]['peer1'].events);
			eh.connect();
			initalsize = 0;
			eh.registerBlockEvent((block) => {
			
				initalsize++;
				console.log("\ninitalsize: ",initalsize)
				if(initalsize == blockheight){
					resolve()
				}else{
					console.log("else");
				}
			});
	
			rounds.reduce(function(prev, task) {
					
					console.log("got task")
					return prev.then(()=>{
						return doTransactions(transactionsperround,txpersec,id, version, args, fnName,orgPath)

					}).then(()=>{
					
						console.log("finished task")
						return sleep(1000)
						
					})
					
			}, new Promise(function(resolve,reject){
				resolve()
			}));
			
	})
}
function doTransactions(transactionsperround,txpersec,id, version, args, fnName,orgPath){
		
		console.log("starting do transactions")
		var start = process.uptime();
		var promises=[];
		var idx =0;
		var rounds = Array(transactionsperround).fill(0);
		return new Promise(function(resolve,reject){
		
		
				rounds.reduce(function(prev, item) {
					return prev.then( () => {
							promises.push(invokebycontext(id, version, args, fnName,orgPath));
							idx++;
							//console.log("id:",idx)
							return sleep((1000/txpersec), start, idx);
					});
				},Promise.resolve()).then(() => {
							return Promise.all(promises);
				}).then( () => {
					console.log("completed do transactions")
					resolve();
				});
		
		});
		

}

function querybycontext(id, version, args, fnName){
    
	return new Promise(function(resolve,reject){
	
		var tx_id = client.newTransactionID();
		
		var request = {
			chaincodeId : id,
			chaincodeVersion : version,
			txId: tx_id,
			fcn: fnName,
			args: args
		};

		channel.queryByChaincode(request,targets[0])
		.then((responses) => {
			
			if(responses.length > 0) {
				var value = responses[0];
				console.log("returned value: ",value.toString('utf8'));
				if(value instanceof Error) {
					reject();
				}
				resolve();
			}
			else {
				reject(new Error('no query responses'));
			}
		})
		.catch((err) => {
			reject(err)
		});
		
	});
};

function invokebycontext(id, version, args, fnName,orgPath){
	
	
	return new Promise(function(resolve,reject){
	
	
		var tx_id = client.newTransactionID();
		
		//build invoke request
		var request = {
			chaincodeId : id,
			fcn: fnName,
			args: args,
			txId: tx_id,
		};
		// send proposal to endorser
		console.log('args[0]: '+args[0]+' args[1]: '+args[1])
		channel.sendTransactionProposal(request)
		.then((results)=>{
			
			var proposalResponses = results[0];
			
			var proposal = results[1];
			
			var all_good = true;
			console.log("all_good: ",all_good)
			if (all_good) {
				
				all_good = channel.compareProposalResponseResults(proposalResponses);
			}
			if (all_good) {
			//	console.log(eh)
				
					/*let txPromise =  new Promise((res, rej) => {
						
						let handle = setTimeout(() => {
							eh.disconnect();
							reject();
						}, 30000);
					
						eh.registerTxEvent(tx_id, (tx, code) => {
							console.log("registering for tx event")
							clearTimeout(handle);
							eh.unregisterTxEvent(tx_id);
							eh.disconnect();
							if (code !== 'VALID') {
							
								console.log('The chaincode invoke transaction was invalid.');
								res();
								
							} else {
								console.log('The chaincode invoke transaction was valid.');
								rej();
								
							}
						});
						
					});*/
					//console.log("connected: ",eh.isconnected())
				
				var request = {
					proposalResponses: proposalResponses,
					proposal: proposal
				};
				console.log("sending transaction to orderer")
				var sendPromise = channel.sendTransaction(request);
				return sendPromise
				//var localPromises = [];
				//localPromises.push(sendPromise)
				//localPromises.push(txPromise)
				/*return Promise.all(localPromises).then((results) => {
					
					console.log('Got confirmation of the transaction');
					return results[0];
				
				}).catch((err) => {
					
					console.log('Transaction failed ', err)
					return 'Failed to send instantiate transaction and get notifications within the timeout period.';
					
				});*/
			
			}
			
		},(err)=>{
		
			console.log('Failed to send transaction for proposal: ',err);
			reject(err)
		
		}).then((response) => {

				console.log('response: ',response)
				if (response.status === 'SUCCESS') {
						console.log('Successfully sent transaction to the orderer.');
		
				} else {
					console.log('Failed to order the transaction. Error code: ');

				}
				resolve()
		}, (err) => {

			console.log('Failed to send transaction due to error: ',err);
			reject()
		
		});

	})
};

function getAdmin(client, userOrg,mspID){
        
            var keyPath = '../../network/fabric/simplenetwork/crypto-config/peerOrganizations/'+userOrg+'.example.com/users/Admin@'+userOrg+'.example.com/msp/keystore';
            var keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
            var certPath = '../../network/fabric/simplenetwork/crypto-config/peerOrganizations/'+userOrg+'.example.com/users/Admin@'+userOrg+'.example.com/msp/signcerts';
            var certPEM = readAllFiles(certPath)[0];
            return Promise.resolve(client.createUser({
                username: 'peer'+userOrg+'Admin',
                mspid: mspID,
                cryptoContent: {
                    privateKeyPEM: keyPEM.toString(),
                    signedCertPEM: certPEM.toString()
                }
            }));
}

function readAllFiles(dir) {
            var files = fs.readdirSync(dir);
            var certs = [];
            files.forEach((file_name) => {
                let file_path = path.join(dir,file_name);
                let data = fs.readFileSync(file_path);
                certs.push(data);
            });
            return certs;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rateControl(timePerTx, start, txSeq) {
    if(timePerTx === 0) {
        return Promise.resolve();
    }
    var diff = Math.floor(timePerTx * txSeq - (process.uptime() - start)*1000);
    if( diff > 10) {
        return sleep(diff);
    }
    else {
        return Promise.resolve();
    }
}

