'use strict';

var kafka = require('kafka-node');
var HighLevelProducer = kafka.HighLevelProducer;
var KeyedMessage = kafka.KeyedMessage;
let kafka_config = require("./kafka-config.json")

let zk_url = kafka_config.zk_url
var client_kafka = new  kafka.Client(zk_url, kafka_config.topic, {
  sessionTimeout: 3000000,
  spinDelay: 100,
  retries: 2
});

client_kafka.on('error', function(error) {
    console.error("ERROR",error);
  });
  
var producer = new HighLevelProducer(client_kafka,{requireAcks: -1})

var counter = 0
var Client   = require('fabric-client')
var fs   = require('fs')
var path = require('path');
var Promise = require('promise');
var targets=[]
var peers=[]
var channelName = "mychannel";

var client  = new Client();
var channel = client.newChannel(channelName);

channel.addOrderer(
    client.newOrderer(
        "grpc://10.244.5.43:7050"
    )
);

let peer_obj = client.newPeer(
    "grpc://10.244.5.41:7051",
    {"grpc.max_receive_message_length":-1}
);


channel.addPeer(peer_obj);

//process.on('message',function(){
    
console.log("Client started")

 producer.on('ready', function() {

   producer.createTopics([kafka_config.topic], false, function (err, data) {
    if (err){

            console.log("Error creating Topic",err)
         }       
     })
  })


Client.newDefaultKeyValueStore({path:"../hfc/hfc-test-kvs_peerOrg2"}).then((store) => {

    client.setStateStore(store);
    return getAdmin(client,"org1", "Org1MSP");
    
}).then((admin) => {
	console.log("successfully enrolled admin!!")
	client._userContext =admin
   
		let eh = client.newEventHub();
		//console.log("\nConenct count1: ",eh._connected)
		eh.setPeerAddr(
            "grpc://10.244.5.41:7053",
			{
				'request-timeout': 12000000
			}
		);
        eh.connect();
		eh.registerBlockEvent((block) => {

            var event_data = {}
            event_data.validTime = new Date().getTime()/1000
            event_data.block = block
            console.log("******Received Block No at **** :",block.header.number, event_data.validTime)
           // TODO:convert to bytes and then store
            var payload = [{
                topic: kafka_config.topic,
                messages: JSON.stringify(event_data),
                partition: 0,
                attributes: 1 /* Use GZip compression for the payload */
              }];

            producer.send(payload, function(error, result) {
              //  console.info('Sent payload to Kafka: ', JSON.parse(payload.messages).block.header.number);
                if (error) {
                  console.error(error);
                } else {
                  var formattedResult = result[0]
                  console.log('result: ', result)
                }
                });           
				
			},
			(err) => {
				console.log("Error :",err)
			}
		);
  
})

producer.on('error', function(error) {
    console.error(error);
  });

//})
    
  
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