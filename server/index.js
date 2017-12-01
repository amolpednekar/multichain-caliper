participants = [{
}]


var multichain = require("multichain-node")({
		port: "2999",
		host: "10.80.39.8",
		user: "slave2",
		pass: "slavepw2"
	});
	
	multichain.getInfo((err, info) => {
    if(err){
      throw err;
    }
    console.log(info);
  });