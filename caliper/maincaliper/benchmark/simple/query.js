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
var fs = require('fs');
var os = require('os');
var popacc=[];
var round = 0;
var index=0;
var jsonfile = require('jsonfile')
module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('accounts') || args['accounts'].length === 0) {
        return Promise.reject(new Error("simple.query - 'accounts' is missed in the arguments"));
    }
    bc       = blockchain;
    contx    = context;
    accounts = args.accounts;
    return Promise.resolve();
}

module.exports.run = function() {
	
    var acc  = accounts[index];
	index++;
	popacc.push(acc)
	//console.log("acc: ",acc)
    return bc.queryState(contx, 'simple', 'v0', acc,"query");
}

module.exports.end = function(results) {
    // do nothing
	var arrlength = 1;
	try {
		  var jsonObj = jsonfile.readFileSync(os.hostname()+'_accounts_generated.json','utf8')
		  console.log("jsonObj: ",jsonObj)
		  for(var k in jsonObj){
			arrlength++;
		  }
		  jsonObj['round'+arrlength] = popacc;
		  jsonfile.writeFileSync(os.hostname()+'_accounts_generated.json', jsonObj);
		  
	} catch (err) {
		 var jsonObj = {};
		 jsonObj['round1'] = popacc;
		 console.log("jsonObj: ",jsonObj)
		 jsonfile.writeFileSync(os.hostname()+'_accounts_generated.json', jsonObj);
	}
    return Promise.resolve();
}
