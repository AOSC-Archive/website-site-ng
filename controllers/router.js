/* ---- Router ---- */
var yaml    = require('js-yaml');
var fs      = require('fs');
var md      = require('markdown').markdown;
var log     = require('./log.js');

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

function sayOops(req, res, err) {
  res.status(500).render('err/500', {'params' : {
    'url' : req.originalUrl,
    'err' : err
  }});
}

exports.DoBoom = function(app) {
  // - / or /index
  app.get( /(^\/index$|^\/$)/ , function(req, res) {
    try{
      var bc = readYAML('news').slice(0,9);
      var pj = readYAML('projects');
      for(var i_ct in bc) {
        bc[i_ct].date = formatDate(bc[i_ct].date).toUpperCase();
        var _ct = bc[i_ct].content;
        for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
      }
      res.render('index', {'params' : {
        'broadcast' : bc,
        'projects' : pj
      }});
    }catch(err){sayOops(req, res, err);}
  });

  // - /news
  app.get('/news' , function(req, res) {
      var bct = readYAML('old-news');
      for(var i_ct in bct) {
        bct[i_ct].date = formatDate(bct[i_ct].date).toUpperCase();
        var _ct = bct[i_ct].content;
        for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
      }
      res.render('news', {'params' : {
        'broadcast' : bct
      }});
  });

  // - /news-post
  app.get('/news-post' , function(req, res) {
    try{
      res.render('news-post', {'params' : {
        'type' : "",
        'title' : "",
        'date' : formatDate(new Date()).toUpperCase(),
        'content' :
"\
# Example\n\
## Example\n\
### Example\n\
#### Example\n\
##### Example\n\
###### Example\n\n\
foo\nbar\n\n\
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n\
- a2\n\
- fsck\n\n\
Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n\
1. a2\n\
2. fsck\n\n\
Lorem ipsum dolor sit amet, `consectetur adipisicing elit`, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. \
*Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.* \
**Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.** \
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n\
    - [x] yep\n\
    - [ ] yep\n\
",
        'htmlcontent' : "The content shows here.",
      }});
    }catch(err){sayOops(req, res, err);}
  });
  app.post('/news-post' , function(req, res) {
      res.render('news-post', {'params' : {
        'type' : req.body.type,
        'title' : req.body.title,
        'date' : formatDate(new Date()).toUpperCase(),
        'content' : req.body.content,
        'htmlcontent' : md.toHTML(req.body.content),
      }});
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
