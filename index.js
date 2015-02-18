var log = require('logger')('hub-client');
var clustor = require('clustor');

clustor('hubclient.serandives.com', function () {
    var agent = require('hub-agent');
    agent('/drones', function (err, io) {
        io.on('connect', function () {
            io.on('join', function (drone) {
                log.info(drone);
            });
            io.on('leave', function (drone) {
                log.info(drone);
            });
        });
    });
}, function (err, address) {
    log.info(JSON.stringify(address));
    log.info('%s listening at https://%s:%s', configs.domain, address.address, address.port);
});