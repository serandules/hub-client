var uuid = require('node-uuid');
var fs = require('fs');
var logger = require('logger');
var rimraf = require('rimraf');
var spawn = require('child_process').spawn;
var fork = require('child_process').fork;

var DRONES_DIR = process.env.DRONES_DIR || '/Users/ruchira/serandives/servers/drones';

var dev = process.env.NODE_ENV === 'development';

console.log(DRONES_DIR);

var drones = [];

var p = function (id) {
    return DRONES_DIR + '/' + id;
};

rimraf.sync(DRONES_DIR); //TODO
fs.mkdirSync(DRONES_DIR);

var clone = function (repo, dir) {
    var idx = repo.lastIndexOf('/');
    repo = repo.substring(idx + 1);
    repo = repo.substring(0, repo.indexOf('.'));
    repo = process.env.GIT_REPO + '/serandules/' + repo;
    return 'cp -rf ' + repo + '/* ' + dir + '\n';
};

var npm = function () {
    var repo = process.env.GIT_REPO;
    var cmd = 'for dir in ' + repo + '/serandules/*; do rm -rf `pwd`/node_modules/$(basename "$dir");';
    cmd += 'ln -s ' + repo + '/serandules/$(basename "$dir") `pwd`/node_modules/$(basename "$dir"); done;\n';
    return cmd;
};

var comps = function () {
    var repo = process.env.GIT_REPO;
    var cmd = 'for dir in ' + repo + '/serandomps/*; do rm -rf `pwd`/components/serandomps-$(basename "$dir");';
    cmd += 'ln -s ' + repo + '/serandomps/$(basename "$dir") `pwd`/components/serandomps-$(basename "$dir"); done;\n';
    return cmd;
};

var cmdClone = function (repo, dir) {
    return dev ? clone(repo, dir) : 'git clone ' + repo + ' ' + dir + '\n';
};

var cmdCD = function (path) {
    return 'cd ' + path + '\n';
};

var cmdStart = function (main) {
    return 'node ' + (main || 'index.js') + '\n';
};

var cmdNPM = function () {
    return dev ? npm() : 'npm install' + '\n';
};

var cmdComp = function () {
    return dev ? comps() : 'component install' + '\n';
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
    exec.server.on('self up', function () {
        console.log('event:self up');
        drones.forEach(function (drone) {
            console.log('killing drone:' + drone.id);
            drone.kill('SIGKILL');
        });
        process.send({
            event: 'self up'
        });
        console.log('send:self up');
    });
    /*exec.server.on('drones list', function () {
     exec.server.emit('drones listed', drones);
     });*/
    exec.server.on('drone start', function (data) {
        console.log('event:drone start');
        console.log(data);
        var id = data.id;
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
            child.on('exit', function () {
                console.log('event:exit existing helper process');
            });
            child.on('close', function () {
                console.log('event:close closing helper process');
                //process.execArgv.push('--debug=5005');
                var child = fork(nodePath(data.main), {
                    cwd: appDir(id),
                    silent: true,
                    env: {
                        NODE_ENV: process.env.NODE_ENV
                    }
                });
                child.send({
                    event: 'self domain',
                    domain: data.domain
                });
                console.log('send:self domain ' + data.domain);
                child.stdout.pipe(logger(id));
                child.stderr.pipe(logger(id, 'error'));
                child.on('message', function (data) {
                    console.log('message:' + data.event);
                    console.log(data);
                    var address;
                    switch (data.event) {
                        case 'drone started':
                            address = data.address;
                            console.log('emitting drone started : ' + id);
                            exec.server.emit('drone started', {
                                id: id,
                                port: address.port
                            });
                            child.port = address.port;
                            console.log('fired:drone started id:' + id + ' port:' + address.port);
                    }
                });
                child.on('exit', function (code, signal) {
                    console.log('event:exit child: ' + id);
                    /*exec.server.emit('drone stop', {
                     id: id
                     });*/
                });
                child.on('close', function (code, signal) {
                    console.log('event:close child: ' + id);
                    exec.server.emit('drone stopped', {
                        id: id
                    });
                    console.log('fired:drone stopped drone:' + id);
                });
                child.id = id;
                child.dom = data.domain;
                drones.push(child);
            });
            //child.stdin.write(cmdStart(data.main));
        });
    });
    exec.server.on('drone stop', function (data) {
        console.log('event:drone stop');
        console.log(data);
        var i, drone,
            id = data.id,
            length = drones.length;
        for (i = 0; i < length; i++) {
            drone = drones[i];
            if (drone.id === id) {
                console.log('killing drone : ' + id);
                drone.kill('SIGKILL');
                drones.splice(i, 1);
                break;
            }
        }
    });
    exec.server.on('drones init', function (data) {
        console.log('event:drones init');
        console.log(data);
        drones.forEach(function (drone) {
            drone.send({
                event: 'drones init',
                domains: data
            });
            console.log('send:drones init');
        });
    });
    exec.server.on('drone joined', function (data) {
        console.log('event:drone joined');
        console.log(data);
        drones.forEach(function (drone) {
            drone.send({
                event: 'drone joined',
                drone: data
            });
            console.log('send:drone joined');
        });

    });
    exec.server.on('drone left', function (data) {
        console.log('event:drone left');
        console.log(data);
        drones.forEach(function (drone) {
            drone.send({
                event: 'drone left',
                drone: data
            });
            console.log('send:drone left');
        });
    });
};

module.exports.reconnect = function (exec) {
    console.log('reconnecting hub');
    var domain, o = {};
    drones.forEach(function (drone) {
        domain = o[drone.dom] || (o[drone.dom] = []);
        domain.push({
            id: drone.id,
            port: drone.port
        });
    });
    exec.server.emit('self drones', o);
    console.log('fired:self drones');
    console.log(o);
};

// lb.autos.serandives.com
// *.autos.serandives.com

