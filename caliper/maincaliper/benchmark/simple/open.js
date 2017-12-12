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

module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('money')) {
        return Promise.reject(new Error("simple.open - 'money' is missed in the arguments"));
    }

    initMoney = args['money'].toString();
    bc = blockchain;
    contx = context;
    return Promise.resolve();
}

module.exports.run = function() {
    var newAcc = 'accountno_' + index;
	index++;
    accounts.push(newAcc);
    return bc.invokeSmartContract(contx, 'simple', 'v0', [{verb: 'open'}, {account: newAcc}, {money: initMoney}], 120);
}

module.exports.end = function(results) {
    return Promise.resolve(accounts);
}
