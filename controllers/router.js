/* ---- Router ---- */
(() => {
'use strict';

let express = require('express');
let router = express.Router();

let yaml = require('js-yaml');
let fs = require('fs');
let path = require('path');
let md = require('./markdown.js');
let log = require('./log.js');
let newsdb = require('./news-db.js');
let mirror_status = require('./mirror-status');
let moment = require('moment');
let rss = require('feed');
let sm = require('sitemap');
require('twix');  // Will modify prototype of 'moment'

const CONTENTS_DIR = 'contents';
const PREVIEW_DIR = 'static/images-preview';

const HOME_MAXITEM = 8;
const HOME_MAXIMAGE = 6;
const NEWS_MAXITEM = 10;
const COMMUNITY_MAXITEM = 10;
const COMMUNITY_MAXIMAGE = 24;

const PAGINATION_SIZE = 5;

function readYAML(yamlfile) {
  return yaml.safeLoad(fs.readFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', 'utf8'));
}

function writeYAML(yamlfile, data) {
  return fs.writeFileSync(CONTENTS_DIR + '/' + yamlfile + '.yml', yaml.safeDump(data));
}

function trimNumber(min, i, d, max) {
  let n = i;
  if (min > max) {
    log.error('trimNumber: min > max.');
    return d;
  }
  if (!n) n = d;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

function createPageInfo(request, total, size, pagesPerList) {
  let _totalPages = Math.ceil(total / size);
  if (_totalPages === 0) _totalPages = 1;
  const totalPages = _totalPages;
  const currentPage = trimNumber(1, request, 1, totalPages);
  const pages = {
    'currentPage': currentPage,
    'totalPages': totalPages,
    'pageSize': size,
    'paginationSize': pagesPerList,
    'totalItems': total,
    'currentItem': (currentPage - 1) * size + 1,
  };
  return pages;
}

// - / or /index
router.get('/', (req, res) => {
  const pj = readYAML('projects');
  const srv = readYAML('services');
  new Promise(resolve => resolve(getGallery().slice(0, HOME_MAXIMAGE))).then(imgUrlList =>
    newsdb.enum(1, HOME_MAXITEM, true, null,
      result => res.render(
        'index', {
          'params': {
            'items': result,
            'imgs': imgUrlList,
            'projects': pj,
            'services': srv
          }
        })
    )
  );
});

router.get('/news', (req, res) => {
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
          'news', {
            'params': {
              'pages': pages,
              'items': items,
            }
          })
      );
    });
});

router.get('/news/:slug', (req, res) => {
  new Promise(resolve => newsdb.resolve(req.params.slug, resolve))
    .then(id =>
      newsdb.get(id, true, result => {
        if (!result) {
          log.debug('router: Client requested a unreachable URI ' + req.originalUrl);
          res.status(404).render('err/404', {
            'params': {
              'url': req.path
            }
          });
          return;
        }
        res.render('news-view', {
          'params': result
        });
      })
    );
});

function getThumbPath(input) {
  let p = input.lastIndexOf('/');
  let lv = input.substring(0, p);
  let rv = input.substring(p + 1);
  return lv + '/thumbs/' + rv + '.jpg';
}

function thumb(input, resize=true) {
  log.info(`imagemagick: generate thumbnail for ${input}`);
  if (resize) {
    require('imagemagick').resize({
      srcPath: input,
      dstPath: getThumbPath(input),
      width: 256
    }, (err, stdout, stderr) => {
      if (err) throw err;
    });
    return;
  }
  require('imagemagick').convert([input, getThumbPath(input)], (err, stdout, stderr) => {
    if (err) throw err;
  });
}

(function thumbs() {
  let path = ['static/assets/i/gallery'];
  let childrenInDir = [];
  try {
    childrenInDir = fs.readdirSync(PREVIEW_DIR);
  } catch (e) {
    log.error('thumbs: failed to read directory: ' + PREVIEW_DIR);
  }

  for (let item of childrenInDir) {
    let fullPath = PREVIEW_DIR + '/' + item;
    if (item != '.git' && fs.statSync(fullPath).isDirectory()) {
      path.push(fullPath);
    }
  }

  for (let i = 0; i < path.length; i++) {
    try {
      childrenInDir = fs.readdirSync(path[i]);
    } catch (e) {
      log.error('thumbs: failed to read directory: ' + path[i]);
    }
    for (let c of childrenInDir) {
      let p = path[i] + '/' + c;
      if (fs.statSync(p).isFile()) thumb(p, (i<1));
    }
  }
})();

function getGallery() {
  let imgUrlList = readYAML('gallery');
  const path = '/assets/i/gallery';
  for (let img of imgUrlList) {
    img.imgOrig = path + '/' + img.file;
    img.imgThumb = getThumbPath(path + '/' + img.file);
  }
  return imgUrlList.reverse();
}

router.get('/community', (req, res) => {
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
      result => res.render('community', {
        'params': {
          'pages': pages,
          'items': result,
          'imgs': imgUrlList,
        }
      })
    );
  });
});

router.get('/projects', (req, res) => {
  const projects = readYAML('projects');
  const otherProjects = readYAML('other-projects');
  res.render('projects', {
    'params': {
      'projects': projects,
      'otherProjects': otherProjects
    }
  });
});

router.get('/projects/:project', (req, res, next) => {
  const projects = readYAML('projects');
  let custom;
  try {
    custom = readYAML('projects/' + req.params.project);
  } catch (e) {}
  let project;
  for (project of projects)
    if (project.mininame == req.params.project) break;
  if (project.mininame != req.params.project) {
    next();
    return;
  }
  let hasStylesheet = true;
  try {
    fs.accessSync('stylesheets/projects-' + project.mininame + '.styl');
  } catch (e) {
    if (e.code == 'ENOENT') hasStylesheet = false;
    else throw e;
  }
  res.render('projects/' + req.params.project, {
    'params': {
      'hasStylesheet': hasStylesheet,
      'projects': projects,
      'project': project,
      'custom': custom
    }
  });
});


router.get('/people', (req, res) => {
  const people = readYAML('people');
  res.render('people', {
    'params': {
      'people': people
    }
  });
});

router.get('/people/~:person', (req, res, next) => {
  const people = readYAML('people');
  let custom;
  try {
    custom = readYAML('people/' + req.params.person);
  } catch (e) {}
  let person;
  for (person of people)
    if (person.username == req.params.person) break;
  if (person.username != req.params.person) {
    next();
    return;
  }
  if (person.rurl) {
    res.status(302).render('people/people_302', {
      'params': {
        'person': {
          username: person.username
        },
        'rurl': person.rurl
      }
    });
    return;
  }
  let hasStylesheet = false;
  if (!fs.existsSync('stylesheets/people-' + person.username + '.styl')) hasStylesheet = true;
  if (!fs.existsSync('views/people/' + person.username + '.pug')) {
    log.debug('router: Client requested a unreachable URI ' + req.originalUrl);
    res.status(404).render('people/people_404', {
      'params': {
        'person': {
          username: person.username
        }
      }
    });
    return;
  }
  res.render('people/' + person.username, {
    'params': {
      'person': person
    }
  });
  return;
});

router.get('/mirror-status', (req, res) => {
  res.render('mirror-status', {
    'params': mirror_status.getMirrorsInfo(),
    'moment': moment
  });
});

router.get('/about', (req, res) => {
  const abt = readYAML('about');
  const ct = readYAML('contacts');
  const srv = readYAML('services');
  res.render('about', {
    'params': {
      'about': abt,
      'contacts': ct,
      'services': srv,
    }
  });
});

router.get('/os-download', (req, res) => {
  const mdText = fs.readFileSync(CONTENTS_DIR + '/os-download.md', 'utf8');
  const mdHtml = (mdText === undefined) ? '' : md.render(mdText);
  res.render('os-download', {
    'params': {
      'guideHtml': mdHtml
    }
  });
});

// SiteMap
router.get('/sitemap.xml', (req, res) => {
  // TODO: cache the sitemap
  let sitemap = sm.createSitemap({
    hostname: 'https://aosc.io',
    cacheTime: 600000,
    urls: [{
        url: '/',
        changefreq: 'daily',
        priority: 1.0
      },
      {
        url: '/news',
        changefreq: 'daily',
        priority: 0.8
      },
      {
        url: '/community',
        changefreq: 'weekly',
        priority: 0.6
      },
      {
        url: '/projects',
        changefreq: 'weekly',
        priority: 0.6
      },
      {
        url: '/about',
        changefreq: 'weekly',
        priority: 0.6
      },
      {
        url: '/os-download',
        changefreq: 'daily',
        priority: 0.8
      }
    ]
  });

  // traverse thru projects
  const projects = readYAML('projects');
  let project;
  for (project of projects)
    sitemap.add({
      url: '/projects/' + project.mininame,
      changefreq: 'weekly',
      priority: 0.6
    });

  // traverse thru news
  newsdb.enum(1, -1, true, null, items => {
    let item;
    for (item of items)
      sitemap.add({
        url: '/news/' + item.slug,
        changefreq: 'daily',
        priority: 0.7
      });

    res.header('Content-Type', 'application/xml');
    res.send(sitemap.toString());
  });
});

router.get('/feed.rss', (req, res) => {
  // TODO: cache the feed
  let feed = new rss.Feed({
    title: 'AOSC News',
    description: 'News feed from AOSC',
    id: 'https://aosc.io',
    link: 'https://aosc.io',
    image: 'https://aosc.io/assets/i/aosc.svg',
    copyright: 'Copyleft 2011–2018, members of the community'
  });
  feed.addCategory('Technology');

  newsdb.enum(1, -1, true, null, items => {
    let item;
    for (item of items) {
      feed.addItem({
        title: item.title,
        id: item.slug,
        link: 'https://aosc.io/news/' + item.slug,
        description: item.htmlcontent
      });
    }
    res.header('Content-Type', 'application/xml');
    res.send(feed.rss2());
  });
});

// APIs
router.get('/api/splashes', (req, res) => {
  const splashes = readYAML('api/splashes');
  res.send({
    'splashes': splashes[Math.floor(Math.random() * splashes.length)]
  });
});

router.get('/api/distro', (req, res) => {
  const params = readYAML('api/distro');
  res.send(params);
});

router.get('/api/mirror-status', (req, res) => {
  res.send(mirror_status.getMirrorsInfo());
});

router.get('/api/distro-extra', (req, res) => {
  const distros = readYAML('api/distro-extra');
  let distro;
  for (let d of distros.generalDistros.list) {
    if (d.name == req.query.name) {
      distro = d;
      break;
    }
  }
  let params = {
    'previewList': [],
    'downloadTree': undefined,
    'repoBaseDir': undefined
  };
  let path = PREVIEW_DIR + distro.previewDir;
  let URLpath = distros.generalDistros.previewDirURLPrefix + distro.previewDir;
  let childrenInDir = [];
  try {
    childrenInDir = fs.readdirSync(path);
  } catch (e) {
    log.error('distro-extra: failed to read directory: ' + path);
  }
  for (let c of childrenInDir) {
    if (fs.statSync(path + '/' + c).isFile()) {
      params.previewList.push({
        'thumbPath': URLpath + '/' +
          distros.generalDistros.thumbsPrefix +
          c +
          distros.generalDistros.thumbsSuffix,
        'path': URLpath + '/' + c
      });
    }
  }
  params.downloadTree = distro.downloadTree;
  params.repoBaseDir = distros.generalDistros.repoBaseDir;
  res.send(params);
});

module.exports = router;

})();
