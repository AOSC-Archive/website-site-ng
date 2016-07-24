(function() {

var redis   = require('redis');
var bluebird= require('bluebird');
var crypto  = require('crypto');
var log     = require('./log.js');

const TICKET_LENGTH = 6;
const TICKET_ACCEPT_TIMEOUT = 60 * 5;
const TICKET_EXPIRE_TIMEOUT = 60 * 15;

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

var redisAuth = redis.createClient({prefix: "auth:"});
redisAuth.select("0");

exports.getStatus = function(ticket, callback) {
  if(!ticket) return callback({status: "INVALID", ttl: -1});
  redisAuth.get(ticket, function(err, result) {
    if(result == null) return callback({status: "INVALID", ttl: -1});
    redisAuth.ttl(ticket, function(err, resultTTL) {
      callback({status: result, ttl: resultTTL});
    });
  });
};

exports.TICKET_ACCEPT_TIMEOUT = TICKET_ACCEPT_TIMEOUT;

exports.TICKET_EXPIRE_TIMEOUT = TICKET_EXPIRE_TIMEOUT;

exports.createListener = function(ticket, resolve, callback) {
  var session = redis.createClient();
  session.on("message", function (channel, message) {
    log.debug("ticket: received " + channel + ": " + message);
    switch(message.toLowerCase()) {
      case 'accept':
        resolve(ticket);
      case 'break':
        session.unsubscribe();
        session.quit();
        break;
    }
  });
  session.on("subscribe", function (channel, count) {
    log.debug("ticket: pending for " + channel + "...");
    callback(ticket);
  });
  session.subscribe("auth:" + ticket);
  setTimeout(function() {
    redisAuth.publish("auth:" + ticket, "break");
  }, TICKET_ACCEPT_TIMEOUT * 1000);
};

exports.destroyTicket = function(ticket, callback) {
  redisAuth.del(ticket, function(err, result) {
    callback(result);
  });
};

exports.createTicket = function(callback) {
  function createRandomString(callback) {
    crypto.randomBytes(TICKET_LENGTH, function(err, buf) {
      if (err) throw err;
      callback(buf.toString('base64'));
    });
  };
  function has(ticket, callback) {
    exports.getStatus(ticket, function(result) {
      callback(result.status != 'INVALID');
    });
  }
  function generateTicket(callback) {
    function iterator(ticket, callback){
      has(ticket, function(exist) {
        if(exist) {
          createRandomString(function(result) {
            ticket = result;
          });
          iterator(ticket, callback);
        }
        else
          callback(ticket);
      });
    }
    createRandomString(function(ticket) {
      iterator(ticket, callback);
    });
  };
  generateTicket(function(ticket) {
    redisAuth.setex(ticket, TICKET_ACCEPT_TIMEOUT, 'PENDING');
    exports.createListener(ticket, function() {
      redisAuth.setex(ticket, TICKET_EXPIRE_TIMEOUT, 'ACCEPTED');
      log.info("ticket: accept " + ticket);
    }, function() {
      callback(ticket);
    });
  });
};

})();
