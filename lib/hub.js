var uuid = require('node-uuid');
var fs = require('fs');
var logger = require('logger');
var rimraf = require('rimraf');
var utils = require('utils');
var spawn = require('child_process').spawn;
var fork = require('child_process').fork;

var DRONES_DIR = process.env.DRONES_DIR || '/tmp/serandives/drones';

var dev = !utils.prod();

console.log(DRONES_DIR);

var drones = [];

var configs = {};

var joinedAt = 0;

var p = function (id) {
    return DRONES_DIR + '/' + id;
};

rimraf.sync(DRONES_DIR); //TODO
fs.mkdirSync(DRONES_DIR);

var clone = function (repo, dir) {
    var idx = repo.lastIndexOf('/');
    repo = repo.substring(idx + 1);
    repo = repo.substring(0, repo.indexOf('.'));
    repo = utils.locals() + '/serandules/' + repo;
    return 'cp -rf ' + repo + '/* ' + dir + '\n';
};

var npm = function () {
    var repo = utils.locals();
    var cmd = 'mkdir node_modules\n';
    cmd += 'for dir in ' + repo + '/serandules/*; do rm -rf `pwd`/node_modules/$(basename "$dir");';
    cmd += 'ln -s ' + repo + '/serandules/$(basename "$dir") `pwd`/node_modules/$(basename "$dir"); done;\n';
    return cmd;
};

var comps = function () {
    var repo = utils.locals();
    var cmd = 'mkdir components\n';
    cmd += 'for dir in ' + repo + '/serandomps/*; do rm -rf `pwd`/components/serandomps-$(basename "$dir");';
    cmd += 'ln -s ' + repo + '/serandomps/$(basename "$dir") `pwd`/components/serandomps-$(basename "$dir"); done;\n';
    cmd += 'ln -s ' + repo + '/visionmedia-page.js `pwd`/components/visionmedia-page.js\n';
    cmd += 'ln -s ' + repo + '/pillarjs-path-to-regexp `pwd`/components/pillarjs-path-to-regexp\n';
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

var cmdRDM = function () {
    return dev ? '' : 'force-dedupe-git-modules\n';
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
            child.stdin.write(cmdRDM());
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
                            drones.push(child);
                            console.log('fired:drone started id:' + id + ' port:' + address.port);
                            break;
                        case 'drone config':
                            exec.server.emit('drone config', {
                                id: data.id,
                                name: data.name
                            });
                            console.log('fired:drone config id:' + data.id + ' name:' + data.name);
                            configs[data.id] = child;
                            break;
                    }
                });
                child.on('exit', function (code, signal) {
                    console.log('event:exit child: ' + id);
                    var index = drones.indexOf(child);
                    if (index === -1) {
                        return;
                    }
                    drones.splice(index, 1);
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
                break;
            }
        }
    });
    exec.server.on('drones init', function (data) {
        console.log('event:drones init');
        console.log(data);
        drones.every(function (drone) {
            if (drone.id === data.drone) {
                data.event = 'drones init';
                drone.send(data);
                console.log('send:drones init to pid:' + drone.pid);
                return false;
            }
            return true;
        });
    });
    exec.server.on('drone joined', function (data) {
        console.log('event:drone joined');
        console.log(data);
        if (joinedAt >= data.at) {
            console.log('skipping outdated drone joined event');
            return;
        }
        joinedAt = data.at;
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
        if (joinedAt >= data.at) {
            console.log('skipping outdated drone left event');
            return;
        }
        joinedAt = data.at;
        drones.forEach(function (drone) {
            drone.send({
                event: 'drone left',
                drone: data
            });
            console.log('send:drone left');
        });
    });
    exec.server.on('drone configed', function (data) {
        console.log('drone configed : ' + JSON.stringify(data));
        var child = configs[data.id];
        child.send({
            event: 'drone configed',
            id: data.id,
            value: data.value
        });
        delete configs[data.id];
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

