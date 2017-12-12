var net = require('net');

var client = new net.Socket();

args = process.argv.slice(2);

client.connect(1337, '10.244.51.108', function () {
    console.log('Connected');
    if (args[1] == 1) {
        client.write(args[0]);
    }
    client.destroy();
});

client.on('close', function () {
    console.log('Connection closed');
});

client.on('error', function (ex) {
    console.log("handled error", "tx status", args[1]);
});

// var client = require("socket.io-client");

// const ip = process.env.LISTENER_IP;

// console.log("Script called")

// var socket = client.connect("http://"+"10.244.51.108"+":3333");
// console.log("IP:",ip+":3333")
// console.log("Listener Triggered!");

// socket.on('connect', (data)=>{
//     console.log("Client connect")
// })

// socket.on('connect_error', (data)=>{
//     console.log("Client connect_error")
// })

// socket.on('connect_timeout', (data)=>{
//     console.log("Client connect_timeout")
// })

// socket.on('error', (data)=>{
//     console.log("Client connect_timeout")
// })

// args = process.argv.slice(2);

// if (args[1] == 1) {    // Emit only when txn is confirmed
//     socket.emit('event1', { server: args });

// }

// // socket.close(); 
// // console.log("socket closed");