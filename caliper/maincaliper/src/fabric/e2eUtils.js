/**
 * Modifications Copyright 2017 HUAWEI
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


'use strict';

var utils = require('fabric-client/lib/utils.js');
var logger = utils.getLogger('E2E testing');
const os = require('os');
var tape = require('tape');
var _test = require('tape-promise');
var test = _test(tape);
var index = 0;
var path = require('path');
var fs = require('fs');
var util = require('util');
var process = require('process');
var Client = require('fabric-client');
var testUtil = require('./util.js');
var kafka_config = require("../../benchmark/simple/kafka-config.json")

var ORGS;
var rootPath = '../..'

var grpc = require('grpc');

var tx_id = null;
var the_user = null;
var recievedBlocks = [];
var targets = [];

function init(config_path) {
	Client.addConfigFile(config_path);
	ORGS = Client.getConfigSetting('fabric').network;
}
module.exports.init = init;

/*********************
* @org, key of the organization
* @chaincode, {id: ..., path: ..., version: ...}
* @t, tape object
*********************/
function installChaincode(org, chaincode, t) {
	Client.setConfigSetting('request-timeout', 60000);
	var channel_name = chaincode.channel;

	var client = new Client();
	var channel = client.newChannel(channel_name);

	var orgName = ORGS[org].name;
	var cryptoSuite = Client.newCryptoSuite();
	cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({ path: testUtil.storePathForOrg(orgName) }));
	client.setCryptoSuite(cryptoSuite);

	var caRootsPath = ORGS.orderer.tls_cacerts;
	let data = fs.readFileSync(path.join(__dirname, rootPath, caRootsPath));
	let caroots = Buffer.from(data).toString();

	channel.addOrderer(
		client.newOrderer(
			ORGS.orderer.url,
			{
				'pem': caroots,
				'ssl-target-name-override': ORGS.orderer['server-hostname']
			}
		)
	);

	var targets = [];
	for (let key in ORGS[org]) {
		if (ORGS[org].hasOwnProperty(key)) {
			if (key.indexOf('peer') === 0) {
				let data = fs.readFileSync(path.join(__dirname, rootPath, ORGS[org][key]['tls_cacerts']));
				let peer = client.newPeer(
					ORGS[org][key].requests,
					{
						pem: Buffer.from(data).toString(),
						'ssl-target-name-override': ORGS[org][key]['server-hostname']
					}
				);

				targets.push(peer);
				channel.addPeer(peer);
			}
		}
	}

	return Client.newDefaultKeyValueStore({
		path: testUtil.storePathForOrg(orgName)
	}).then((store) => {
		client.setStateStore(store);

		// get the peer org's admin required to send install chaincode requests
		return testUtil.getSubmitter(client, t, true /* get peer org admin */, org);
	}).then((admin) => {
		the_user = admin;

		// send proposal to endorser
		var request = {
			targets: targets,
			chaincodePath: chaincode.path,
			chaincodeId: chaincode.id,
			chaincodeVersion: chaincode.version
		};
		return client.installChaincode(request);
	},
		(err) => {
			throw new Error('Failed to enroll user \'admin\'. ' + err);
		}).then((results) => {
			var proposalResponses = results[0];

			var all_good = true;
			var errors = [];
			for (let i in proposalResponses) {
				let one_good = false;
				if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
					one_good = true;
				} else {
					logger.error('install proposal was bad');
					errors.push(proposalResponses[i]);
				}
				all_good = all_good & one_good;
			}
			if (!all_good) {
				throw new Error(util.format('Failed to send install Proposal or receive valid response: %s', errors));
			}
		},
		(err) => {
			throw new Error('Failed to send install proposal due to error: ' + (err.stack ? err.stack : err));
		})
		.catch((err) => {
			t.fail('failed to install chaincode, ' + (err.stack ? err.stack : err));
			return Promise.reject(err);
		});
}
module.exports.installChaincode = installChaincode;


function instantiateChaincode(chaincode, endorsement_policy, upgrade, t) {
	Client.setConfigSetting('request-timeout', 120000);

	var channel = testUtil.getChannel(chaincode.channel);
	if (channel === null) {
		return Promise.reject(new Error('could not find channel in config'));
	}
	var channel_name = channel.name;
	var userOrg = channel.organizations[0];

	var targets = [],
		eventhubs = [];
	var type = 'instantiate';
	if (upgrade) type = 'upgrade';
	// override t.end function so it'll always disconnect the event hub
	t.end = ((context, ehs, f) => {
		return function () {
			for (var key in ehs) {
				var eventhub = ehs[key];
				if (eventhub && eventhub.isconnected()) {
					logger.debug('Disconnecting the event hub');
					eventhub.disconnect();
				}
			}
			f.apply(context, arguments);
		};
	})(t, eventhubs, t.end);

	var client = new Client();
	var channel = client.newChannel(channel_name);

	var orgName = ORGS[userOrg].name;
	var cryptoSuite = Client.newCryptoSuite();
	cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({ path: testUtil.storePathForOrg(orgName) }));
	client.setCryptoSuite(cryptoSuite);

	var caRootsPath = ORGS.orderer.tls_cacerts;
	let data = fs.readFileSync(path.join(__dirname, rootPath, caRootsPath));
	let caroots = Buffer.from(data).toString();

	channel.addOrderer(
		client.newOrderer(
			ORGS.orderer.url,
			{
				'pem': caroots,
				'ssl-target-name-override': ORGS.orderer['server-hostname']
			}
		)
	);

	var targets = [];
	var transientMap = { 'test': 'transientValue' };

	return Client.newDefaultKeyValueStore({
		path: testUtil.storePathForOrg(orgName)
	}).then((store) => {

		client.setStateStore(store);
		return testUtil.getSubmitter(client, t, true /* use peer org admin*/, userOrg);

	}).then((admin) => {
		the_user = admin;

		for (let org in ORGS) {
			if (org.indexOf('org') === 0) {
				for (let key in ORGS[org]) {
					if (key.indexOf('peer') === 0) {
						let data = fs.readFileSync(path.join(__dirname, rootPath, ORGS[org][key]['tls_cacerts']));
						let peer = client.newPeer(
							ORGS[org][key].requests,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': ORGS[org][key]['server-hostname']
							}
						);
						targets.push(peer);
						channel.addPeer(peer);
					}
				}
			}
		}

		// an event listener can only register with a peer in its own org
		logger.debug(' create new eventhub %s', ORGS[userOrg]['peer1'].events);
		let data = fs.readFileSync(path.join(__dirname, rootPath, ORGS[userOrg]['peer1']['tls_cacerts']));
		let eh = client.newEventHub();
		eh.setPeerAddr(
			ORGS[userOrg]['peer1'].events,
			{
				pem: Buffer.from(data).toString(),
				'ssl-target-name-override': ORGS[userOrg]['peer1']['server-hostname']
			}
		);
		eh.connect();
		eventhubs.push(eh);

		// read the config block from the orderer for the channel
		// and initialize the verify MSPs based on the participating
		// organizations
		return channel.initialize();
	}, (err) => {
		throw new Error('Failed to enroll user \'admin\'. ' + err);

	}).then(() => {

		// the v1 chaincode has Init() method that expects a transient map
		if (upgrade) {
			let request = buildChaincodeProposal(client, the_user, chaincode, upgrade, transientMap, endorsement_policy);
			tx_id = request.txId;

			return channel.sendUpgradeProposal(request);
		} else {
			let request = buildChaincodeProposal(client, the_user, chaincode, upgrade, transientMap, endorsement_policy);
			tx_id = request.txId;

			return channel.sendInstantiateProposal(request);
		}

	}, (err) => {
		throw new Error('Failed to initialize the channel' + (err.stack ? err.stack : err));
	}).then((results) => {

		var proposalResponses = results[0];

		var proposal = results[1];
		var all_good = true;
		for (let i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
				// special check only to test transient map support during chaincode upgrade
				one_good = true;
			} else {
				logger.error(type + ' proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal,
			};

			// set the transaction listener and set a timeout of 5 mins
			// if the transaction did not get committed within the timeout period,
			// fail the test
			var deployId = tx_id.getTransactionID();

			var eventPromises = [];
			eventhubs.forEach((eh) => {
				let txPromise = new Promise((resolve, reject) => {
					let handle = setTimeout(reject, 300000);

					eh.registerTxEvent(deployId.toString(), (tx, code) => {
						clearTimeout(handle);
						eh.unregisterTxEvent(deployId);

						if (code !== 'VALID') {
							t.fail('The chaincode ' + type + ' transaction was invalid, code = ' + code);
							reject();
						} else {
							t.pass('The chaincode ' + type + ' transaction was valid.');
							resolve();
						}
					});
				});
				eventPromises.push(txPromise);
			});

			var sendPromise = channel.sendTransaction(request);
			return Promise.all([sendPromise].concat(eventPromises))
				.then((results) => {
					return results[0]; // just first results are from orderer, the rest are from the peer events

				}).catch((err) => {
					throw new Error('Failed to send ' + type + ' transaction and get notifications within the timeout period.');
				});

		} else {
			throw new Error('Failed to send ' + type + ' Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	}, (err) => {
		throw new Error('Failed to send ' + type + ' proposal due to error: ' + (err.stack ? err.stack : err));

	}).then((response) => {
		//TODO should look into the event responses
		if (!(response instanceof Error) && response.status === 'SUCCESS') {
			return Promise.resolve();
		} else {
			throw new Error('Failed to order the ' + type + 'transaction. Error code: ' + response.status);
		}
	}, (err) => {
		throw new Error('Failed to send instantiate due to error: ' + (err.stack ? err.stack : err));
	})
		.catch((err) => {
			t.fail('failed to instantiate chaincode, ' + (err.stack ? err.stack : err));
			return Promise.reject(err);
		});
};

function buildChaincodeProposal(client, the_user, chaincode, upgrade, transientMap, endorsement_policy) {
	var tx_id = client.newTransactionID();

	console.log("\nArguments: ", chaincode.args)
	// send proposal to endorser
	var request = {
		chaincodePath: chaincode.path,
		chaincodeId: chaincode.id,
		chaincodeVersion: chaincode.version,
		fcn: 'init',
		args: chaincode.args,       // TODO: should defined in config file
		txId: tx_id,
		'endorsement-policy': endorsement_policy
	};


	if (upgrade) {
		// use this call to test the transient map support during chaincode instantiation
		request.transientMap = transientMap;
	}

	return request;
}

module.exports.instantiateChaincode = instantiateChaincode;

function getOrgPeers(orgName) {
	var peers = [];
	var org = ORGS[orgName];
	for (let key in org) {
		if (org.hasOwnProperty(key)) {
			if (key.indexOf('peer') === 0) {
				peers.push(org[key]);
			}
		}
	}

	return peers;
}

/**
* instantiate fabric-client object and register block events to interact with the channel
* @channelConfig {Object}, see the 'channel' definition in fabric's configuration file
* @return {Promise}, Promise.resolve({org{String}, client{Object}, channel{Object}, submitter{Object}, eventhubs{Array}});
*/
function getcontext(channelConfig) {

	var index = 0;
	recievedBlocks = [];
	Client.setConfigSetting('request-timeout', 12000000);
	var channel_name = channelConfig.name;
	// var userOrg = channelConfig.organizations[1];
	// choose a random org to use, for load balancing
	var idx = Math.floor(Math.random() * channelConfig.organizations.length);
	var userOrg = channelConfig.organizations[1];
	//console.log("userOrg: ",userOrg)

	var client = new Client();
	var channel = client.newChannel(channel_name);
	var orgName = ORGS[userOrg].name;
	var cryptoSuite = Client.newCryptoSuite();
	var eventhubs = [];
	cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({ path: testUtil.storePathForOrg(orgName) }));
	client.setCryptoSuite(cryptoSuite);

	var caRootsPath = ORGS.orderer.tls_cacerts;
	let data = fs.readFileSync(path.join(__dirname, rootPath, caRootsPath));
	let caroots = Buffer.from(data).toString();

	channel.addOrderer(
		client.newOrderer(
			ORGS.orderer.url,
			{
				'pem': caroots,
				'ssl-target-name-override': ORGS.orderer['server-hostname'],
				"grpc.max_receive_message_length": -1
			}
		)
	);

	var orgName = ORGS[userOrg].name;
	return Client.newDefaultKeyValueStore({ path: testUtil.storePathForOrg(orgName) })
		.then((store) => {
			if (store) {
				client.setStateStore(store);
			}
			return testUtil.getSubmitter(client, null, true, userOrg);
		}).then((admin) => {
			the_user = admin;

			// set up the channel to use each org's random peer for
			// both requests and events
			var peerUrls = [];
			for (let i in channelConfig.organizations) {

				let org = channelConfig.organizations[i];
				let peers = getOrgPeers(org);
				if (peers.length === 0) {
					throw new Error('could not find peer of ' + org);
				}
				//let peerInfo = peers[Math.floor(Math.random() * peers.length)];
				let peerInfo = peers[0];
				let data = fs.readFileSync(path.join(__dirname, rootPath, peerInfo['tls_cacerts']));
				let peer = client.newPeer(
					peerInfo.requests,
					{
						pem: Buffer.from(data).toString(),
						'ssl-target-name-override': peerInfo['server-hostname'],
						"grpc.max_receive_message_length": -1
					}
				);
				targets.push(peer);
				peerUrls.push(peerInfo.requests)
				channel.addPeer(peer);
				/* if(org===userOrg){
					console.log("peer: ",peer)
					channel.addPeer(peer);
				}*/

				// an event listener can only register with the peer in its own org
				if (org === userOrg) {
					let eh = client.newEventHub();
					eh.setPeerAddr(
						peerInfo.events,
						{
							pem: Buffer.from(data).toString(),
							'ssl-target-name-override': peerInfo['server-hostname'],
							'request-timeout': 120000,
							'grpc.max_receive_message_length': -1
						}
					);
					eventhubs.push(eh);
				}
			}
			console.log("PeerUrls: ", peerUrls);
			fs.appendFile(os.hostname() + '_peers.txt', peerUrls + "\n", (err) => {

				if (err) throw err;
				index++;
				console.log('Peer Urls saved!');
			});

			// register event listener
			/*eventhubs.forEach((eh) => {
				eh.connect();
			});
			eventhubs[0].registerBlockEvent((block) => {
			
					console.log("******Received Block No at e2e **** :",block.header.number,new Date().getTime()/1000)
					
				},(err) => {
					
				}
			);*/

			return channel.initialize();
		})
		.then((nothing) => {
			return Promise.resolve({
				org: userOrg,
				client: client,
				channel: channel,
				submitter: the_user,
				eventhubs: eventhubs
			});
		})
		.catch((err) => {
			return Promise.reject(err);
		});
}
module.exports.getcontext = getcontext;




function getResultConfirmation(resultsArray, no_Of_Tx) {

	return new Promise(function (resolve, reject) {

		var offset_count = 0
		try {

			offset_count = fs.readFileSync("offset.txt")

		} catch (err) {
			offset_count = 0
		}



		var map = []
		//element is an array of objects with TXID for one round
		resultsArray.forEach(function (internal_element) {

			map[internal_element.id] = internal_element
			//no_Of_Tx++

		})
		console.log()
		var globalArray = []
		globalArray.push(map)

		//	console.log("s: ",s)
		var kafka = require('kafka-node');
		var Consumer = kafka.Consumer;
		var client1 = new kafka.KafkaClient({ kafkaHost: kafka_config.broker_urls, requestTimeout: 300000000 });

		var options = {
			autoCommit: true,
			fetchMaxWaitMs: 1000,
			fetchMaxBytes: 4096 * 4096,
			encoding: 'buffer',
			fromOffset: true
			//requestTimeout:300000
			// groupId: groupID
		};

		var topics = [{
			topic: kafka_config.topic,
			offset: offset_count
		}];

		var consumer = new Consumer(client1, topics, options);
		var finalresult = [];
		var isTxfound;
		var pendingCounter = 0

		consumer.on('message', function (message) {

			var buf = new Buffer(message.value); // Read string into a buffer.
			var data = buf.toString('utf-8');

			offset_count = message.offset
			fs.writeFileSync("offset.txt", offset_count)

			//console.log("Block Number ",JSON.parse(data).block.header.number)
			//c//onsole.log("pending counter ",pendingCounter)

			var block = JSON.parse(data).block

			var eventTxId = block;
			console.log("eventTxId", eventTxId);

			// find in the globalArray if the Id exists or not. It will be present but in any one of the array in global Array
			if (globalArray[0][eventTxId] != undefined || globalArray[0][eventTxId] != null) {

				// present at index 0
				var object = globalArray[0][eventTxId]
				object.time_valid = JSON.parse(data).validTime;
				object.status = "success";
				globalArray[0][eventTxId] = object
				pendingCounter++
				finalresult.push(object)
			} else {

				// not present // ** no need to handle actually**

			}
			if (pendingCounter == no_Of_Tx) {
				//console.log("All resolved")
				resolve(finalresult)
			}



		});


		consumer.on('error', function (error) {

			//console.log("Error on consumer side",error)

		})
	})
}

module.exports.getResultConfirmation = getResultConfirmation;

function releasecontext(context) {
	if (context.hasOwnProperty('eventhubs')) {
		for (let key in context.eventhubs) {
			var eventhub = context.eventhubs[key];
			if (eventhub && eventhub.isconnected()) {
				eventhub.disconnect();
			}
		}
		context.eventhubs = [];
	}
	return Promise.resolve();
}
module.exports.releasecontext = releasecontext;

function invokebycontext(context, id, version, args, timeout) {


	var userOrg = context.org;
	var client = context.client;
	var channel = context.channel;
	var eventhubs = context.eventhubs;
	var time0 = new Date().getTime() / 1000;
	var tx_id = client.newTransactionID(context.submitter);
	var invoke_status = {
		id: tx_id.getTransactionID(),
		status: 'created',
		time_create: new Date().getTime() / 1000,
		time_valid: 0,
		time_endorse: 0,
		time_order: 0,
		result: null
	};
	var pass_results = null;

	// TODO: should resolve endorsement policy to decides the target of endorsers
	// now random peers ( one peer per organization ) are used as endorsers as default, see the implementation of getContext
	// send proposal to endorser
	var f = args[0];
	args.shift();
	//console.log(args[0])
	//console.log(args[1].length)
	var request = {
		chaincodeId: id,
		fcn: f,
		args: args,
		txId: tx_id,
	};

	return channel.sendTransactionProposal(request)
		.then((results) => {
			pass_results = results;
			invoke_status.time_endorse = new Date().getTime() / 1000
			var proposalResponses = pass_results[0];

			var proposal = pass_results[1];
			var all_good = true;

			for (let i in proposalResponses) {
				let one_good = false;
				let proposal_response = proposalResponses[i];
				if (proposal_response.response && proposal_response.response.status === 200) {
					// TODO: the CPU cost of verifying response is too high.
					// Now we ignore this step to improve concurrent capacity for the client
					// so a client can initialize multiple concurrent transactions
					// Is it a reasonable way?
					// one_good = channel.verifyProposalResponse(proposal_response);
					one_good = true;
				}
				all_good = all_good & one_good;
			}
			if (all_good) {
				// check all the read/write sets to see if the same, verify that each peer
				// got the same results on the proposal
				all_good = channel.compareProposalResponseResults(proposalResponses);
			}
			if (all_good) {
				invoke_status.result = proposalResponses[0].response.payload;

				var request = {
					proposalResponses: proposalResponses,
					proposal: proposal,
				};

				var deployId = tx_id.getTransactionID();
				/*fs.appendFile(os.hostname()+'_deployids.txt', deployId.toString()+"\n", (err) => {  
	
					console.log('Peer Urls saved!');
				});*/
				/*var eventPromises = [];
				var newTimeout = (timeout - (process.uptime() - time0)) * 1000;
				if(newTimeout < 1000) {
					console.log("WARNING: timeout is too small, default value is used instead");
					newTimeout = 1000;
				}
			
				eventhubs.forEach((eh) => {
					//console.log("EventhubConnected: ",eh.isconnected())
					let txPromise = new Promise((resolve, reject) => {
						
						let handle = setTimeout(reject, newTimeout);
	
						eh.registerTxEvent(deployId.toString(),
							(tx, code) => {
								clearTimeout(handle);
								eh.unregisterTxEvent(deployId);
	
								if (code !== 'VALID') {
									reject();
								} else {
									resolve();
								}
							},
							(err) => {
								//console.log("Failed to get transaction: ",deployId.toString())
								console.log("Error for event hub: ",err)
								clearTimeout(handle);
								resolve();
							}
						);
					});
	
					eventPromises.push(txPromise);
				});*/

				var orderer_response;
				return channel.sendTransaction(request)
					.then((response) => {
						orderer_response = response;
						invoke_status.time_order = new Date().getTime() / 1000;
						return Promise.resolve(orderer_response);
						//return Promise.all(eventPromises);
					}/*)
			.then((results) => {
			
			    return Promise.resolve(orderer_response);
				
			}*/, () => {

						throw new Error('Failed to get valid proposal from orderer');
						//throw new Error('Failed to get valid event notification');
					});
			} else {
				throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			}
		}).then((response) => {

			return Promise.resolve(invoke_status)
			/*if (response.status === 'SUCCESS') {
				invoke_status.status = 'success';
				invoke_status.time_valid = process.uptime();
				return Promise.resolve(invoke_status);
			} else {
				throw new Error('Failed to order the transaction. Error code: ' + response.status);
			}*/
		})
		.catch((err) => {

			// return resolved, so we can use promise.all to handle multiple invoking
			// invoke_status is used to judge the invoking result
			// console.log('Invoke chaincode failed, ' + (err.stack?err.stack:err));
			/*invoke_status.time_valid = process.uptime();
			invoke_status.status     = 'failed';*/
			return Promise.resolve(invoke_status);
		});
};
module.exports.invokebycontext = invokebycontext;

function querybycontext(context, id, version, name, fname) {
	var userOrg = context.org;
	var client = context.client;
	var channel = context.channel;
	var eventhubs = context.eventhubs;
	var tx_id = client.newTransactionID(context.submitter);
	var invoke_status = {
		id: tx_id.getTransactionID(),
		status: 'created',
		time_create: new Date().getTime() / 1000,
		time_valid: 0,
		result: null
	};

	// send query
	var request = {
		chaincodeId: id,
		chaincodeVersion: version,
		txId: tx_id,
		fcn: fname,
		args: [name]
	};
	//console.log("peer tagert is: ")
	return channel.queryByChaincode(request)
		.then((responses) => {
			if (responses.length > 0) {
				var value = responses[0];
				//console.log("Response from peer: ",value.toString('utf8'))
				if (value instanceof Error) {
					throw value;
				}
				for (let i = 1; i < responses.length; i++) {
					if (responses[i].length !== value.length || !responses[i].every(function (v, idx) {
						return v === value[idx];
					})) {
						throw new Error('conflicting query responses');
					}
				}
				invoke_status.time_valid = new Date().getTime() / 1000;
				invoke_status.result = responses[0];
				invoke_status.status = 'success';
				return Promise.resolve(invoke_status);
			}
			else {
				throw new Error('no query responses');
			}
		})
		.catch((err) => {
			console.log('Query failed, ' + (err.stack ? err.stack : err));
			invoke_status.time_valid = new Date().getTime() / 1000;
			invoke_status.status = 'failed';
			return Promise.resolve(invoke_status);
		});
};

module.exports.querybycontext = querybycontext;

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports.sleep = sleep;

function loadMSPConfig(name, mspdir) {
	var msp = {};
	msp.id = name;
	msp.rootCerts = readAllFiles(path.join(__dirname, rootPath, mspdir, 'cacerts'));
	msp.admins = readAllFiles(path.join(__dirname, rootPath, mspdir, 'admincerts'));
	return msp;
}
module.exports.loadMSPConfig = loadMSPConfig;

function readAllFiles(dir) {
	var files = fs.readdirSync(dir);
	var certs = [];
	files.forEach((file_name) => {
		let file_path = path.join(dir, file_name);
		let data = fs.readFileSync(file_path);
		certs.push(data);
	});
	return certs;
}
module.exports.readAllFiles = readAllFiles;
