var express = require('express');
var yaml    = require('js-yaml');
var fs      = require('fs');
var app     = express();

app.get('/', function (req, res) {
  try {
    var doc = yaml.safeLoad(
      fs.readFileSync('text/example.yml', 'utf8'));
    res.render('index', {param:doc});
  } catch (e) { console.log(e); }
});

app.use(express.static('public'));  // mount this directory to *web root*
app.set('view engine', 'jade');     // use *Jade* to render templates
app.set('views', './views');        // and here is the templates

var server = app.listen(3000, function () {
  console.log('Listening at port %s', server.address().port);
});
