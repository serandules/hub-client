var log = require('logger')('hub-client');
var droner = require('droner');
var procevent = require('procevent')(process);

var agent = require('hub-agent');

var drones = {};

agent('/servers', function (err, io) {
    io.once('connect', function () {
        io.emit('unmarshal');

        io.on('up', function () {
            log.debug('server up request');
            procevent.emit('up');
        });

        io.on('start', function (id, domain, repo) {
            droner.start(id, repo, 'index.js', function (err, process, port) {
                if (err) {
                    return log.error('drone startup error | id:%s, error:%s', id, err);
                }
                drones[id] = {
                    id: id,
                    domain: domain,
                    pid: process.pid,
                    port: port
                };
                io.emit('started', id, domain, process.pid, port);
                log.debug('drone started | id:%s, pid:%s, port:%s', id, process.pid, port);
            });
        });

        io.on('stop', function (id) {
            droner.stop(id, function (err) {
                if (err) {
                    return log.error('drone stop error | id:%s, error:%s', id, err);
                }
                delete drones[id];
                io.emit('stopped', id);
                log.debug('drone stopped | id:%s', id);
            });
        });

        io.on('restart', function (id) {
            var drone = drones[id];
            droner.restart(id, function (err, process, port) {
                drone.pid = process.pid;
                drone.port = port;
                io.emit('restarted', id, drone.domain, drone.pid, drone.port);
                log.debug('drone restarted | id:%s', id);
            });
        });
    });

    io.on('reconnect', function () {
        io.emit('sync', drones);
    });
});

procevent.emit('started', 0);

log.info('hub-client started | pid:%s', process.pid);

/*
 process.on('uncaughtException', function (err) {
 log.fatal('unhandled exception %s', err);
 log.trace(err.stack);
 });*/
