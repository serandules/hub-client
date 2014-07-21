var uuid = require('node-uuid');
var spawn = require("child_process").spawn;

var procs = {};

module.exports = function (id, o, notify) {
    var child = spawn(o.command, o.args);

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', function (data) {
        console.log('' + data);
        notify(false, {
            id: id,
            event: 'stdout data',
            data: data
        });
    });

    child.stderr.setEncoding('utf8');

    child.stderr.on('data', function (data) {
        console.log('grep stderr: ' + data);
        notify(false, {
            event: 'stderr data',
            data: data
        });
    });

    child.on('exit', function (code, signal) {
        console.log('exit child : ' + id);
        delete procs[id];
        notify(false, {
            event: 'exit',
            code: code,
            signal: signal
        });
    });

    procs[id] = child;

    return function (options, notify) {
        if (options.action === 'kill') {
            child.kill(options.signal);
            notify(false, {
                event: 'kill'
            });
        }
    };
};