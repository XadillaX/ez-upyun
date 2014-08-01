/**
 * Created by XadillaX on 2014/8/1.
 */
require("sugar");
var upyunUtil = require("./util");
var base64 = require("js-base64").Base64;
var Buffer = require("buffer").Buffer;
var spidex = require("spidex");
var async = require("async");
var fs = require("fs");
var md5 = require("MD5");
var BASE_URI = "http://v0.api.upyun.com/";

/**
 * get callback function
 * @param callback
 * @returns {*}
 */
function getCallback(callback) {
    if(undefined === callback || typeof callback !== "function") {
        return upyunUtil.emptyFunc;
    }
    return callback;
}

spidex.setDefaultUserAgent("node/ez-upyun");

/**
 * Upyun class
 * @param bucket
 * @param username
 * @param password
 * @constructor
 */
var Upyun = function(bucket, username, password) {
    this.bucket = bucket;
    this.username = username;
    this.password = password;

    this.authString = ["Basic", base64.encode([username, password].join(":"))].join(" ");
    this.baseUri = BASE_URI + bucket;

    this.baseHeader = { "authorization": this.authString };
};

/**
 * test whether auth is right
 * @param callback {function (err, respHeader)}
 */
Upyun.prototype.testAuth = function(callback) {
    callback = getCallback(callback);

    spidex.get(this.baseUri, function(html, status, respHeader) {
        if(200 !== status) {
            return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
        }

        callback(undefined, respHeader);
    }, this.baseHeader, "utf8").on("error", callback);
};

/**
 * upload file
 * @param file
 * @param uploadFilename
 * @param opts {md5: string|boolean, secret: string, mkdir: boolean}
 * @param callback {function (err, result)}
 */
Upyun.prototype.upload = function(file, uploadFilename, opts, callback) {
    if(typeof opts === "function") {
        callback = opts;
        opts = undefined;
    }
    callback = getCallback(callback);
    var self = this;

    var rawData = null;
    var header = Object.clone(this.baseHeader, true);
    var defOpts = { "mkdir": true };
    async.waterfall([
        /**
         * get the raw data
         * @param callback
         */
        function(callback) {
            fs.exists(file, function(exists) {
                if(!exists) {
                    rawData = file;
                    if(typeof rawData === "string") rawData = new Buffer(file);
                    return callback();
                }

                fs.readFile(file, function(err, data) {
                    if(err) return callback(err);
                    rawData = data;
                    return callback();
                });
            });
        },

        /**
         * check options
         * @param callback
         */
        function(callback) {
            if(typeof opts !== "object") return callback();

            defOpts = Object.merge(defOpts, opts);
            for(var key in defOpts) {
                switch(key) {
                case "mkdir": header.mkdir = defOpts.mkdir; break;
                case "md5": {
                    if(!md5) break;
                    if(typeof defOpts.md5 === "string" && 32 === defOpts.md5.length) {
                        header["content-md5"] = defOpts.md5;
                        break;
                    }
                    header["content-md5"] = md5(rawData);
                    break;
                }
                case "secret": header["content-secret"] = defOpts.secret; break;
                case "mime": header["content-type"] = defOpts.mime; break;
                default: break;
                }
            }

            callback();
        },

        function(callback) {
            spidex.put(self.baseUri + "/" + uploadFilename, function(html, status, respHeader) {
                if(200 !== status) {
                    return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
                }

                var result = {};
                if(respHeader["x-upyun-width"] !== undefined) result.width = parseInt(respHeader["x-upyun-width"]);
                if(respHeader["x-upyun-height"] !== undefined) result.height = parseInt(respHeader["x-upyun-height"]);
                if(respHeader["x-upyun-frames"] !== undefined) result.frames = parseInt(respHeader["x-upyun-frames"]);
                if(respHeader["x-upyun-file-type"] !== undefined) result.type = respHeader["x-upyun-file-type"];

                callback(undefined, result);
            }, rawData, header, "utf8").on("error", callback);
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Upyun;
