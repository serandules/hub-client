var uuid = require('node-uuid');
var fs = require('fs');
var logger = require('logger');
var rimraf = require('rimraf');
var spawn = require('child_process').spawn;
var fork = require('child_process').fork;

var DRONES_DIR = process.env.DRONES_DIR || __dirname + '/tmp';

console.log(DRONES_DIR);

var drones = [];

var p = function (id) {
    return DRONES_DIR + '/' + id;
};

rimraf.sync(DRONES_DIR); //TODO
fs.mkdirSync(DRONES_DIR);

var cmdClone = function (repo, dir) {
    return 'git clone ' + repo + ' ' + dir + '\n';
};

var cmdCD = function (path) {
    return 'cd ' + path + '\n';
};

var cmdStart = function (main) {
    return 'node ' + (main || 'index.js') + '\n';
};

var cmdNPM = function () {
    return 'npm install' + '\n';
};

var cmdComp = function () {
    return 'component install' + '\n';
};

var cmdKill = function (pid) {
    return 'kill -9 ' + pid + '\n';
};

var appDir = function (dir) {
    return DRONES_DIR + '/' + dir;
};

var nodePath = function (main) {
    return main || 'index.js';
};

module.exports = function (exec) {
    console.log('events registering');
    exec.server.on('drones list', function () {
        exec.server.emit('drones listed', drones);
    });
    exec.server.on('drone start', function (data) {
        console.log('drone start');
        console.log(data);
        var id = data.id;
        var idd = data.id; //TODO
        //id = 'b53b30b4-88c8-4215-9616-14cb5bba97f4'; //TODO
        fs.mkdir(p(id), function (err) {
            var child = spawn('bash');
            child.id = id;
            child.stdout.pipe(logger(id));
            child.stderr.pipe(logger(id, 'error'));
            child.stdin.write(cmdCD(DRONES_DIR)); //TODO
            child.stdin.write(cmdClone(data.repo, id));
            child.stdin.write(cmdCD(id));
            child.stdin.write(cmdNPM());
            child.stdin.write(cmdComp());
            child.stdin.write(cmdKill(child.pid));
            child.on('close', function () {
                console.log('closing helper process');
                var child = fork(nodePath(data.main), {
                    cwd: appDir(id),
                    silent: true
                });
                child.stdout.pipe(logger(id));
                child.stderr.pipe(logger(id, 'error'));
                child.on('message', function (data) {
                    console.log(data);
                    var address = data.address;
                    switch (data.event) {
                        case 'drone started':
                            console.log('emitting drone started : ' + id);
                            exec.server.emit('drone started', {
                                id: id, //TODO
                                port: address.port
                            });
                    }
                });
                child.on('exit', function (code, signal) {
                    console.log('exit child : ' + id);
                    /*exec.server.emit('drone stop', {
                     id: id
                     });*/
                });
                child.on('close', function (code, signal) {
                    console.log('close child : ' + id);
                    exec.server.emit('drone stopped', {
                        id: id
                    });
                });
                drones.push(child);
            });
            //child.stdin.write(cmdStart(data.main));
        });
    });
    exec.server.on('drone stop', function (data) {
        var i, id = data.id,
            length = drones.length;
        for (i = 0; i < length; i++) {
            if (drones[i].id === id) {
                drones.splice(i, 1);
                break;
            }
        }
    });
    exec.server.on('drones update', function (data) {
        drones.forEach(function (drone) {
            drone.send({
                event: 'drones update',
                domains: data
            });
        });
    });
};


// lb.autos.serandives.com
// *.autos.serandives.com

