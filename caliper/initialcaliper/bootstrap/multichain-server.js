const async = require('async')

const multichain = require('multichain-node')({
    "port": "999",
    "host": "10.80.39.8",
    "user": "username",
    "pass": "password"
})


/*args[0] - TYPE OF ACTION 
    1 - pre-populate
*/

/*args[1] - NUMBER OF ITERATIONS */

args = process.argv.slice(2);

if (args[0] === "1") {

    const requestArray = [];
    const data = "AB";

    requestArray.push(function (callback) {
        multichain.create({ type: "stream", name: "mystream", open: true }, (err, success) => {
            if (err) {
                console.log("Error creating stream: ", err);
                callback(null, success);
            }
            else {
                console.log("Successfully created stream: ", success);
                callback(null, success);
            }
        })
    });

    console.log("Adding items to stream, please wait..");

    for (let i = 0; i < args[1]; i++) {
        requestArray.push(function (callback) {
            multichain.publish({ stream: "mystream", key: "account_no" + i, data: data }, (err, success) => {
                if (err) {
                    callback(err, null);
                }
                else {
                    callback(null, success);
                }
            })
        });
    }


    async.series(requestArray,
        function (err, results) {
            if (err) {
                console.log("Failure during prepopulation caliper", err)
                throw err;
            }
            console.log("Successfully prepopulated caliper with", results.length, "values.");
        });

}