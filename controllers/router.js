/* ---- Router ---- */
var yaml    = require('js-yaml');
var fs      = require('fs');
var md      = require('markdown').markdown;
var log     = require('./log.js');
var newsdb   = require('./news-db.js');
var slug    = require('slug');
slug.defaults.mode = "rfc3986";

var CONTENTS_DIR    = 'contents';

function readYAML(yamlfile) {
  return yaml.safeLoad(fs.readFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', 'utf8'));
}

function writeYAML(yamlfile, data) {
  return fs.writeFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', yaml.safeDump(data));
}

function sayOops(req, res, err) {
  res.status(500).send(err);
}

exports.DoBoom = function(app) {
  // - / or /index
  app.get( /(^\/index$|^\/$)/ , function(req, res) {
    var pj = readYAML('projects');
    newsdb.list(0, 8, function(result) {
      res.render('index', {'params' : {
        'items' : result,
        'projects' : pj
      }});
    })
  });

  // - /news
  app.get('/news' , function(req, res) {
    newsdb.list(req.query.begin, req.query.maxcount, function(result) {
      res.render("news", {"params" : {
        "begin" : req.query.begin,
        "maxcount" : req.query.maxcount,
        "items" : result,
      }});
    });
  });

  app.get('/news/:slug' , function(req, res) {
    newsdb.get(req.params.slug, function(result) {
      res.render("news-view", {"params" : result});
    });
  });

  // - /admin/news-post
  app.all('/admin/news-post' , function(req, res) {
    if(req.body.action == "post") {
      log.debug("redis: post news " + req.body.title);
      newsdb.post({
        "title" : req.body.title,
        "type" : req.body.type,
        "content" : req.body.content,
        "timestamp" : new Date().getTime(),
        "slug" : slug(req.body.title),
      }, function() {
        res.redirect('/news');
      });
    } else {
      var news = {
        "title" : (req.body.title? req.body.title : "Lovely Title"),
        "type" : (req.body.type? req.body.type : "news"),
        "content" : req.body.content,
        "timestamp" : new Date().getTime(),
        "previewed" : (req.body.action == "preview"? true : false),
      };
      res.render('news-post', {'params' : newsdb.render(news)});
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
