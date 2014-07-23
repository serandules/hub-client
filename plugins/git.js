var sh = require('./sh');

var PLUGIN = 'git';

var status = function (options, notify) {
    var opts = {
        action: 'run',
        command: 'git',
        args: ['status']
    };
    var out = '';
    sh(opts, function (options) {
        switch (options.action) {
            case 'stdout':
                out += options.data;
                break;
            case 'exit':
                notify({
                    plugin: PLUGIN,
                    action: 'state',
                    data: out
                });
                break;
        }
    });
};

var pull = function (options, notify) {
    var opts = {
        action: 'run',
        command: 'git',
        args: ['pull']
    };
    var out = '';
    sh(opts, function (options) {
        switch (options.action) {
            case 'stdout':
                out += options.data;
                break;
            case 'exit':
                notify({
                    plugin: PLUGIN,
                    action: 'pulled',
                    data: out
                });
                break;
        }
    });
};

var clone = function (options, notify) {
    var opts = {
        action: 'run',
        command: 'git',
        args: ['clone', options.repo]
    };
    var out = '';
    sh(opts, function (options) {
        switch (options.action) {
            case 'stdout':
                out += options.data;
                break;
            case 'exit':
                notify({
                    plugin: PLUGIN,
                    action: 'pulled',
                    data: out
                });
                break;
        }
    });
};

///Users/ruchira/sandbox/serandives/hub

module.exports = function (options, notify) {
    console.log(options);
    var action = options.action;
    switch (action) {
        case 'status':
            console.log('status message');
            status(options, notify);
            break;
        case 'pull':
            console.log('pull message');
            pull(options, notify);
            break;
        case 'clone':
            console.log('clone message');
            clone(options, notify);
            break;
    }
};