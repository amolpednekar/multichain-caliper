const express = require('express');
var bodyParser = require('body-parser')

const app = express();

app.use(bodyParser.json());
var i=0;

app.post('/log', (req, res) => {
    console.log("Got request: ", ++i , req.body);
    res.end(JSON.stringify(i));
})



app.listen(1445);
console.log("Listening on 1445");