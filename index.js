var fs = require('fs');
var socket = require('./lib/socket');

var str = JSON.stringify;
var pas = JSON.parse;

var express = require('express');

var app = express();

var refs = {};

var execsDir = './execs';

var execs = {};
var files = fs.readdirSync(execsDir);
files.forEach(function (file) {
    var exec = file.substring(0, file.length - 3);
    execs[exec] = require(execsDir + '/' + file);
});


/*var client = new WebSocket(hub, {
    ca: [fs.readFileSync('ssl/hub.cert')],
    headers: {
        'User-Agent': 'hub-client'
    }
});

client.on('open', function () {
    console.log('connected');
    setTimeout(function () {
        client.send(str({
            type: 'hub',
            data: 'nothing'
        }));
    }, 1000);
});

client.on('message', function (o) {
    try {
        o = pas(o);
    } catch (e) {
        console.error(e);
        return;
    }
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

});*/
