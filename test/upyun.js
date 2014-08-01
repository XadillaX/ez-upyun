/**
 * Created by XadillaX on 2014/8/1.
 */
var Upyun = require("../lib/upyun");

var upyun = new Upyun("feime", "caozuoyuan", "caozuoyuan");

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

upyun.upload("test/test.jpg", "test3.jpg", function(err, result) {

})
