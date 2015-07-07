/* ---- Router ---- */
var yaml    = require('js-yaml');
var fs      = require('fs');
var md      = require('markdown').markdown;

function formatDate(date) {
  var month = ['January', 'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return month[date.getUTCMonth()] + ' '
               + date.getUTCDate() + ', '
               + date.getUTCFullYear();
}

function readYAML(yamlfile) {
  return yaml.safeLoad(fs.readFileSync('text/' + yamlfile + '.yml', 'utf8'));
}

function sayOops(req, res, err) {
  res.status(500).render('err/500',
    {'params' : {
        'url' : req.originalUrl,
        'err' : err
      }
    });
}

exports.DoBoom = function(app) {
// - /
// - or /index.html
  app.get( /(^\/index\.html$|^\/$)/ , function(req, res) {
    try{
      var bc = readYAML('news');
      var pj = readYAML('projects');
      for(var i_ct in bc) {
        bc[i_ct].date = formatDate(bc[i_ct].date).toUpperCase();
        var _ct = bc[i_ct].content;
        for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
      }
      res.render('index',
        {'params' : {
            'title' : 'Community Portal - AOSC',
            'broadcast' : bc,
            'projects' : pj
          }
        });
    }catch(err){sayOops(req, res, err);}
  });

// - /news-flow.html
app.get('/news-flow' , function(req, res) {
  try{
    var bct = readYAML('news');
    for(var i_ct in bct) {
      bct[i_ct].date = formatDate(bct[i_ct].date).toUpperCase();
      var _ct = bct[i_ct].content;
      for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
    }
    res.render('news-flow',
      {'params' : {
          'title' : 'Community Portal - News',
          'broadcast' : bct
        }
      });
    }catch(err){sayOops(req, res, err);}
  });

  // - /projects
  app.get( '/projects' , function(req, res) {
    try{
      var prj = readYAML('projects');
      res.render('projects',
      {'params' : {
            'title' : 'Community Portal - Projects',
            'project' : prj
          }
        });
      }catch(err){sayOops(req, res, err);}
  });

// - /about.html
  app.get( '/about' , function(req, res) {
    try{
      var abt = readYAML('about');
      var ct = readYAML('contacts');
      res.render('about',
        {'params' : {
            'title' : 'Community Portal - About',
            'about' : abt,
            'contacts' : ct
          }
        });
    }catch(err){sayOops(req, res, err);}
  });

// - /distro.html
  app.get( '/distro' , function(req, res) {
    try{
      var doc = readYAML('distro');
      res.render('distro', {'param' : doc});
    }catch(err){sayOops(req, res, err);}
  });

// !!! This route MUST be the LAST.
  app.get( '*' , function(req, res) {
    try{
      res.status(404).render('err/404',
        {'params' : {
            'url' : req.path
          }
        });
    }catch(err){sayOops(req, res, err);}
  });
};
