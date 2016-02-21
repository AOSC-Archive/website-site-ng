/* ---- Router ---- */
(function(){

var express = require('express');
var router = express.Router();

var yaml    = require('js-yaml');
var fs      = require('fs');
var md      = require('markdown').markdown;
var log     = require('./log.js');
var newsdb  = require('./news-db.js');
var slug    = require('slug');
slug.defaults.mode = "rfc3986";

const CONTENTS_DIR    = 'contents';

function readYAML(yamlfile) {
  return yaml.safeLoad(fs.readFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', 'utf8'));
}

function writeYAML(yamlfile, data) {
  return fs.writeFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', yaml.safeDump(data));
}

// - / or /index
router.get( /(^\/index$|^\/$)/ , function(req, res) {
  var pj = readYAML('projects');
  newsdb.list(0, 8, function(result) {
    res.render('index', {'params' : {
      'items' : result,
      'projects' : pj
    }});
  })
});

router.get('/news' , function(req, res) {
  newsdb.list(req.query.begin, req.query.maxcount, function(result) {
    res.render("news", {"params" : {
      "begin" : req.query.begin,
      "maxcount" : req.query.maxcount,
      "items" : result,
    }});
  });
});

router.get('/news/:slug' , function(req, res) {
  newsdb.get(req.params.slug, function(result) {
    res.render("news-view", {"params" : result});
  });
});

router.get('/community' , function(req, res) {
  // var bct = readYAML('news');
  // for(var i_ct in bct) {
  //   bct[i_ct].date = formatDate(bct[i_ct].date).toUpperCase();
  //   var _ct = bct[i_ct].content;
  //   for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
  // }
  res.render('community', {'params' : {
  }});
});

router.get( '/projects' , function(req, res) {
  var prj = readYAML('projects');
  var dto = readYAML('distro');
  res.render('projects', {'params' : {
    'distro' : dto,
    'project' : prj
  }});
});

router.get( '/about' , function(req, res) {
  var abt = readYAML('about');
  var ct = readYAML('contacts');
  res.render('about', {'params' : {
    'about' : abt,
    'contacts' : ct
  }});
});

router.get( '/distro' , function(req, res) {
  var dto = readYAML('distro');
  res.render('distro', {'params' : {
    'distro' : dto
  }});
});

router.get( '/os-download', function(req, res) {
  // var dto = readYAML('distro');
  // var nws = readYAML('news').slice(0,9);
  // res.render('osdownload', {'params' : {
  //   'distro' : dto,
  //   'news' : nws
  // }});
  res.render('os-download', {'params' : {}});
});

// APIs
router.get( '/api/splashes', function(req, res) {
  var splashes = readYAML('api/splashes');
  res.send({'splashes': splashes[Math.floor(Math.random() * splashes.length)]});
});

module.exports = router;

})();
