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
slug.defaults.mode = 'pretty';

const CONTENTS_DIR    = 'contents';

const HOME_MAXITEM    = 8;
const HOME_MAXIMAGE   = 6;
const NEWS_MAXITEM    = 10;
const COMMUNITY_MAXITEM = 10;
const COMMUNITY_MAXIMAGE  = 24;

const PAGINATION_SIZE = 5;

function readYAML(yamlfile) {
  return yaml.safeLoad(fs.readFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', 'utf8'));
}

function writeYAML(yamlfile, data) {
  return fs.writeFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', yaml.safeDump(data));
}

function trimNumber(min, i, d, max) {
  let n = i;
  if(min > max) {
    log.error('trimNumber: min > max.');
    return d;
  };
  if(!n) n = d;
  if(n < min) n = min;
  if(n > max) n = max;
  return n;
}

function createPageInfo(request, total, size, pagesPerList) {
  let _totalPages = Math.ceil( total / size );
  if(_totalPages == 0) _totalPages = 1;
  const totalPages = _totalPages;
  const currentPage = trimNumber(1, request, 1, totalPages);
  const pages = {
    'currentPage' : currentPage,
    'totalPages'  : totalPages,
    'pageSize' : size,
    'paginationSize'  : pagesPerList,
    'totalItems' : total,
    'currentItem' : (currentPage - 1) * size + 1,
  };
  return pages;
}

// - / or /index
router.get('/' , (req, res) => {
  const pj = readYAML('projects');
  const srv = readYAML('services');
  new Promise(resolve => resolve(getGallery().slice(0, HOME_MAXIMAGE))
  ).then(imgUrlList =>
    newsdb.enum(1, HOME_MAXITEM, true, null,
      result => res.render(
        'index', {'params' : {
        'items' : result,
        'imgs'  : imgUrlList,
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
    const pages = createPageInfo(
      parseInt(req.query.page),
      count,
      NEWS_MAXITEM,
      PAGINATION_SIZE
    );
    newsdb.enum(pages.currentItem, pages.pageSize, true, filter,
      items => res.render(
        'news', {'params' : {
        'pages' : pages,
        'items' : items,
      }})
    );
  });
});

router.get('/news/:slug' , (req, res) => {
  new Promise(resolve => newsdb.resolve(req.params.slug, resolve))
  .then(id =>
      newsdb.get(id, true, result => {
        if (!result) {
          log.debug('router: Client requested a unreachable URI ' + req.originalUrl);
          res.status(404).render('err/404', {'params' : {
            'url' : req.path
          }});
          return;
        }
        res.render('news-view', {'params' : result});
      })
  );
});

function getThumbPath(input) {
  let p = input.lastIndexOf('/');
  let lv = input.substring(0, p);
  let rv = input.substring(p + 1);
  return lv + '/thumbs/' + rv + '.jpg';
}

function thumb(input) {
  log.info(`imagemagick: generate thumbnail for ${input}`);
  require('imagemagick').resize({
    srcPath: input,
    dstPath: getThumbPath(input),
    width:  256
  }, (err, stdout, stderr) => {
    if (err) throw err;
  });
}

(function thumbs() {
  const path = 'static/assets/i/gallery';
  let childrenInDir = [];
  try {
    childrenInDir = fs.readdirSync(path);
  } catch (e) {
    log.error('thumbs: failed to read directory: ' + path);
  }
  for(let c of childrenInDir) {
    let p = path + '/' + c;
    if(fs.statSync(p).isFile()) {
      // try {
      //   fs.accessSync(getThumbPath(p));
      // } catch (e) {
      //   thumb(p);
      // }
      thumb(p);
    }
  }
})()

function getGallery() {
  let imgUrlList = readYAML('gallery');
  const path = '/assets/i/gallery';
  for (let img of imgUrlList) {
    img.imgOrig = path + '/' + img.file;
    img.imgThumb = getThumbPath(path + '/' + img.file);
  }
  return imgUrlList.reverse();
}

router.get('/community' , (req, res) => {
  // Collect images to show gallery
  const filter = newsdb.filters.type(['community']);
  let imgUrlList;
  new Promise(resolve => {
    imgUrlList = getGallery();
    resolve();
  }).then(
    () => new Promise(resolve => newsdb.count(filter, resolve))
  ).then(count => {
    const pages = createPageInfo(
      parseInt(req.query.page),
      count,
      COMMUNITY_MAXITEM,
      PAGINATION_SIZE
    );
    newsdb.enum(pages.currentItem, pages.pageSize, true, filter,
      result => res.render('community', {'params' : {
        'pages' : pages,
        'items' : result,
        'imgs'  : imgUrlList,
      }})
    );
  });
});

router.get( '/projects' , (req, res) => {
  const projects = readYAML('projects');
  const otherProjects = readYAML('other-projects');
  res.render('projects', {'params' : {
    'projects' : projects,
    'otherProjects' : otherProjects
  }});
});

router.get( '/projects/:project' , (req, res, next) => {
  const projects = readYAML('projects');
  let custom;
  try {
    custom = readYAML('projects/' + req.params.project);
  } catch(e) {}
  let project;
  for(project of projects)
    if(project.mininame == req.params.project) break;
  if(project.mininame != req.params.project) {
    next();
    return;
  }
  let hasStylesheet = true;
  try {
    fs.accessSync('stylesheets/projects-' + project.mininame + '.styl');
  } catch (e) {
    if(e.code == 'ENOENT') hasStylesheet = false; else throw e;
  }
  res.render('projects/' + req.params.project, {'params' : {
    'hasStylesheet' : hasStylesheet,
    'projects'  : projects,
    'project' : project,
    'custom' : custom
  }});
});


router.get( '/about' , (req, res) => {
  const abt = readYAML('about');
  const ct = readYAML('contacts');
  const srv = readYAML('services');
  res.render('about', {'params' : {
    'about' : abt,
    'contacts' : ct,
    'services' : srv,
  }});
});

router.get( '/os-download', (req, res) => {
  const mdText = fs.readFileSync(CONTENTS_DIR + '/os-download.md', 'utf8');
  const mdHtml = mdText == undefined? '' : md.toHTML(mdText);
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
  let childrenInDir = [];
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
