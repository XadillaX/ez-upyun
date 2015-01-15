# Eazy Upyun

Yet another upyun SDK for node.js which are eazy to use.

## Installation

### Via NPM

```sh
$ npm install ez-upyun
```

### Via Git

```sh
$ git clone https://github.com/XadillaX/ez-upyun.git
```

### Download Manually

```sh
$ wget https://github.com/XadillaX/ez-upyun/archive/master.zip
```

Or open the url above in your browser.

## Usage

First you should create an Upyun instance:

```javascript
var Upyun = require("ez-upyun").Upyun;
var upyun = new Upyun("bucket", "user", "password");
```

> **Attention:** username and password is the operator username and password for that certain bucket.

### Upyun Class

Methods of `Upyun` class are shown below:

+ setApiDomain(domain)
+ testAuth([callback])
+ upload(filename|buffer, uploadFilename, [options], [callback])
+ download(filepath, [callback])
+ mkdir(directory, [autoParentFolder], [callback])
+ info(filepath, [callback])
+ list(directory, [callback])
+ rm(filepath, [callback])
+ fetchUsage([callback])
+ forceRemove(path, [callback]) *

#### setApiDomain

You can also set the API domain to:

+ v0.api.upyun.com //自动判断最优线路
+ v1.api.upyun.com //电信线路
+ v2.api.upyun.com //联通（网通）线路
+ v3.api.upyun.com //移动（铁通）线路

Or others your customize domain. The default API domain is v0.api.upyun.com.

#### testAuth

This method is just for testing whether your account is available. Callback function will return you two arguments, error and response header. (Someone may never call it)

Eg.

```javascript
upyun.testAuth(function(err, header) {
    if(err) return console.log(err.message);
    console.log(header);
})
```

You may got:

```
{ server: 'nginx/upyun@403',
  date: 'Fri, 01 Aug 2014 13:12:07 GMT',
  'content-type': 'text/html',
  'transfer-encoding': 'chunked',
  connection: 'keep-alive',
  'access-control-allow-origin': '*' }
```

#### upload

Upload a file to upyun server.

The arguments are shown below:

+ `filename | buffer`: when you pass a existing filename, `ez-upyun` will read your file at first and then upload it. When it's a binary buffer or string, `ez-upyun` will use it directly.
+ `uploadFilename`: this is the remote filename which you want to use. You can put a path name in it. Eg. `foo/bar.jpg`.
+ `options`: an object with some extra options:
  - `mkdir`: when `true`, Upyun will create all your precursor folder. Otherwise it will not. Default to `true`.
  - `md5`: when `true`, `ez-upyun` will calculate out the **MD5 Value** for your file and put it into [header](http://wiki.upyun.com/index.php?title=HTTP_REST_API%E6%8E%A5%E5%8F%A3#.E4.B8.8A.E4.BC.A0.E6.96.87.E4.BB.B6). Also you can calculate out the **MD5 Value** by your self and then put the 32 length string into this field. When `false`, it will never validate md5. Default to `false`.
  - `secret`: default to `undefined`. Once you put a string into this field, your **picture** bucket will protect your this upload with this secret value. Refer [here](http://wiki.upyun.com/index.php?title=HTTP_REST_API%E6%8E%A5%E5%8F%A3#.E6.B3.A81.EF.BC.9Acontent-secret.E8.AF.A6.E7.BB.86.E8.AF.B4.E6.98.8E).
  - `mime`: you can upload the file in a certain MIME type. Default to `undefined`.
+ `callback`: The callback function will pass two arguments, error and result. If successfully, result will be an object. And if your bucket is a picture one, this object will contains: `{width: Number, height: Number, frames: Number, type: String}`.

Eg.

```javascript
fs.readFile("path", function(err, data) {
    if(err) ...;
    
    upyun.upload(data, "foo/bar.jpg", { md5: true, secret: "fuli" }, function(err, result) {
        if(err) ...;
        
        console.log(result);
    });
});

// Or like this...

upyun.upload("path", "foo/bar.jpg", function(err, result) {});
```

#### download

File path is a string, then you can download the file with that path. The binary data will pass through your callback function:

```javascript
upyun.download("foo/bar.jpg", function(err, data) {
    fs.writeFile("path/bar.jpg", data, function(err) {});
});
```

#### mkdir

Make a directory on the remote upyun server. `autoParentFolder` is optional, it stands for whether upyun will create the precursor folders, default to `true`.

Eg.

```javascript
upyun.mkdir("foo/bar/and/bar", true, function(err, directoryName) {});

// Or below is the same

upyun.mkdir("foo/bar/and/bar", function(err, directoryName) {});

// Or not to make precursor folders

upyun.mkdir("foo/bar/and/bar", false, function(...) {});
```

#### info

To get the information of one certain file or folder.

The second argument that callback throughs is an object:

```javascript
{
    filename    : "filename",
    type        : "file|folder",    // `file` stands for a file and `folder` stands for a folder
    size        : Number,           // file size
    timestamp   : Number,           // a 10 length long integer stands for a timestamp
    date        : Date,             // a `Date` type object which matches timestamp
    dateString  : String            // a formatted date string
}
```

Eg.

```javascript
upyun.info("foo.jpg", function(err, info) {
    if(err) ...;
    console.log(info.filename);
});
```

#### list

List all items in one folder (not recur). Result is an item array and each item is an object looks like below:

```javascript
{
    filename    : "filename",
    type        : "N|F",            // `N` stands for a file and `F` stands for a folder
    size        : Number,           // file size
    timestamp   : Number,           // a 10 length long integer stands for a timestamp
    date        : Date,             // a `Date` type object which matches timestamp
    dateString  : String            // a formatted date string
}
```

Eg.

```javascript
upyun.list("/", function(err, list) {
    if(err) ...;
    for(var i = 0; i < list.length; i++) {
        console.log(list[i].filename);
    }
});
```

#### rm

Delete a file or an empty folder.

> **Attention:** this function can't delete a non-empty folder.

The callback function will pass two arguments, error and filename deleted.

Eg.

```javascript
upyun.rm("foo/bar.jpg", function(err, filename) {});
```

#### fetchUsage

This function will return the storage usage of your bucket. The result will be returned as an object like:

```javascript
{
    b : Number,
    kb: Number,
    mb: Number,
    gb: Number,
    tb: Number
}
```

**Each element is integral.** You can use any of them.

Eg.

```javascript
upyun.fetchUsage(function(err, usage) {
    if(err) ...;
    console.log("You have used " + usage.b + " byte.");
});
```

#### forceRemove*

> **Caution:** use this function carefully. It can delete any remote file or folder (both empty and non-empty, it will delete recurred).

The two arguments of this function are filename / path and callback. When it's a filename or en empty folder, this function will do the same thing as `rm` does. When it's a non-empty folder, the function will delete this folder and all of its children file and folder.

The two arguments of callback passes are error and delete count. Delete count is an json object which contains both count of file and folder are deleted.

Eg.

```javascript
upyun.forceRemove("foo", function(err, delCount) {
    if(err) ...;
    
    console.log(delCount.file + " file(s) are deleted.");
    console.log(delCount.dir + " folder(s) are deleted.")
});
```

## Author

Only me - XadillaX so far.

You can contribute your code! You're welcome.

「雖然我覺得不怎麼可能有人會關注我」
