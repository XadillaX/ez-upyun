/**
 * Created by XadillaX on 2014/8/1.
 */
require("sugar");
require("algorithmjs");
var upyunUtil = require("./util");
var base64 = require("js-base64").Base64;
var Buffer = require("buffer").Buffer;
var spidex = require("spidex");
var async = require("async");
var fs = require("fs");
var md5 = require("MD5");
var moment = require("moment");
var BASE_URI = "http://v0.api.upyun.com/";
var pkg = require("../package");

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

/**
 * format path
 * @param path
 * @returns {*}
 */
function formathPath(path) {
    while(path.length && path[0] === "/") path = path.substr(1);
    return path;
}

spidex.setDefaultUserAgent("node/ez-upyun " + pkg.version);

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

    this.baseHeader = {
        authorization   : this.authString,
        host            : "v0.api.upyun.com"
    };
};

/**
 * set customize api domain
 * @param {String} domain the custormize api domain
 */
Upyun.prototype.setApiDomain = function(domain) {
    this.baseUri = domain + this.bucket;
};

/**
 * test whether auth is right
 * @param [callback]
 */
Upyun.prototype.testAuth = function(callback) {
    callback = getCallback(callback);

    spidex.get(this.baseUri, {
        header: this.baseHeader,
        charset: "utf8"
    }, function(html, status, respHeader) {
        if(200 !== status) {
            return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
        }

        callback(undefined, respHeader);
    }).on("error", callback);
};

/**
 * get the file/folder information
 * @param filepath
 * @param [callback]
 */
Upyun.prototype.info = function(filepath, callback) {
    callback = getCallback(callback);
    filepath = formathPath(filepath);

    spidex.method("head", this.baseUri + "/" + filepath, {
        data: {},
        header: this.baseHeader,
        charset: "utf8"
    }, function(html, status, respHeader) {
        if(404 === status) {
            return callback(new Error("File not found"));
        }

        if(200 !== status) {
            if(html.trim() !== "") {
                return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
            }
            return callback(new Error("Unknown error."));
        }

        var timestamp = parseInt(respHeader["x-upyun-file-date"]);
        var date = moment.unix(timestamp);
        var result = {
            filename    : filepath,
            type        : respHeader["x-upyun-file-type"],
            size        : parseInt(respHeader["x-upyun-file-size"]),

            // some values about date
            timestamp   : timestamp,
            date        : date,
            dateString  : date.format()
        };

        callback(undefined, result);
    }).on("error", callback);
};

/**
 * make a directory for bucket
 * @param directory
 * @param [autoParentFolder] {default: true}
 * @param [callback]
 */
Upyun.prototype.mkdir = function(directory, autoParentFolder, callback) {
    if(typeof autoParentFolder === "function") {
        callback = autoParentFolder;
        autoParentFolder = true;
    }
    callback = getCallback(callback);
    if(undefined === autoParentFolder) autoParentFolder = true;
    autoParentFolder = !!autoParentFolder;

    directory = formathPath(directory);

    var header = Object.clone(this.baseHeader, true);
    header.folder = true;
    header.mkdir = autoParentFolder;
    spidex.post(this.baseUri + "/" + directory, {
        data: {},
        header: header,
        charset: "utf8"
    }, function(html, status) {
        if(200 !== status) {
            return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
        }

        callback(undefined, directory);
    }).on("error", callback);
};

/**
 * TODO: force remove directory/file
 * @param path
 * @param [callback]
 */
Upyun.prototype.forceRemove = function(path, callback) {
    path = formathPath(path);

    var self = this;
    self.info(path, function(err, info) {
        if(err && (path !== "" || path !== "/")) return callback(err);

        // if it's file
        if(info !== undefined && info.type === "file") {
            return self.rm(path, function(err) {
                if(err) return callback(err);
                callback(undefined, { file: 1, dir: 0 });
            });
        }

        // if it's directory
        // recur, ecur, cur, ur, r...
        self.list(path, function(err, list) {
            if(err) return callback(err);

            var count = 0;
            var fileDel = 0;
            var dirDel = 0;
            async.whilst(
                function() {
                    return count < list.length;
                },

                function(callback) {
                    self.forceRemove(path + "/" + list[count].filename, function(err, delCount) {
                        if(typeof delCount === "object") {
                            fileDel += delCount.file;
                            dirDel += delCount.dir;
                        }

                        count++;
                        callback(err);
                    });
                },

                function(err) {
                    if(err) {
                        return callback(err, { file: fileDel, dir: dirDel });
                    }

                    if("/" === path || "" === path) {
                        return callback(undefined, { file: fileDel, dir: dirDel });
                    }

                    // delete folder itself
                    self.rm(path, function(err) {
                        if(err) {
                            return callback(err, { file: fileDel, dir: dirDel });
                        }

                        callback(undefined, { file: fileDel, dir: dirDel + 1 });
                    });
                }
            );
        });
    });
};

/**
 * fetch the list information of one directory
 * @param directory
 * @param [callback]
 */
Upyun.prototype.list = function(directory, callback) {
    callback = getCallback(callback);
    directory = formathPath(directory);

    // make sure it's a directory.
    // otherwise, it may download a file
    if(directory[directory.length - 1] !== "/") directory += "/";

    spidex.get(this.baseUri + "/" + directory, {
        header: this.baseHeader,
        charset: "utf8"
    }, function(html, status) {
        if(404 === status) {
            return callback(new Error("File not found."));
        }

        // unknown error that official document not mentioned
        if(200 !== status) {
            if(html.trim() !== "") {
                return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
            }
            return callback(new Error("Unknown error."));
        }

        // empty folder
        if(html.trim() === "") return callback(undefined, []);

        var files = html.split("\n");

        callback(undefined, files.map(function(file) {
            file = file.split("\t");
            var timestamp = parseInt(file[3]);
            var date = moment.unix(timestamp);
            return {
                filename    : file[0],
                type        : file[1],
                size        : parseInt(file[2]),

                timestamp   : timestamp,
                date        : date,
                dateString  : date.format()
            };
        }).qsort(function(file1, file2) {
            // sort rule:
            //   1. folders first
            //   2. filename
            if(file1.type === file2.type) {
                return file1.filename < file2.filename;
            }
            return (file1.type === "F") ? true : false;
        }));
    }).on("error", callback);
};

/**
 * fetch storage usage
 * @param [callback]
 */
Upyun.prototype.fetchUsage = function(callback) {
    callback = getCallback(callback);

    spidex.get(this.baseUri + "/?usage", {
        header: this.baseHeader,
        charset: "utf8"
    }, function(html, status) {
        if(404 === status) {
            return callback(new Error("File not found."));
        }

        // unknown error that official document not mentioned
        if(200 !== status) {
            if(html.trim() !== "") {
                return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
            }
            return callback(new Error("Unknown error."));
        }

        var size = parseInt(html);
        callback(undefined, {
            b       : size,
            kb      : size / 1024,
            mb      : size / 1024 / 1024,
            gb      : size / 1024 / 1024 / 1024,
            tb      : size / 1024 / 1024 / 1024 / 1024
        });
    }).on("error", callback);
};

/**
 * remove file/directory from upyun
 * @param filepath
 * @param [callback]
 */
Upyun.prototype.rm = function(filepath, callback) {
    callback = getCallback(callback);
    filepath = formathPath(filepath);

    spidex.delete(this.baseUri + "/" + filepath, {
        data: {},
        header: this.baseHeader,
        charset: "utf8"
    }, function(html, status) {
        if(status !== 200) {
            return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
        }

        callback(undefined, filepath);
    }).on("error", callback);
};

/**
 * download file from upyun
 * @param filepath
 * @param [callback]
 */
Upyun.prototype.download = function(filepath, callback) {
    callback = getCallback(callback);
    filepath = formathPath(filepath);

    spidex.get(this.baseUri + "/" + filepath, {
        header: this.baseHeader,
        charset: "binary"
    }, function(html, status) {
        // 404 file not found
        if(404 === status) {
            return callback(new Error("File not found."));
        }

        // unknown error that official document not mentioned
        if(200 !== status) {
            html = html.toString("utf8");
            if(html.trim() !== "") {
                return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
            }
            return callback(new Error("Unknown error."));
        }

        callback(undefined, html);
    }).on("error", callback);
};

/**
 * upload file
 * @param file
 * @param uploadFilename
 * @param [opts] {md5: string|boolean, secret: string, mkdir: boolean}
 * @param [callback]
 */
Upyun.prototype.upload = function(file, uploadFilename, opts, callback) {
    if(typeof opts === "function") {
        callback = opts;
        opts = undefined;
    }
    callback = getCallback(callback);
    uploadFilename = formathPath(uploadFilename);
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
                if(!defOpts.hasOwnProperty(key)) continue;
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

        /**
         * use upyun api to upload the file and get result
         * @param callback
         */
        function(callback) {
            spidex.put(self.baseUri + "/" + uploadFilename, {
                data: rawData,
                header: header,
                charset: "utf8"
            }, function(html, status, respHeader) {
                if(200 !== status) {
                    return callback(new Error(html.replace("</h1>", "</h1> ").stripTags()));
                }

                var result = {};
                if(respHeader["x-upyun-width"] !== undefined) result.width = parseInt(respHeader["x-upyun-width"]);
                if(respHeader["x-upyun-height"] !== undefined) result.height = parseInt(respHeader["x-upyun-height"]);
                if(respHeader["x-upyun-frames"] !== undefined) result.frames = parseInt(respHeader["x-upyun-frames"]);
                if(respHeader["x-upyun-file-type"] !== undefined) result.type = respHeader["x-upyun-file-type"];

                callback(undefined, result);
            }).on("error", callback);
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Upyun;

