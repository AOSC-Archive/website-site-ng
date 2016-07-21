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
  var srv = readYAML('services');
  newsdb.list(0, 8, function(result) {
    res.render('index', {'params' : {
      'items' : result,
      'projects' : pj,
      'services' : srv
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

// FIXME: to be a projects list, but not only aosc-os
router.get( '/projects' , function(req, res) {
  var prj = readYAML('projects');
  var aoscos = readYAML('projects/aosc-os');
  res.render('projects', {'params' : {
    'distro' : aoscos,
    'project' : prj
  }});
});

// FIXME: to be a sub-page, and linked with /projects
router.get( '/projects/aosc-os' , function(req, res) {
  var prj = readYAML('projects');
  var aoscos = readYAML('projects/aosc-os');
  res.render('projects', {'params' : {
    'distro' : aoscos,
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

router.get( '/os-download', function(req, res) {
  res.render('os-download', {'params' : {}});
});

// APIs
router.get( '/api/splashes', function(req, res) {
  var splashes = readYAML('api/splashes');
  res.send({'splashes': splashes[Math.floor(Math.random() * splashes.length)]});
});

router.get( '/api/distro', function(req, res) {
  var params = readYAML('api/distro');
  res.send(params);
});

router.get( '/api/distro-extra', function(req, res) {
  var distros = readYAML('api/distro-extra');
  var distro;
  for(distroIndex in distros.generalDistros.list) {
    var tmpDistro = distros.generalDistros.list[distroIndex];
    if(tmpDistro.name == req.query.name) {
      distro = tmpDistro;
      break;
    }
  }
  var params = {'previewList': [], 'downloadTree': undefined, 'repoBaseDir': undefined};
  var path = distros.generalDistros.previewDirPrefix + distro.previewDir;
  var URLpath = distros.generalDistros.previewDirURLPrefix + distro.previewDir;
  try {
    var childrenInDir = fs.readdirSync(path);
  } catch (e) {
    log.error('distro-extra: failed to read directory: ' + path);
    res.send(params);
    return;
  }
  for (var c in childrenInDir) {
    if (fs.statSync(path + '/' + childrenInDir[c]).isFile()) {
      params.previewList.push(
        {'thumbPath': URLpath + '/' +
          distros.generalDistros.thumbsPrefix
          + childrenInDir[c] +
          distros.generalDistros.thumbsSuffix,
        'path': URLpath + '/' + childrenInDir[c]});
    }
  }
  params.downloadTree = distro.downloadTree;
  params.repoBaseDir = distros.generalDistros.repoBaseDir;
  res.send(params);
});

module.exports = router;

})();
