var PLUGIN = 'hub';

module.exports = function (hub, options) {
    console.log(options);
    var action = options.action;
    switch (action) {
        case 'update':
            console.log('update message');
            break;
    }
};