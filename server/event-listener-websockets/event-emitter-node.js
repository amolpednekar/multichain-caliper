var client = require("socket.io-client");
var socket = client.connect("http://10.80.39.8:3333");
console.log("Listener Triggered!");

args = process.argv.slice(2);

if (args[1] == 1) {    // Emit only when txn is confirmed
    socket.emit('event1', { server: args });
}