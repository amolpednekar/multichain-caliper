/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict'

module.exports.info  = "opening accounts";

var accounts = [];
var initMoney;
var bc, contx;
var index = 0;
var valueHex, key;
// publish to stream
module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('money')) {
        return Promise.reject(new Error("simple.open - 'money' is missed in the arguments"));
    }

    valueHex = (new Buffer(args['money'].toString(), "utf8")).toString('hex');
    bc = blockchain;
    contx = context;
    return Promise.resolve();
}

module.exports.run = function() {
    key = "key"+index;
    index = index + 1;
    return bc.invokeSmartContract(contx, 'mystream', 'v0', [{key:key, data:valueHex}], 120);
}

module.exports.end = function(results) {
    return Promise.resolve(accounts);
}
