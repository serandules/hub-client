var debug = require('debug')('serandules:hub-client');
var uuid = require('node-uuid');
var fs = require('fs');
var logger = require('logger');
var rimraf = require('rimraf');
var utils = require('utils');
var spawn = require('child_process').spawn;
var fork = require('child_process').fork;

var DRONES_DIR = process.env.DRONES_DIR || '/tmp/serandives/drones';

var WAITS = 5 * 60 * 1000;

var dev = !utils.prod();

debug(DRONES_DIR);

var drones = [];

var queue = [];

var next;

var configs = {};

var joinedAt = 0;

var p = function (id) {
    return DRONES_DIR + '/' + id;
};

//rimraf.sync(DRONES_DIR); //TODO
//fs.mkdirSync(DRONES_DIR);

var repo = function (repo) {
    var idx = repo.lastIndexOf('/');
    repo = repo.substring(idx + 1);
    return repo.substring(0, repo.indexOf('.'));
};

var clone = function (ripo, dir) {
    ripo = utils.locals() + '/serandules/' + repo(ripo);
    return 'cp -rf ' + ripo + '/* ' + dir + '\n';
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
    cmd += 'ln -s ' + repo + '/node-querystring `pwd`/components/visionmedia-node-querystring\n';
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

var startDrone = function (exec) {
    if (!queue.length || next) {
        return;
    }
    var data = queue.shift();
    debug('starting drone');
    debug(data);
    next = setTimeout(function () {
        debug('drone start timed out');
        debug(data);
        startDrone(exec);
    }, WAITS);
    var id = data.id;
    fs.mkdir(p(id), function (err) {
        var child = spawn('bash');
        var ripo = repo(data.repo);
        child.id = id;
        child.stdout.pipe(logger(ripo));
        child.stderr.pipe(logger(ripo, 'error'));
        child.stdin.write(cmdCD(DRONES_DIR)); //TODO
        child.stdin.write(cmdClone(data.repo, id));
        child.stdin.write(cmdCD(id));
        child.stdin.write(cmdNPM());
        child.stdin.write(cmdRDM());
        child.stdin.write(cmdComp());
        child.stdin.write(cmdKill(child.pid));
        child.on('exit', function () {
            debug('event:exit existing helper process');
        });
        child.on('close', function () {
            debug('event:close closing helper process');
            //process.execArgv.push('--debug=5005');
            var child = fork(nodePath(data.main), {
                cwd: appDir(id),
                silent: true,
                env: {
                    NODE_ENV: process.env.NODE_ENV,
                    SU_PASS: process.env.SU_PASS,
                    DEBUG: process.env.DEBUG
                }
            });
            var domain = data.domain;
            debug('send:self domain ' + data.domain);
            child.stdout.pipe(logger(ripo));
            child.stderr.pipe(logger(ripo, 'error'));
            child.on('message', function (data) {
                debug('message:' + data.event);
                debug(data);
                var address;
                switch (data.event) {
                    case 'drone started':
                        address = data.address;
                        debug('emitting drone started : ' + id);
                        exec.server.emit('drone started', {
                            id: id,
                            port: address.port
                        });
                        child.port = address.port;
                        /*child.send({
                            event: 'self domain',
                            domain: domain
                        });*/
                        drones.push(child);
                        debug('fired:drone started id:' + id + ' port:' + address.port);
                        clearTimeout(next);
                        next = null;
                        startDrone(exec);
                        break;
                    case 'drone config':
                        exec.server.emit('drone config', {
                            id: data.id,
                            name: data.name
                        });
                        debug('fired:drone config id:' + data.id + ' name:' + data.name);
                        configs[data.id] = child;
                        break;
                }
            });
            child.on('error', function(reason) {
                debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<' + reason);
            });
            child.on('exit', function (code, signal) {
                debug('event:exit child: ' + id);
                var index = drones.indexOf(child);
                if (index === -1) {
                    return;
                }
                drones.splice(index, 1);
            });
            child.on('close', function (code, signal) {
                debug('event:close child: ' + id);
                exec.server.emit('drone stopped', {
                    id: id
                });
                debug('fired:drone stopped drone:' + id);
            });
            child.id = id;
            child.dom = data.domain;
        });
        //child.stdin.write(cmdStart(data.main));
    });
};

module.exports = function (exec) {
    debug('events registering');
    exec.server.on('self up', function () {
        debug('event:self up');
        drones.forEach(function (drone) {
            debug('killing drone:' + drone.id);
            drone.kill('SIGKILL');
        });
        /*process.send({
            event: 'self up'
        });*/
        debug('send:self up');
    });
    /*exec.server.on('drones list', function () {
     exec.server.emit('drones listed', drones);
     });*/
    exec.server.on('drone start', function (data) {
        debug('event:drone start');
        debug(data);
        queue.push(data);
        startDrone(exec);
    });
    exec.server.on('drone stop', function (data) {
        debug('event:drone stop');
        debug(data);
        var i, drone,
            id = data.id,
            length = drones.length;
        for (i = 0; i < length; i++) {
            drone = drones[i];
            if (drone.id === id) {
                debug('killing drone : ' + id);
                drone.kill('SIGKILL');
                break;
            }
        }
    });
    exec.server.on('drone init', function (data) {
        debug('event:drone init');
        debug(data);
        drones.every(function (drone) {
            if (drone.id === data.drone) {
                data.event = 'drone init';
                //drone.send(data);
                debug('send:drone init to pid:' + drone.pid);
                return false;
            }
            return true;
        });
    });
    exec.server.on('drone joined', function (data) {
        debug('event:drone joined');
        debug(data);
        if (joinedAt >= data.at) {
            debug('skipping outdated drone joined event');
            return;
        }
        joinedAt = data.at;
        drones.forEach(function (drone) {
            /*drone.send({
                event: 'drone joined',
                drone: data
            });*/
            debug('send:drone joined');
        });
    });
    exec.server.on('drone left', function (data) {
        debug('event:drone left');
        debug(data);
        if (joinedAt >= data.at) {
            debug('skipping outdated drone left event');
            return;
        }
        joinedAt = data.at;
        drones.forEach(function (drone) {
            /*drone.send({
                event: 'drone left',
                drone: data
            });*/
            debug('send:drone left');
        });
    });
    exec.server.on('drone configed', function (data) {
        debug('drone configed : ' + JSON.stringify(data));
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
    debug('reconnecting hub');
    var domain, o = {};
    drones.forEach(function (drone) {
        domain = o[drone.dom] || (o[drone.dom] = []);
        domain.push({
            id: drone.id,
            port: drone.port
        });
    });
    exec.server.emit('self drones', o);
    debug('fired:self drones');
    debug(o);
};

// lb.autos.serandives.com
// *.autos.serandives.com

