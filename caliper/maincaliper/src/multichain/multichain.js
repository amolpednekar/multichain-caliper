'use strict'

var fs = require('fs');
var e2eUtils = require('./e2eUtils');
var BlockchainInterface = require('../comm/blockchain-interface.js');


class Multichain extends BlockchainInterface {
    constructor(config_path) {
        super(config_path);
    }

    init() {
        // Create stream (Autosubscribed)
        return e2eUtils.init(this.configPath);
    }

    installSmartContract() {
        return e2eUtils.installSmartContract();
    }
    getContext(name) {
        // get the corresponding multichain object
        return e2eUtils.getContext(this.configPath);
    }

    releaseContext(multichainObj) {
        return e2eUtils.releaseContext(multichainObj);
    }

    invokeSmartContract(context, contractID, contractVer, args, timeout) {
        return e2eUtils.publishToStream(context, contractID, args, timeout);
    }

    queryState(context, contractID, contractVer, args, timeout){
        return e2eUtils.queryStream(context, contractID, args, timeout);
    }

    getResultConfirmation(bcContext,result) {
		if(result.length <= 0){
			return Promise.reject(new Error("no transaction found in result array"));
		}
		return e2eUtils.getResultConfirmation(bcContext,result);
    }
    
    getDefaultTxStats(stats, results) {}
}

module.exports =  Multichain 