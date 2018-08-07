(() => {
'use strict';

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


let redis   = require('redis');
let bluebird= require('bluebird');
let slugify = require('slugify');
let md      = require('./markdown.js');
let log     = require('./log.js');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let redisNews = redis.createClient({prefix: 'news:'});
redisNews.select('0');

function slug(txt) {
    return slugify(txt, {lower: true, remove: /[*+~.()'"!:@]/g});
}

redisNews.expandWithScores = arr => {
    let result = [];
    for (let i=0, j=0; i < arr.length; i+=2, j++) {
      result[j] = [arr[i], arr[i+1]];
    }
    return result;
};

redisNews.get('prototypeVersion', (err, result) => {
  switch(result) {
    case null: // Clear database
      log.info('news-db: set prototypeVersion to ' + prototypeVersion);
      redisNews.set('prototypeVersion', prototypeVersion);
      break;
    case prototypeVersion.toString(): // Bingo
      log.debug('news-db: prototypeVersion = ' + result);
      break;
    default:
      log.error('news-db: not compatible, prototypeVersion = ' + result);
      throw 'Fatal Error: Database\'s prototype version is not compatible.';
  }
});

function formatDate(date) {
  const month = ['January', 'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return month[date.getUTCMonth()] + ' ' + date.getUTCDate() + ', ' + date.getUTCFullYear();
}

exports.slug = (title, timestamp) => {
  if (!timestamp) {
    return slug(title);
  } else {
    let prefix = timestamp % 9999;
    return `${prefix}-${slug(title)}`
  }
};

exports.render = stru => {
  if(!stru) return null;
  let date = new Date();
  let xstru = stru;
  date.setTime(xstru.timestamp);
  xstru.date = formatDate(date).toUpperCase();
  xstru.htmlcontent = (xstru.content === undefined) ? '' : md.render(xstru.content);
  return xstru;
};

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

// filter(object, index, positiveCount)
// begin start from 1, and undefined will be set to 1.
// maxCount will be not limited, if it has been set to -1.
// doRender is a boolean value.
exports.enum = (begin, maxCount, doRender, filter, callback) => {
  begin = begin? begin : 1;
  filter = filter? filter : () => true;
  redisNews.zrevrange(['items', 0, -1, 'withscores'], (err, idList) => {
    idList = redisNews.expandWithScores(idList);
    let objectList = [];
    let promiseList = [];
    for(let id of idList) {
      promiseList.push((id =>
        new Promise(resolve => exports.get(id[1], doRender, resolve))
        .then(content => objectList.push(content))
        .catch(err => log.error('news-db: list() ' + id[1] + ' ' + err))
      )(id));
    }
    Promise.all(promiseList)
    .then(() => {
      let promiseList = [];
      let contentList = [];
      let positiveCount = 0;
      let index = 0;
      for(let obj of objectList) {
        if(maxCount != -1 && positiveCount-begin+1 >= maxCount) break;
        if(!filter(obj, index++, positiveCount)) continue;
        positiveCount++;
        if(positiveCount >= begin) contentList.push(obj);
      }
      callback(contentList);
    })
    .catch(err => {
      log.error('news-db: list() ' + err);
      callback([]);
    });
  });
};

exports.filters = {
  type(list) {
    return (object, index, positiveCount) => {
      for (let i of list) if(object.type == i) return true;
      return false;
    };
  },
  hasImage() {
    return (object, index, positiveCount) => object.imgThumb !== undefined && object.imgThumb !== '';
  },
  both(a, b) {
    // AND
    return (object, index, positiveCount) => a(object, index, positiveCount) && b(object, index, positiveCount);
  },
  not(a) {
    return (object, index, positiveCount) => !a(object, index, positiveCount);
  },
  either(a, b) {
    // OR, A || B := !( !A && !B )
    return not(and(not(a), not(b)));
  },
};

exports.count = (filter, callback) => exports.enum(1, -1, false, filter, list => callback(list.length));

exports.delete = (id, callback) => {
  exports.revResolve(id, slug => {
    if(!slug)
      callback(false);
    else
      redisNews.multi()
        .del('item:' + id)
        .zrem('items', slug)
        .exec(() => callback(true));
  });
};

exports.put = (news, callback) => {
  exports.delete(news.timestamp, () => {
    redisNews.multi()
      .set('item:' + news.timestamp, JSON.stringify(news))
      .zadd('items', news.timestamp, news.slug)
      .exec(() => callback(true));
  });
};

exports.post = (news, callback) => {
  if(news.title === '') {
    exports.delete(news.timestamp, callback);
  } else {
    exports.slugFix(news.slug, fixedSlug => {
      news.slug = fixedSlug;
      exports.put(news, callback);
    });
  }
};

exports.get = (id, doRender, callback) =>
  redisNews.get('item:' + id, (err, content) => {
    if(content === null) {
      log.error('news-db: get() ' + err);
      callback(null);
      return;
    }
    callback(doRender? exports.render(JSON.parse(content)) : JSON.parse(content));
  })
;

exports.resolve = (slug, callback) => {
  redisNews.zscore('items', slug, (err, id) => callback(id));
};

exports.revResolve = (id, callback) => {
  exports.get(id, false, content => {
    if(!content)
      callback(null);
    else
      callback(content.slug);
  });
};

exports.has = (slug, callback) => {
  exports.resolve(slug, id => callback(id !== null));
};

exports.slugFix = (slug, callback) => {
  function iterator(slug, suffix, callback){
    let fixedSlug = suffix > 0 ? slug + '-' + suffix : slug;
    exports.has(fixedSlug, exist => {
      log.debug('conflict: ' + fixedSlug + ' ' + exist);
      if(exist)
        iterator(slug, suffix + 1, callback);
      else
        callback(fixedSlug);
    });
  }
  iterator(slug, 0, callback);
};

})();
