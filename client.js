var WebSocket = require('ws');
var https = require('https');
var constants = require('constants');
var io = require('socket.io-client');
var fs = require('fs');
var socproc = require('socproc-client');

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var options = {
    hostname: 'hub.serandives.com',
    port: 4000,
    ca: fs.readFileSync('ssl/hub.cert')
};
var agent = new https.Agent(options);

var spc = socproc('server', agent, {
    server: 'hub.serandives.com:4000'
});

spc.on('connect', function() {

});
