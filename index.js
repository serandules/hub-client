var WebSocket = require('ws');
var fs = require('fs');

var str = JSON.stringify;
var pas = JSON.parse;

var express = require('express');

var app = express();

var refs = {};

var hub = 'wss://hub.serandives.com:4000';

var execsDir = './execs';

var execs = {};
var files = fs.readdirSync(execsDir);
files.forEach(function (file) {
    var exec = file.substring(0, file.length - 3);
    execs[exec] = require(execsDir + '/' + file);
});

var client = new WebSocket(hub, {
    ca: [fs.readFileSync('ssl/hub.cert')]
});

client.on('open', function () {
    console.log('connected');
});

client.on('message', function (o) {
    o = pas(o);
    var id = o.id;
    console.log(id);
    var exec = execs[o.exec];
    if (!exec) {
        client.send(str({
            id: id,
            error: true
        }));
    }
    var ref = refs[id];
    if (ref) {
        ref(o, function (err, data) {
            var o = {
                id: id
            };
            err ? (o.error = err) : (o.data = data);
            client.send(str(o));
        });
        return;
    }
    refs[id] = exec(id, o.data, function (err, data) {
        var o = {
            id: id
        };
        err ? (o.error = err) : (o.data = data);
        client.send(str(o));
    });
});

client.on('close', function () {

});
