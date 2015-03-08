var log = require('logger')('hub-client');
var droner = require('droner');
var procevent = require('procevent')(process);

var agent = require('hub-agent');
agent('/servers', function (err, io) {
    io.once('connect', function () {
        io.on('up', function () {
            log.debug('server up request');
            procevent.emit('up');
        });
        io.on('start', function (id, repo) {
            droner.start(id, repo, 'index.js', function (err, process, port) {
                if (err) {
                    return log.error('drone startup error | id:%s, error:%s', id, err);
                }
                io.emit('started', id, process.pid, port);
                log.debug('drone started | id:%s, pid:%s, port:%s', id, process.pid, port);
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

procevent.emit('started', 0);

log.info('hub-client started | pid:%s', process.pid);

/*
process.on('uncaughtException', function (err) {
    log.fatal('unhandled exception %s', err);
    log.trace(err.stack);
});*/
