var PLUGIN = 'hub';

module.exports = function (notify, options) {
    console.log(options);
    var action = options.action;
    switch (action) {
        case 'update':
            console.log('update message');
            notify({
                action: 'updated'
            });
            break;
    }
};