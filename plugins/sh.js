var uuid = require('node-uuid');
var spawn = require("child_process").spawn;

var PLUGIN = 'sh';

var procs = {};

/**
 * @param options commands
 * {
 *      action: 'run' | 'kill',
 *
 * }
 *
 *
 * {
 *      action: 'stdout' | 'stderr' | 'exit' | 'kill',
 *      id: '123456',
 *      code: 0 | 1 ..,
 *      signal: 'SIGINT' | 'SIGKILL' ..
 * }
 * @param notify notify
 */
module.exports = function (options, notify) {
    var child;
    var id = options.id;
    var action = options.action;
    console.log(options);
    switch (action) {
        case 'run':
            child = spawn(options.command, options.args);
            child.stdout.setEncoding('utf8');
            child.stdout.on('data', function (data) {
                notify({
                    plugin: PLUGIN,
                    action: 'stdout',
                    id: id,
                    data: data
                });
            });
            child.stderr.setEncoding('utf8');
            child.stderr.on('data', function (data) {
                console.log('grep stderr: ' + data);
                notify({
                    plugin: PLUGIN,
                    action: 'stderr',
                    id: id,
                    data: data
                });
            });
            child.on('exit', function (code, signal) {
                console.log('exit child : ' + id);
                delete procs[id];
                notify({
                    plugin: PLUGIN,
                    action: 'exit',
                    id: id,
                    code: code,
                    signal: signal
                });
            });
            procs[id] = child;
            notify({
                plugin: PLUGIN,
                action: 'ran',
                id: id,
                pid: child.pid
            });
            break;
        case 'kill':
            child.kill(options.signal);
            notify({
                plugin: PLUGIN,
                action: 'killed',
                id: id
            });
            break;
    }
};