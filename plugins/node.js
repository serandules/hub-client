var sh = require('./sh');

var PLUGIN = 'node';

var start = function(notify, options) {
    var opts = {
        action: 'run',
        command: 'node',
        args:[options.main]
    };
    sh(notify, opts);
};

var stop = function() {

};

module.exports = function (notify, options) {
    console.log(options);
    var action = options.action;
    switch (action) {
        case 'start':
            console.log('start message');
            start(notify, options);
            break;
    }
};