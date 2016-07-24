(function(){

/*
 * When you modify the prototype of database,
 * you MUST increase this value to ensure it not compatible with the old one.
 */

const prototypeVersion = 3;

/*
  Database: 0
    - [prefix]news
      - [k]prototypeVersion
      - [z]items
        - slug => [score]timestamp
        - slug => [score]timestamp
        - slug => [score]timestamp
        - ...
      - [prefix]item
        - [k]timestamp = {}
        - [k]timestamp = {}
        - [k]timestamp = {}
        - [k]...

  [k] Key
  [z] Sorted List
  [prefix] For example, 'bar' in a prefix 'foo' is 'foo:bar' exactly.

*/


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

redisNews.expandWithScores = function(arr){
    var result = [];
    for (var i=0, j=0; i < arr.length; i+=2, j++) {
      result[j] = [arr[i], arr[i+1]];
    }
    return result;
};

redisNews.get("prototypeVersion", function(err, result) {
  switch(result) {
    case null: // Clear database
      log.info("news-db: set prototypeVersion to " + prototypeVersion);
      redisNews.set("prototypeVersion", prototypeVersion);
      break;
    case prototypeVersion.toString(): // Bingo
      log.debug("news-db: prototypeVersion = " + result);
      break;
    default:
      log.error("news-db: not compatible, prototypeVersion = " + result);
      throw "Fatal Error: Database's prototype version is not compatible.";
  }
});

function formatDate(date) {
  var month = ['January', 'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return month[date.getUTCMonth()] + ' '
               + date.getUTCDate() + ', '
               + date.getUTCFullYear();
}

exports.slug = slug;

exports.render = function(stru) {
  if(!stru) return null;
  var date = new Date();
  var xstru = stru;
  date.setTime(xstru.timestamp);
  xstru.date = formatDate(date).toUpperCase();
  xstru.htmlcontent = xstru.content == undefined? "" : md.toHTML(xstru.content);
  return xstru;
};

exports.list = function(begin, maxcount, callback, filterCallback) {
  begin = begin? begin : 0;
  maxcount = maxcount? maxcount : 10;
  maxcount = maxcount > 15? 15 : maxcount;
  maxcount = maxcount < 1? 1 : maxcount;
  filterCallback = filterCallback? filterCallback : function(){return true;};
  redisNews.zrevrange(["items", begin, -1, 'withscores'], function(err, idList) {
    idList = redisNews.expandWithScores(idList);
    var promiseList = [];
    var contentList = [];
    var renderTargetCount = 0;
    for(var index in idList) {
      if(!filterCallback(idList[index], index, renderTargetCount)) continue;
      renderTargetCount++;
      if(renderTargetCount > maxcount) break;
      promiseList[index] = (function(index) {
        return redisNews.getAsync("item:" + idList[index][1]).then(function(content) {
          contentList[index] = exports.render(JSON.parse(content));
        });
      })(index);
    }
    Promise.all(promiseList)
    .then(function() {
      callback(contentList);
    })
    .catch(function(err) {
      log.error("news-db: list() " + err);
      callback({});
    });
  });
};

exports.put = function(news, callback) {
  redisNews.multi()
    .set("item:" + news.timestamp, JSON.stringify(news))
    .zadd("items", news.timestamp, news.slug)
    .exec(callback);
};

exports.post = function(news, callback) {
  exports.slugFix(news.slug, function(fixedSlug) {
    news.slug = fixedSlug;
    exports.put(news, callback);
  });
};

exports.getRaw = function(slug, callback) {
  redisNews.zscore("items", slug, function(err, id) {
    if(id == null) {callback(null); return;}
    redisNews.get("item:" + id, function(err, content) {
      if(content == null) {callback(null); return;}
      callback(content);
    });
  });
};

exports.get = function(slug, callback) {
  exports.getRaw(slug, function(content) {
    if(content == null)
      callback(null);
    else
      callback(exports.render(JSON.parse(content)));
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
