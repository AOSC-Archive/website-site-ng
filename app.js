var express = require('express');
var app = express();

app.get('/', function (req, res) {  // when we get a request to get the root
  res.render('index', { title: 'Hey', message: 'Hello there!'});
  // render index.jade with a json param
  console.log('Render to %s', req.ip);
});

app.use(express.static('public'));  // mount this directory to *web root*
app.set('view engine', 'jade');     // use *Jade* to render templates
app.set('views', './views');        // and here is the templates

var server = app.listen(3000, function () { // start service
  console.log('Listening at port %s', server.address().port);
});
