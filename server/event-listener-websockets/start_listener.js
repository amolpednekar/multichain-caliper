var app = require('express')();
var http = require('http').Server(app);

http.listen(3333, function () {
    console.log('listening on *:3333');
});

module.exports = { http }