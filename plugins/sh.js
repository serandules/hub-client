var uuid = require('node-uuid');
var spawn = require("child_process").spawn;

var PLUGIN = 'sh';

var procs = {};

module.exports = function (notify, options) {
    var child, id;
    var action = options.action;
    console.log(options);
    switch (action) {
        case 'run':
            id = uuid.v4();
            child = spawn(options.command, options.args);
            child.stdout.setEncoding('utf8');
            child.stdout.on('data', function (data) {
                notify({
                    action: 'stdout',
                    id: id,
                    data: data
                });
            });
            child.stderr.setEncoding('utf8');
            child.stderr.on('data', function (data) {
                console.log('grep stderr: ' + data);
                notify({
                    action: 'stderr',
                    id: id,
                    data: data
                });
            });
            child.on('exit', function (code, signal) {
                console.log('exit child : ' + id);
                delete procs[id];
                notify({
                    action: 'exit',
                    id: id,
                    code: code,
                    signal: signal
                });
            });
            procs[id] = child;
            break;
        case 'kill':
            child.kill(options.signal);
            notify({
                action: 'kill',
                id: options.id
            });
            break;
    }
};