var express = require('express');
var yaml    = require('js-yaml');
var fs      = require('fs');
var md      = require( "markdown" ).markdown;
var app     = express();

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
        var doc = readYAML('news');
        for(var i_ct in doc) {
          var _ct = doc[i_ct].content;
          for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
        }
        res.render('index', {'param':doc});
        break;
      case 'distro.html' :
        var doc = readYAML('distro');
        res.render('distro', {'param':doc});
        break;
      default:
        res.status(404).render('err/404');
    }
  } catch (e) { console.log(e); res.status(505).render('err/505'); }
}

app.set('view engine', 'jade');     // use *Jade* to render templates
app.set('views', './views');        // and here is the templates
app.use(express.static('public'));  // mount this directory to *web root*
app.get('/', router);
app.get('/:resource', router);

var server = app.listen(3000, function () {
  console.log('Listening at port %s', server.address().port);
});
