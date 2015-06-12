var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.render('index', { title: 'Hey', message: 'Hello there!'});
});

app.use(express.static('public'));
app.set('view engine', 'jade');
app.set('views', './views');

var server = app.listen(3000, function () {
  console.log('Listening at port %s', server.address().port);
});
