var sh = require('./sh');

module.exports = function (id, o, notify) {
    sh(id, {
        command: 'git',
        args: ['status']
    }, function (err, data) {
        notify(err, data);
    });
};