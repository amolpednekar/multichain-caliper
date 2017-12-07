const express = require('express')
const app = express()
const child_process = require('child_process');
app.get('/', function (req, res) {

  child_process.exec("node simple.js",{maxBuffer: 1024 * 1024}, function(error, stdout, stderr){
				console.log(stdout)
				if(error){
					console.log(error)
				}
  });
  res.status(200).send();
  
})
app.listen(3000, function () {
  console.log('Listening on port 3000')
})