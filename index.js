var log = require('logger')('hub-client');
var agent = require('hub-agent');
var hub = require('./lib/hub');

agent.channel('server', function (err, channel) {
    log.info('server channel of hub-client established');
    channel.on('drone start', function(id, domain, repo) {
        log.info('%s %s %s', id, domain, repo);
    });
    channel.on('drone stop', function(data) {
        log.info(data);
    });
    channel.emiton('config', 'aws-key', function(value) {
        log.info('aws-key value : %s', value);
    });
});

log.info('hub-client started');
