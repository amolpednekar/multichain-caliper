/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict'

module.exports.info  = "querying accounts";


var bc, contx;
var accounts;
var inputSize;
module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('money')) {
        return Promise.reject(new Error("simple.quicksort - 'array length' is missed in the arguments"));
    }

    inputSize = args['money'].toString();
    bc       = blockchain;
    contx    = context;
    accounts = args.accounts;
    return Promise.resolve();
}

module.exports.run = function() {
    //var acc  = accounts[Math.floor(Math.random()*(accounts.length))];
    return bc.queryState(contx, 'sort', 'v0',inputSize ,"sort");
}

module.exports.end = function(results) {
    // do nothing
    return Promise.resolve();
}
