var client = require("socket.io-client");

const ip = process.env.LISTENER_IP;

var socket = client.connect(ip+":3333");

console.log("Listener Triggered!");

args = process.argv.slice(2);

if (args[1] == 1) {    // Emit only when txn is confirmed
    socket.emit('event1', { server: args });
}