participants = [{
	port: "999",
	host: "10.80.39.8",
	user: "username",
	pass: "password"
}, {
	port: "1999",
	host: "10.51.238.81",
	user: "username",
	pass: "password"
}, {
	port: "2999",
	host: "10.80.39.8",
	user: "slave2",
	pass: "slavepw2"
}]

var multichain = require("multichain-node")(participants[0]);

//getChainInfo(multichain);
//createStream(multichain, "teststream1", true)
publishItemToStream(multichain,"teststream1","amol","AB");
//readItemFromStream(multichain, "teststream1", "amol");
multichain.listAddresses((err, info) => {
	if (err) {
		throw err;
	}
	console.log(info);
})
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
	multichain.listStreamKeyItems({ stream: streamName, key: key }, (err, success) => {
		if (err) {
			console.log("Error: ", err);
			throw err;
		}
		console.log("Success: ", success);
	})
}