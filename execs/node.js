var sh = require('./sh');

var kill = function (exec, notify) {
    exec({
        action: 'kill',
        signal: 'SIGKILL'
    }, notify);
};

var run = function (id, main, notify) {
    var exec = sh(id, {
        command: 'node',
        args: [main]
    }, notify)
};

module.exports = function (id, o, notify) {
    var exec = run(id, o.main, function (err, o) {
        if (err) {
            notify(err);
            return;
        }
        var event = o.event;
        if (event === 'exit') {
            notify(false, {
                event: 'stopped'
            });
            return;
        }
        if (event === 'stdout data' || event === 'stderr data') {
            notify(false, {
                event: 'logs',
                data: o.data
            });
        }
    });
    return function (options, notify) {
        var action = options.action;
        if (action === 'stop') {
            kill(exec, function (err) {
                notify(err, {
                    event: 'stopped'
                });
            });
            return;
        }
        if (action === 'restart') {
            kill(exec, function (err) {
                run(id, o.main, function (err) {
                    notify(err, {
                        event: 'restarted'
                    });
                });
            });
        }
    };
};