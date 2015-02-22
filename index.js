var log = require('logger')('hub-client');
var droner = require('droner');

var agent = require('hub-agent');
agent('/servers', function (err, io) {
    io.once('connect', function () {
        io.on('start', function (id, repo) {
            droner.start(id, repo, 'index.js', function (err, pid, port) {
                if (err) {
                    return log.error('drone startup error | id:%s, error:%s', id, err);
                }
                io.emit('started', id, pid, port);
                log.debug('drone started | id:%s, pid:%s, port:%s', id, pid, port);
            });
        });
        io.on('stop', function (id) {
            droner.stop(id, function (err) {
                if (err) {
                    return log.error('drone stop error | id:%s, error:%s', id, err);
                }
                log.debug('drone stopped | id:%s', id);
            });
        });
    });
});

log.info('hub-client started | pid:%s', process.pid);

process.on('uncaughtException', function (err) {
    log.fatal('unhandled exception %s', err);
    log.trace(err.stack);
});