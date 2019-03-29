(() => {
'use strict';

let redis   = require('redis');
let bluebird= require('bluebird');
let crypto  = require('crypto');
let log     = require('./log.js');

const TICKET_LENGTH = 6;
const TICKET_ACCEPT_TIMEOUT = 60 * 5;
const TICKET_EXPIRE_TIMEOUT = 60 * 15;

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let redisAuth = redis.createClient({prefix: 'auth:'});
redisAuth.select('0');

exports.getStatus = (ticket, callback) => {
  if(!ticket) return callback({status: 'INVALID', ttl: -1});
  redisAuth.get(ticket, (err, result) => {
    if(result === null) return callback({status: 'INVALID', ttl: -1});
    redisAuth.ttl(ticket, (err, resultTTL) => callback({status: result, ttl: resultTTL}));
  });
};

exports.TICKET_ACCEPT_TIMEOUT = TICKET_ACCEPT_TIMEOUT;

exports.TICKET_EXPIRE_TIMEOUT = TICKET_EXPIRE_TIMEOUT;

exports.createListener = (ticket, resolve, callback) => {
  let session = redis.createClient();
  session.on('message', (channel, message) => {
    log.debug('ticket: received ' + channel + ': ' + message);
    switch(message.toLowerCase()) {
      case 'accept':
        resolve(ticket);
        // Fall through
      case 'break':
        session.unsubscribe();
        session.quit();
        break;
    }
  });
  session.on('subscribe', (channel, count) => {
    log.debug('ticket: pending for ' + channel + '...');
    callback(ticket);
  });
  session.subscribe('auth:' + ticket);
  setTimeout(() => redisAuth.publish('auth:' + ticket, 'break'),
    TICKET_ACCEPT_TIMEOUT * 1000
  );
};

exports.destroyTicket = (ticket, callback) => redisAuth.del(ticket, (err, result) => callback(result));

exports.renewTicket = (ticket, callback) => redisAuth.setex(ticket, TICKET_EXPIRE_TIMEOUT, 'ACCEPTED', (err, result) => callback(result));

exports.createTicket = callback => {
  function createRandomString(callback) {
    crypto.randomBytes(TICKET_LENGTH, (err, buf) => {
      if (err) throw err;
      callback(buf.toString('base64'));
    });
  }
  function has(ticket, callback) {
    exports.getStatus(ticket, result => callback(result.status !== 'INVALID'));
  }
  function generateTicket(callback) {
    function iterator(ticket, callback){
      has(ticket, exist => {
        if(exist) {
          createRandomString(result => {
            ticket = result;
            iterator(ticket, callback);
          });
        }
        else
          callback(ticket);
      });
    }
    createRandomString(ticket => iterator(ticket, callback));
  }
  generateTicket(ticket => {
    redisAuth.setex(ticket, TICKET_ACCEPT_TIMEOUT, 'PENDING');
    exports.createListener(ticket, () => {
      redisAuth.setex(ticket, TICKET_EXPIRE_TIMEOUT, 'ACCEPTED');
      log.info('ticket: accept ' + ticket);
    }, () => callback(ticket));
  });
};

})();
