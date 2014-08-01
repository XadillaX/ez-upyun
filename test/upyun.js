/**
 * Created by XadillaX on 2014/8/1.
 */
var Upyun = require("../lib/upyun");

var upyun = new Upyun("ahaha", "ahaha", "ahaha123");

/**
 * test auth
 */
upyun.testAuth(function(err, respHeader) {
    if(err) {
        return console.log(err.message);
    }

    console.log("===== test auth =====");
    console.log(respHeader);
    console.log("=====================");
    console.log();
});

upyun.upload("test/test.jpg", "test/test.jpg", { md5: true }, function(err, result) {
    if(err) {
        return console.log(err.message);
    }

    console.log("==== test upload ====");
    console.log(result);
    console.log("=====================");
    console.log();
});
