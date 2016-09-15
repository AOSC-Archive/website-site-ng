var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')

var app = express();
var log = require('./controllers/log.js');

app.use(bodyParser.urlencoded({ extended: false }));
var crypto  = require('crypto');
const COOKIE_SIGN_KEY_LENGTH = 256;
app.use(cookieParser(crypto.randomBytes(COOKIE_SIGN_KEY_LENGTH).toString('binary')));
app.set('view engine', 'pug');
app.set('views', './views');
app.set('trust proxy', 'loopback');
app.use(express.static('static'));
app.use('/', require('./controllers/router.js'));
app.use('/admin', require('./controllers/router-admin.js'));
app.get( '*' , function(req, res) {
  log.debug('router: Client requested a unreachable URI ' + req.originalUrl);
  res.status(404).render('err/404', {'params' : {
    'url' : req.path
  }});
});
app.all( '*' , function(req, res) {
  log.debug('router: Bad Request ' + req.originalUrl);
  res.sendStatus(400);
});

var child_process = require('child_process');
child_process.fork('./controllers/watcher.js');
log.debug('server: Fork watcher');
var server = app.listen(3000, function () {
  log.debug('server: Listening at port ' + server.address().port);
});

/*

              AOSC
          Web Team 2016
           "Cauldron"

                              */
