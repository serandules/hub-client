var https = require('https');
var fs = require('fs');
var socproc = require('socproc-client');

var HUB = 'hub.serandives.com:4000';

var agent = new https.Agent({
    ca: fs.readFileSync('/etc/ssl/serand/hub.cert')
});

var spc = socproc('server', agent, {
    server: HUB
});

spc.on('connect', function (exec) {
    require('./lib/hub')(exec);
});

process.on('uncaughtException', function (err) {
    console.log('unhandled exception');
    console.trace(err);
});