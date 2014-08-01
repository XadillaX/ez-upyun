/**
 * Created by XadillaX on 2014/8/1.
 */
var Upyun = require("../lib/upyun");

var upyun = new Upyun("bucket", "username", "password");

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

/**
 * test upload
 */
upyun.upload("test/test.jpg", "test/testx.jpg", { md5: true }, function(err, result) {
    if(err) {
        return console.log(err.message);
    }

    console.log("==== test upload ====");
    console.log(result);
    console.log("=====================");
    console.log();
});

/**
 * test download
 */
upyun.download("test/test5.jpg", function(err, data) {
    if(err) {
        return console.log(err.message);
    }

    console.log("=== test download ===");
    console.log(data);
    console.log("=====================");
    console.log()
});

/**
 * test make directory
 */
upyun.mkdir("a/b/c", false, function(err, directory) {
    if(err) {
        return console.log(err.message);
    }

    console.log("===== test mkdir ====");
    console.log(directory);
    console.log("=====================");
    console.log();
});

/**
 * test file/folder information
 */
upyun.info("mkdir/mkdir", function(err, result) {
    if(err) {
        return console.log(err.message);
    }

    console.log("===== test info =====");
    console.log(result);
    console.log("=====================");
    console.log();
});

/**
 * delete file
 */
upyun.rm("test/test.jpg", function(err, filename) {
    if(err) {
        return console.log(err.message);
    }

    console.log("==== test delete ====");
    console.log("Deleted " + filename + ".");
    console.log("=====================");
    console.log();
});

/**
 * fetch storage usage
 */
upyun.fetchUsage(function(err, usage) {
    if(err) {
        return console.log(err.message);
    }

    console.log("==== test usage =====");
    console.log(usage);
    console.log("=====================");
    console.log();
});

upyun.list("/", function(err, list) {
    if(err) {
        return console.log(err.message);
    }

    console.log("===== test list =====");
    console.log(list);
    console.log("=====================");
    console.log();
});

upyun.forceRemove("test/", function(err, delCount) {
    if(err) {
        console.log("Error when force delete: " + err.message);
    }

    console.log(delCount);
});
