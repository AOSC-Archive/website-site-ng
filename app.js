var express = require('express');
var yaml    = require('js-yaml');
var fs      = require('fs');
var md      = require( "markdown" ).markdown;
var app     = express();

app.get('/', function (req, res) {
  try {
    var doc = yaml.safeLoad(
      fs.readFileSync('text/example.yml', 'utf8'));
    for(var i_ct in doc.contents) {
      var content = doc.contents[i_ct].content;
      for(var i_para in content)
        content[i_para] = md.toHTML(content[i_para]);
    }
    res.render('index', {param:doc});
  } catch (e) { console.log(e); }
});

app.use(express.static('public'));  // mount this directory to *web root*
app.set('view engine', 'jade');     // use *Jade* to render templates
app.set('views', './views');        // and here is the templates

var server = app.listen(3000, function () {
  console.log('Listening at port %s', server.address().port);
});
