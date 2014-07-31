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
    var id = options.id;
    var opts = {
        id: id,
        action: 'run',
        command: 'bash',
        args: []
    };
    console.log(options);
    var out = '';
    sh(opts, function (opts) {
        switch (opts.action) {
            case 'stdout':
                out += opts.data;
                break;
            case 'exit':
                console.log('------------------exit-------------------');
                /*notify({
                    id: id,
                    plugin: PLUGIN,
                    action: 'cloned',
                    data: out
                });*/
                break;
            case 'close':
                console.log('-------------------close-----------------');
                break;
            case 'ran':
                sh({
                    id: id,
                    action: 'run',
                    command: 'cd',
                    args: [options.dir]
                }, function (opts) {
                    switch (opts.action) {
                        case 'ran':
                            sh({
                                id: id,
                                action: 'run',
                                command: 'git',
                                args: ['clone' , options.repo]
                            }, function (opts) {
                                console.log('----------------cloned-------------------');
                                notify({
                                    id: id,
                                    plugin: PLUGIN,
                                    action: 'cloned',
                                    data: out
                                })
                            });
                            break;
                    }
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