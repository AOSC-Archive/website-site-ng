/* ---- Router ---- */
var yaml    = require('js-yaml');
var fs      = require('fs');
var md      = require('markdown').markdown;
var log     = require('./log.js');
var slug    = require('slug');
var redis   = require('redis');
var bluebird= require('bluebird');
slug.defaults.mode = "rfc3986";
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

var redisNews = redis.createClient({prefix: "news:"});
redisNews.select("0");

var CONTENTS_DIR    = 'contents';

function formatDate(date) {
  var month = ['January', 'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return month[date.getUTCMonth()] + ' '
               + date.getUTCDate() + ', '
               + date.getUTCFullYear();
}

function readYAML(yamlfile) {
  return yaml.safeLoad(fs.readFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', 'utf8'));
}

function writeYAML(yamlfile, data) {
  return fs.writeFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', yaml.safeDump(data));
}

function sayOops(req, res, err) {
  res.status(500).send(err);
}

function getAllNewsInList(begin, maxcount, callback) {
  redisNews.zrevrange(["items", begin, -1], function(err, result) {
    for(var index in result) {
      result[index] = JSON.parse(result[index]);
      var date = new Date();
      date.setTime(result[index].timestamp);
      result[index].date = formatDate(date).toUpperCase();
      result[index].htmlcontent = md.toHTML(result[index].content);
    }
    callback(err, result);
  });
}

function putNewsByTimestamp(news, callback) {
  redisNews.multi()
    .set("item:" + news.slug, news.timestamp)
    .zadd("items", news.timestamp, JSON.stringify(news))
    .exec(callback);
}

function postNewsByTimestamp(news, callback) {
  fixConflictNewsSlug(news.slug, function(fixedSlug) {
    news.slug = fixedSlug;
    putNewsByTimestamp(news, callback);
  });
}

function getNewsBySlug(slug, callback) {
  redisNews.get("item:" + slug, function(err, result) {
    if(result == null) {callback(err, null); return;}
    redisNews.zrangebyscore(["items", result, result], function(err, result) {
      if(result == null) {callback(err, null); return;}
      result = JSON.parse(result[0]);
      var date = new Date();
      date.setTime(result.timestamp);
      result.date = formatDate(date).toUpperCase();
      result.htmlcontent = md.toHTML(result.content);
      callback(err, result);
    });
  });
}

function hasNewsBySlug(slug, callback) {
  redisNews.get("item:" + slug, function(err, result) {
    callback(result != null);
  });
}

function fixConflictNewsSlug(slug, callback) {
  function iterator(slug, suffix, callback){
    fixedSlug = suffix>0? slug + "-" + suffix : slug;
    hasNewsBySlug(fixedSlug, function(exist) {
      log.debug("conflict: " + fixedSlug + " " + exist);
      if(exist)
        iterator(slug, suffix + 1, callback);
      else
        callback(fixedSlug);
    });
  }
  iterator(slug, 0, callback);
}

exports.DoBoom = function(app) {
  // - / or /index
  app.get( /(^\/index$|^\/$)/ , function(req, res) {
    var pj = readYAML('projects');
    getAllNewsInList(0, 8, function(err, result) {
      if(err) throw(err);
      res.render('index', {'params' : {
        'items' : result,
        'projects' : pj
      }});
    })
  });

  // - /news
  app.get('/news' , function(req, res) {
    var begin = req.query.begin? req.query.begin : 0;
    var maxcount = req.query.maxcount? req.query.maxcount : 10;
    maxcount = maxcount > 100? 100 : maxcount;
    maxcount = maxcount < 1? 1 : maxcount;
    getAllNewsInList(begin, maxcount, function(err, result) {
      if(err) throw(err);
      res.render("news", {"params" : {
        "begin" : begin,
        "maxcount" : maxcount,
        "items" : result,
      }});
    });
  });

  app.get('/news/:slug' , function(req, res) {
    getNewsBySlug(req.params.slug, function(err, result) {
      if(err) throw(err);
      res.render("news-view", {"params" : result});
    });
  });

  // - /api/news-db-upgrade
  app.get('/api/news-db-upgrade' , function(req, res) {
    var bct = readYAML('old-news');
    for(var i_ct in bct) {
      bct[i_ct].timestamp = Date.parse(bct[i_ct].date);
      var _ct = bct[i_ct].content;
      bct[i_ct].content = "";
      for(var i_para in _ct)
        bct[i_ct].content = bct[i_ct].content + _ct[i_para] + "\n";
      if(bct[i_ct].content.slice(-2) == "\n\n")
        bct[i_ct].content = bct[i_ct].content.slice(0,-1);
      log.debug(bct[i_ct].title);
      postNewsByTimestamp({
        "title" : bct[i_ct].title,
        "type" : bct[i_ct].type,
        "content" : bct[i_ct].content,
        "timestamp" : bct[i_ct].timestamp,
        "slug" : slug(bct[i_ct].title),
      });
    }
    res.send('done');
  });

  // - /admin/news-post
  app.all('/admin/news-post' , function(req, res) {
    if(req.body.action == "post") {
      log.debug("redis: post news " + req.body.title);
      postNewsByTimestamp({
        "title" : req.body.title,
        "type" : req.body.type,
        "content" : req.body.content,
        "timestamp" : new Date().getTime(),
        "slug" : slug(req.body.title),
      }, function() {
        res.redirect('/news');
      });
    } else {
      res.render('news-post', {'params' : {
        "title" : (req.body.title? req.body.title : "Lovely Title"),
        "type" : (req.body.type? req.body.type : "news"),
        "content" : req.body.content,
        "htmlcontent" : (req.body.content? md.toHTML(req.body.content) : ""),
        "previewed" : (req.body.action == "preview"? true : false),
        "date" : formatDate(new Date()).toUpperCase(),
      }});
    }
  });

  // - /community
  app.get('/community' , function(req, res) {
    try{
      // var bct = readYAML('news');
      // for(var i_ct in bct) {
      //   bct[i_ct].date = formatDate(bct[i_ct].date).toUpperCase();
      //   var _ct = bct[i_ct].content;
      //   for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
      // }
      res.render('community', {'params' : {
      }});
    }catch(err){sayOops(req, res, err);}
  });

  // - /projects
  app.get( '/projects' , function(req, res) {
    try{
      var prj = readYAML('projects');
      var dto = readYAML('distro');
      res.render('projects', {'params' : {
        'distro' : dto,
        'project' : prj
      }});
    }catch(err){sayOops(req, res, err);}
  });

  // - /about
  app.get( '/about' , function(req, res) {
    try{
      var abt = readYAML('about');
      var ct = readYAML('contacts');
      res.render('about', {'params' : {
        'about' : abt,
        'contacts' : ct
      }});
    }catch(err){sayOops(req, res, err);}
  });

  // - /distro
  app.get( '/distro' , function(req, res) {
    try{
      var dto = readYAML('distro');
      res.render('distro', {'params' : {
        'distro' : dto
      }});
    }catch(err){sayOops(req, res, err);}
  });

  // - /osdownload
  app.get( '/os-download', function(req, res) {
    try{
      // var dto = readYAML('distro');
      // var nws = readYAML('news').slice(0,9);
      // res.render('osdownload', {'params' : {
      //   'distro' : dto,
      //   'news' : nws
      // }});
      res.render('os-download', {'params' : {
      }});
    }catch(err){sayOops(req, res, err);}
  });

  //-/work-in-progress
  app.get( '/wip' , function(req, res) {
    try{
      res.render('wip', {'params' : {
        'url' : req.path
      }});
    }catch(err){sayOops(req, res, err);}
  });

  // APIs
  app.get( '/api/splashes', function(req, res) {
    try{
      var splashes = readYAML('api/splashes');

      res.send({'splashes': splashes[Math.floor(Math.random() * splashes.length)]});
    }catch(err){sayOops(req, res, err);}
  });

  // !!! This route MUST be the LAST.
  app.get( '*' , function(req, res) {
    try{
      log.debug('router: Client requested a unreachable URI ' + req.originalUrl);
      res.status(404).render('err/404', {'params' : {
        'url' : req.path
      }});
    }catch(err){sayOops(req, res, err);}
  });
};
