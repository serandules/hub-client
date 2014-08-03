var uuid = require('node-uuid');
var fs = require('fs');
var logger = require('logger');
var rimraf = require('rimraf');
var spawn = require('child_process').spawn;

var DRONES_DIR = process.env.DRONES_DIR || __dirname;

console.log(DRONES_DIR);

var drones = [];

var p = function (id) {
    return DRONES_DIR + '/' + id;
};

rimraf.sync(DRONES_DIR);
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

module.exports = function (exec) {
    exec.server.on('drone list', function () {
        exec.server.emit('drone list', drones);
    });
    exec.server.on('drone start', function (data) {
        console.log('drone start');
        console.log(data);
        var id = data.id;
        var log = logger(id);
        var error = logger(id, 'error');
        fs.mkdir(p(id), function (err) {
            var child = spawn('bash');
            child.id = id;
            child.stdout.pipe(log);
            child.stderr.pipe(error);
            child.stdin.write(cmdCD(DRONES_DIR));
            child.stdin.write(cmdClone(data.repo, id));
            child.stdin.write(cmdCD(id));
            child.stdin.write(cmdStart(data.main));
            child.on('exit', function (code, signal) {
                console.log('exit child : ' + id);
                /*exec.server.emit('drone stop', {
                 id: id
                 });*/
            });
            child.on('close', function (code, signal) {
                console.log('close child : ' + id);
                exec.server.emit('drone stop', {
                    id: id
                });
            });
            drones.push(child);
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
};