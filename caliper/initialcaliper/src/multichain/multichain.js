'use strict'

var multichain = require("multichain-node");
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
    getContext(nodeName) {
        // get the corresponding multichain object
        return e2eUtils.getContext(config_path, nodeName);
    }

    releaseContext(multichainObj) {
        return e2eUtils.releaseContext(multichainObj);
    }

    publishToStream(nodeName) {
        let multichainObj = getContext(nodeName);
        return e2eUtils.publishToStream(multichainObj);
    }
}

module.exports =  Multichain 