var fs = require('fs');

var LOGS_DIR = process.env.LOGS_DIR || '/tmp/logs';

if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR);
}

var p = function (id) {
    return LOGS_DIR + '/' + id + '.log';
};

var build = function (log, args) {
    args = Array.prototype.slice.call(args);
    var index = 1;
    var o = args[0];
    o = (typeof o === 'string' || o instanceof String) ? o : (JSON.stringify(o) || '');
    o = o.replace(/%([a-z%])/g, function (match, format) {
        // if we encounter an escaped % then don't increase the array index
        if (match === '%%') {
            return match;
        }
        var o = args[index++];
        var out = '';
        if (match === '%e') {
            out += '\n';
            o = o.stack || o;
        }
        out += (typeof o === 'string' || o instanceof String) ? o : JSON.stringify(o);
        return out;
    });
    return log.name + ':' + o;
};

var time = function(message) {
  return new Date().toISOString() + ':' + message;
};

var Log = function (name) {
    this.name = name;
};

Log.prototype.debug = function () {
    console.info(time('debug:' + build(this, arguments)));
};

Log.prototype.info = function () {
    console.info(time('info:' + build(this, arguments)));
};

Log.prototype.warn = function () {
    console.info(time('warn:' + build(this, arguments)));
};

Log.prototype.error = function () {
    console.info(time('error:' + build(this, arguments)));
};

Log.prototype.fatal = function (err) {
    console.info(time('fatal:' + build(this, arguments)));
};

Log.prototype.trace = function (err) {
    console.log(err.stack);
};


module.exports = function (name) {
    return new Log(name);
    /*switch (type) {
     case 'error':
     debug('error stream : ' + p(id + '-errors'));
     return fs.createWriteStream(p(id + '-errors'));
     default:
     debug('console stream : ' + p(id));
     return fs.createWriteStream(p(id));
     }*/
};