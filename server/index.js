var multichain = require("multichain-node")({
		port: "4999",
		host: "10.80.39.8",
		user: "rpcuser",
		pass: "rpcpassword"
	});
	
	multichain.getPeerInfo((err, info) => {
    if(err){
      throw err;
    }
    console.log(info);
  });