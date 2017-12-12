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

    const promiseArray = [];
    const data = "AB";
    console.log("Adding items to stream, please wait..");

    for (let i = 0; i < args[1]; i++) {
        promiseArray.push(new Promise((resolve, reject) => {
            multichain.publish({ stream: "mystream", key: "account_no" + i, data: data }, (err, success) => {
                if (err) {
                    return reject(err);
                }
                return resolve(success);
            });
        }));
    }

    Promise.all(promiseArray).then((values) => {
        console.log("Successfully prepopulated caliper with", values.length, "values.");
    }, ((errors) => {
        console.log("Failure prepopulation caliper", errors)
    }));

}