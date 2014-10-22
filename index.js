var https = require('https');
var fs = require('fs');
var hub = require('./lib/hub');
var socproc = require('socproc-client');

var HUB = 'hub.serandives.com:4000';

var agent = new https.Agent({
    key: fs.readFileSync('/etc/ssl/serand/hub-client.key'),
    cert: fs.readFileSync('/etc/ssl/serand/hub-client.crt'),
    ca: fs.readFileSync('/etc/ssl/serand/hub.crt')
});

var spc = socproc('server', agent, {
    server: HUB
});

spc.on('connect', function (exec) {
    hub(exec);
});

spc.on('reconnect', function (exec) {
    hub.reconnect(exec);
});

process.on('uncaughtException', function (err) {
    console.log('unhandled exception ' + err);
    console.log(err.stack);
});