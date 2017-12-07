var hash = require('fabric-client/lib/hash.js'); 
var crypto = require('crypto'); 
var sha256 = crypto.createHash('sha256'); 
var buf = Buffer.alloc(100000000,'A'); 

console.log('sjcl:'); 
console.log(Date.now()); 
h = hash.sha2_256(buf);
console.log(Date.now()); 
console.log(h) 

console.log('native:'); 
console.log(Date.now()); 
h2 = sha256.update(buf).digest('hex'); 
console.log(Date.now()); 
console.log(h2);