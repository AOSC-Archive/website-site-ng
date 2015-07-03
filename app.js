var express = require('express');
var yaml    = require('js-yaml');
var fs      = require('fs');
var md      = require('markdown').markdown;
var app     = express();

function formatDate(date) {
  var month = ['January', 'February', 'March', 'April', 'May',
    'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return month[date.getUTCMonth()] + ' '
               + date.getUTCDate() + ', '
               + date.getUTCFullYear();
}

function readYAML(yamlfile) {
  try {
    return yaml.safeLoad(fs.readFileSync('text/' + yamlfile + '.yml', 'utf8'));
  } catch (e) { console.log(e); }
}

function router(req, res) {
  try {
    switch(req.params.resource) {
      case undefined :
      case 'index.html' :
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
        break;
      case 'distro.html' :
        var doc = readYAML('distro');
        res.render('distro', {'param' : doc});
        break;
      default:
        res.status(404).render('err/404');
    }
  } catch (e) { console.log(e); res.status(500).render('err/500'); }
}

app.set('view engine', 'jade');     // use *Jade* to render templates
app.set('views', './views');        // and here is the templates
app.use(express.static('public'));  // mount this directory to *web root*
app.get('/', router);
app.get('/:resource', router);

var server = app.listen(3000, function () {
  console.log('Listening at port %s', server.address().port);
});
