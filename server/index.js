participants = [{
	port: "999",
	host: "10.80.39.8",
	user: "username",
	pass: "password"
}, {
	port: "1999",
	host: "10.80.39.8",
	user: "username",
	pass: "password"
}, {
	port: "2999",
	host: "10.80.39.8",
	user: "slave2",
	pass: "slavepw2"
}]

var promisesArray = [];

var multichain = require("multichain-node")(participants[0]);
multichain.listStreamKeyItems({ stream: "mystream", key:"key1" }, (err, success) => {
	if (err) {
		console.log("Error: ", err);
		//throw err;
	}
	console.log("Success: ", success);

})
//getChainInfo(multichain);
//createStream(multichain, "teststream1", true)
// for (i = 0; i < 1000; i++) {
// 	publishItemToStream(multichain, "mystream", "amol" + i, "AB");
// }

//readItemFromStream(multichain, "mystream", "amol");


/* multichain.listStreams((err, info) => {
	if (err) {
		throw err;
	}
	console.log(info);
}); */
// 	multichain = require("multichain-node")(participants[0]);
// 	multichain.grant({addresses:info[0].address,permissions:"send"},(err, info2) =>{
// 		if (err) {
// 			throw err;
// 		}
// 		console.log(info2);
// 	})
// })
function getChainInfo(multichain) {
	multichain.getInfo((err, info) => {
		if (err) {
			throw err;
		}
		console.log(info);
	})
}

function createStream(multichain, name, open) {
	multichain.create({ type: "stream", name: name, open: open }, (err, success) => {
		if (err) {
			console.log("Error: ", err)
			throw err;
		}
		console.log("Success: ", success);

	})
}

function publishItemToStream(multichain, streamName, key, data) {
	multichain.publish({ stream: streamName, key: key, data: data }, (err, success) => {
		if (err) {
			console.log("Error: ", err);
			throw err;
		}
		console.log("Success: ", success);
	})
}

function readItemFromStream(multichain, streamName, key) {
	// subscribe not required, autosubscribe=streams set for multichaind
	
		multichain.listStreamItems({ stream: streamName }, (err, success) => {
			if (err) {
				console.log("Error: ", err);
				//throw err;
				return resolve1();
			}
			console.log("Success: ", success);
			return reject1();
		})
}