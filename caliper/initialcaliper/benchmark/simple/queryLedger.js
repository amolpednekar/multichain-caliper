'use strict';

var Client   = require('fabric-client')
var fs   = require('fs')
var path = require('path');

var targets=[]
var peers=[]
var promises=[]
var excel_data_array=[]

var fields = ['Block_no', 'Total_transactions', 'Successfull_transactions','Failed_transactions'];
Client.addConfigFile("fabric.json");
var ORGS = Client.getConfigSetting('fabric').network;
var channelName = Client.getConfigSetting('fabric').channel[0].name;

var client  = new Client();
var channel = client.newChannel(channelName);

channel.addOrderer(
    client.newOrderer(
        ORGS.orderer.url
    )
);
console.log("connecting to ", ORGS.org2.peer2["server-hostname"])
let peer_obj = client.newPeer(
    ORGS.org2.peer2.requests,
    {"grpc.max_receive_message_length":-1}
);


channel.addPeer(peer_obj);

Client.newDefaultKeyValueStore({path:"../../hfc/hfc-test-kvs_peerOrg2"}).then((store) => {

    client.setStateStore(store);
    return getAdmin(client,"org2", ORGS.org2.mspid);
    
}).then((admin) => {
	console.log("successfully enrolled admin!!")
	client._userContext =admin
    getBlockHeight().then((height)=>{
        console.log(height) 
        //var counter
        getBlockInfo(counter,height-1)
    })
  
})

function getBlockInfo(counter,total){

        var object={}
        var successfull=0
        var failed=0

        if(counter==undefined)
            counter=0;
        if(counter>total)
            {
                //write data into excel
                try {
                    var result = json2csv({ data: excel_data_array, fields: fields });
                    
                    fs.writeFile('queryLedgerData.csv', result, function(err) {
                        if (err){

                          console.log(err)
                        }
                        console.log("file written")
                        process.exit();

                    })

                   } catch (err) {
                    // Errors are thrown for bad options, or if the data is empty and no fields are provided.
                    // Be sure to provide fields if it is possible that your data array will be empty.
                    console.error(err);
                    return
                   }
            }

          channel.queryBlock(counter,targets[0],true)
          .then((res)=>{
    
            object.Block_no =res.header.number.low
            object.Total_transactions =res.metadata.metadata[2].length
            res.metadata.metadata[2].forEach(function(result){
                
                                if(result==0){
                
                                    successfull++
                                
                                }else{
                        
                                    failed++
                                }
                })
                
                object.Successfull_transactions = successfull
                object.Failed_transactions = failed
                excel_data_array.push(object)
                            counter++;
                            getBlockInfo(counter,total)
                            
          })
          .catch(function(err){
            
            process.exit();
            
          })
            
}

function getBlockHeight(){

    return channel.queryInfo(targets[0],true)
}

   
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