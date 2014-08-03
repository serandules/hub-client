var https = require('https');
var fs = require('fs');
var socproc = require('socproc-client');

var plugins = [
    require('./plugins/hub')
];

var HUB = 'hub.serandives.com:4000';

var agent = new https.Agent({
    ca: fs.readFileSync('/etc/ssl/serand/hub.cert')
});

var spc = socproc('server', agent, {
    server: HUB
});

spc.on('connect', function (exec) {
    plugins.forEach(function (plugin) {
        plugin(exec);
    });
});