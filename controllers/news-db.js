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

// filterCallback(object, index, targetCount)
// maxCount will be not limited, if it has been set to -1.
// doRender is a boolean value.
exports.enum = function(begin, maxCount, doRender, filterCallback, callback) {
  begin = begin? begin : 0;
  filterCallback = filterCallback? filterCallback : function(){return true;};
  redisNews.zrevrange(["items", begin, -1, 'withscores'], function(err, idList) {
    idList = redisNews.expandWithScores(idList);
    var objectList = [];
    var promiseList = [];
    for(var index in idList) {
      promiseList[index] = (function(index) {
        return new Promise(function(resolve, reject) {
          exports.get(idList[index][1], doRender, resolve);
        }).then(function(content) {
          objectList[index] = content;
        }).catch(function(err) {
          log.error("news-db: list() " + idList[index][1] + " " + err);
        });
      })(index);
    }
    Promise.all(promiseList)
    .then(function() {
      var promiseList = [];
      var contentList = [];
      var renderTargetCount = 0;
      for(var index in objectList) {
        if(maxCount != -1 && renderTargetCount >= maxCount) break;
        if(!filterCallback(objectList[index], index, renderTargetCount)) continue;
        renderTargetCount++;
        contentList.push(objectList[index]);
      }
      callback(contentList);
    })
    .catch(function(err) {
      log.error("news-db: list() " + err);
      callback([]);
    });
  });
};

exports.filters = {
  type: function(list) {
    return function(object, index, targetCount) {
      for (var i in list) {
        if(object.type == list[i]) {
          return true;
        }
      }
      return false;
    };
  },
  hasImage: function() {
    return function(object, index, targetCount) {
      return object.imgThumb != undefined && object.imgThumb != '';
    };
  },
  both: function(a, b) {
    // AND
    return function(object, index, targetCount) {
      return a(object, index, targetCount) && b(object, index, targetCount);
    };
  },
  not: function(a) {
    return function(object, index, targetCount) {
      return !a(object, index, targetCount);
    };
  },
  either: function(a, b) {
    // OR, A || B := !( !A && !B )
    return not(and(not(a), not(b)));
  },
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

exports.get = function(id, doRender, callback) {
  redisNews.get("item:" + id, function(err, content) {
    if(content == null) {
      log.error("news-db: get() " + err);
      callback(null);
      return;
    }
    callback(doRender? exports.render(JSON.parse(content)) : JSON.parse(content));
  });
};

exports.resolve = function(slug, callback) {
  redisNews.zscore("items", slug, function(err, id) {
    callback(id);
  });
};

exports.has = function(slug, callback) {
  exports.resolve(slug, function(id) {
    callback(id != null);
  });
};

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
