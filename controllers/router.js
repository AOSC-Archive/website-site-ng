/* ---- Router ---- */
(() => {
'use strict';

let express = require('express');
let router = express.Router();

let yaml    = require('js-yaml');
let fs      = require('fs');
let md      = require('markdown').markdown;
let log     = require('./log.js');
let newsdb  = require('./news-db.js');
let slug    = require('slug');
slug.defaults.mode = "rfc3986";

const CONTENTS_DIR    = 'contents';

const HOME_MAXITEM    = 8;
const HOME_MAXIMAGE   = 6;
const NEWS_MAXITEM    = 10;
const COMMUNITY_MAXITEM = 10;
const COMMUNITY_MAXIMAGE  = 24;

function readYAML(yamlfile) {
  return yaml.safeLoad(fs.readFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', 'utf8'));
}

function writeYAML(yamlfile, data) {
  return fs.writeFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', yaml.safeDump(data));
}

// - / or /index
router.get('/' , (req, res) => {
  const pj = readYAML('projects');
  const srv = readYAML('services');
  new Promise(resolve =>
    newsdb.enum(1, HOME_MAXIMAGE, false, newsdb.filters.hasImage(), resolve)
  ).then(imgUrlList =>
    newsdb.enum(1, HOME_MAXITEM, true, null,
      result => res.render(
        'index', {'params' : {
        'items' : result,
        "imgs"  : imgUrlList,
        'projects' : pj,
        'services' : srv
      }})
    )
  );
});

router.get('/news' , (req, res) => {
  const filter = newsdb.filters.type(['news', 'bug']);
  new Promise(resolve => newsdb.count(filter, resolve))
  .then(count => {
    const page = req.query.page? req.query.page : 1;
    newsdb.enum((page - 1) * NEWS_MAXITEM, NEWS_MAXITEM, true, filter,
      result => res.render(
        "news", {"params" : {
        "page" : page,
        "count" : Math.ceil( count / NEWS_MAXITEM ),
        "items" : result,
        }}
      )
    );
  });
});

router.get('/news/:slug' , (req, res) => {
  new Promise(resolve => newsdb.resolve(req.params.slug, resolve))
  .then(id =>
    newsdb.get(id, true, result => res.render("news-view", {"params" : result}))
  );
});

router.get('/community' , (req, res) => {
  // Collect images to show gallery
  new Promise(resolve =>
    newsdb.enum(1, COMMUNITY_MAXIMAGE,
      false,
      newsdb.filters.both(
        newsdb.filters.type(['community']),
        newsdb.filters.hasImage()
      ),
      resolve
    )
  ).then(imgUrlList =>
    newsdb.enum(req.query.begin, COMMUNITY_MAXITEM,
      true,
      newsdb.filters.type(['community']),
      result => res.render("community", {"params" : {
        "begin" : req.query.begin,
        "items" : result,
        "imgs"  : imgUrlList,
        }}
      )
    )
  );
});

// FIXME: to be a projects list, but not only aosc-os
router.get( '/projects' , (req, res) => {
  const prj = readYAML('projects');
  const aoscos = readYAML('projects/aosc-os');
  res.render('projects', {'params' : {
    'distro' : aoscos,
    'project' : prj
  }});
});

// FIXME: to be a sub-page, and linked with /projects
router.get( '/projects/aosc-os' , (req, res) => {
  const prj = readYAML('projects');
  const aoscos = readYAML('projects/aosc-os');
  res.render('projects', {'params' : {
    'distro' : aoscos,
    'project' : prj
  }});
});


router.get( '/about' , (req, res) => {
  const abt = readYAML('about');
  const ct = readYAML('contacts');
  res.render('about', {'params' : {
    'about' : abt,
    'contacts' : ct
  }});
});

router.get( '/os-download', (req, res) => {
  const mdText = fs.readFileSync(CONTENTS_DIR + '/os-download.md', 'utf8');
  const mdHtml = mdText == undefined? "" : md.toHTML(mdText);
  res.render('os-download', {'params' : {'guideHtml': mdHtml}});
});

// APIs
router.get( '/api/splashes', (req, res) => {
  const splashes = readYAML('api/splashes');
  res.send({'splashes': splashes[Math.floor(Math.random() * splashes.length)]});
});

router.get( '/api/distro', (req, res) => {
  const params = readYAML('api/distro');
  res.send(params);
});

router.get( '/api/distro-extra', (req, res) => {
  const distros = readYAML('api/distro-extra');
  let distro;
  for(let d of distros.generalDistros.list) {
    if(d.name == req.query.name) {
      distro = d;
      break;
    }
  }
  let params = {'previewList': [], 'downloadTree': undefined, 'repoBaseDir': undefined};
  let path = distros.generalDistros.previewDirPrefix + distro.previewDir;
  let URLpath = distros.generalDistros.previewDirURLPrefix + distro.previewDir;
  let childrenInDir;
  try {
    childrenInDir = fs.readdirSync(path);
  } catch (e) {
    log.error('distro-extra: failed to read directory: ' + path);
  }
  for (let c of childrenInDir) {
    if (fs.statSync(path + '/' + c).isFile()) {
      params.previewList.push(
        {'thumbPath': URLpath + '/' +
          distros.generalDistros.thumbsPrefix
          + c +
          distros.generalDistros.thumbsSuffix,
        'path': URLpath + '/' + c});
    }
  }
  params.downloadTree = distro.downloadTree;
  params.repoBaseDir = distros.generalDistros.repoBaseDir;
  res.send(params);
});

module.exports = router;

})();
