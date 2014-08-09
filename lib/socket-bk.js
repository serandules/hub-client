var https = require('https');
var io = require('socket.io-client');
var fs = require('fs');

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
var hub = 'wss://hub.serandives.com:4000';

var agent = new https.Agent({
    ca: fs.readFileSync('ssl/hub.cert')
});

io = io(hub + '/hub', {
    transports: ['websocket'],
    agent: agent
});

io.on('connect', function () {
    console.log('connected');
    io.on('event', function (data) {

    });
    io.on('disconnect', function () {
        console.log('disconnected');
    });
});