var multichain = require("multichain-node")({
		port: "5999",
		host: "10.80.39.8",
		user: "multichainrpc",
		pass: "7PMFo1HHWJAz9VE2BeNzwuX5YWBAD61vDJURShJuX6FL"
	});
	
	multichain.getPeerInfo((err, info) => {
    if(err){
      throw err;
    }
    console.log(info);
  });