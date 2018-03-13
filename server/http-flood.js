var http = require("http");

var options = {
    hostname: '10.51.235.65',
    port: 1445,
    path: '/log',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

for (let i = 0; i < 10000; i++) {
    var req = http.request(options, function (res) {
        console.log('Status: ' + res.statusCode);
        res.setEncoding('utf8');
        res.on('data', function (body) {
            console.log('Body: ' + body);
        });

        res.on('error', function (body) {
            console.log('error: ' + body);
        });
    });

    req.on('error', function (e) {
        console.log('problem ' + e);
    });

    // write data to request body
    req.write('{"string": "Hello, World"}');

    req.end();
}
