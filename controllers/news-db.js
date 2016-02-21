(function(){

var redis   = require('redis');
var bluebird= require('bluebird');
var slug    = require('slug');
var md      = require('markdown').markdown;
var log     = require('./log.js');

slug.defaults.mode = "rfc3986";
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

var redisNews = redis.createClient({prefix: "news:"});
redisNews.select("0");

function formatDate(date) {
  var month = ['January', 'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return month[date.getUTCMonth()] + ' '
               + date.getUTCDate() + ', '
               + date.getUTCFullYear();
}

exports.render = function(news) {
  var date = new Date();
  var anews = news;
  date.setTime(anews.timestamp);
  anews.date = formatDate(date).toUpperCase();
  anews.htmlcontent = anews.content == undefined? "" : md.toHTML(anews.content);
  return anews;
};

exports.list = function(begin, maxcount, callback) {
  begin = begin? begin : 0;
  maxcount = maxcount? maxcount : 10;
  maxcount = maxcount > 100? 100 : maxcount;
  maxcount = maxcount < 1? 1 : maxcount;
  redisNews.zrevrange(["items", begin, -1], function(err, result) {
    for(var index in result) {
      result[index] = exports.render(JSON.parse(result[index]));
    }
    callback(result);
  });
};

exports.put = function(news, callback) {
  redisNews.multi()
    .set("item:" + news.slug, news.timestamp)
    .zadd("items", news.timestamp, JSON.stringify(news))
    .exec(callback);
};

exports.post = function(news, callback) {
  exports.slugFix(news.slug, function(fixedSlug) {
    news.slug = fixedSlug;
    exports.put(news, callback);
  });
};

exports.getRaw = function(slug, callback) {
  redisNews.get("item:" + slug, function(err, result) {
    if(result == null) {callback(null); return;}
    redisNews.zrangebyscore(["items", result, result], function(err, result) {
      if(result == null) {callback(null); return;}
      callback(result);
    });
  });
};

exports.get = function(slug, callback) {
  exports.getRaw(slug, function(result) {
    if(result == null)
      callback(null);
    else
      callback(exports.render(JSON.parse(result[0])));
  });
};

exports.has = function(slug, callback) {
  exports.getRaw(slug, function(result) {
    callback(result != null);
  });
}

exports.slugFix = function(slug, callback) {
  function iterator(slug, suffix, callback){
    fixedSlug = suffix>0? slug + "-" + suffix : slug;
    exports.has(fixedSlug, function(exist) {
      log.debug("conflict: " + fixedSlug + " " + exist);
      if(exist)
        iterator(slug, suffix + 1, callback);
      else
        callback(fixedSlug);
    });
  }
  iterator(slug, 0, callback);
};

})();
