exports.isDebug = true;
exports.debug = function(s) {if(exports.isDebug) console.info('\x1b[0;37m' + s + '\x1b[0m');};
exports.info = function(s) {console.info('\x1b[1;37m' + s + '\x1b[0m');};
exports.success = function(s) {if(exports.isDebug) console.info('\x1b[0;32m' + s + '\x1b[0m');};
exports.warn = function(s) {console.warn('\x1b[0;33m' + s + '\x1b[0m');};
exports.error = function(s) {console.error('\x1b[0;31m' + s + '\x1b[0m');};
