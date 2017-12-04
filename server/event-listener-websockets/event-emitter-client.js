var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

http.listen(3333, function () {
    console.log('listening on *:3333');
});

io.on('connection', function (socket) {
    console.log("Connected");
    socket.on('event1', function (data) {
        console.log(data);
    });
});