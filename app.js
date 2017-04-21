const express = require('express');
const log = require('./controllers/log.js');

// Express - Create The Instance
  const app = express();

// Parsing - Middlewares
  app.use(require('body-parser').urlencoded({ extended: false }));
  const crypto  = require('crypto');
  const COOKIE_SIGN_KEY_LEN = 256;
  const COOKIE_SIGN_KEY = crypto.randomBytes(COOKIE_SIGN_KEY_LEN).toString('binary');
  app.use(require('cookie-parser')(COOKIE_SIGN_KEY));

// Rendering - Engine
  app.set('view engine', 'pug');
  app.set('views', './views');

// Routing - Filters
  app.use('/', express.static('seo-override-nogit'));
  app.use('/', express.static('seo-override'));
  app.use('/assets/', express.static('static/assets'));
  app.use('/assets/i/de-preview/', express.static('static/images-preview'));
  app.use('/', require('./controllers/router.js'));
  app.use('/admin', require('./controllers/router-admin.js'));
  app.get( '*' , (req, res) => {
    log.debug('router: Client requested a unreachable URI ' + req.originalUrl);
    res.status(404).render('err/404', {'params' : {
      'url' : req.path
    }});
  });
  app.all( '*' , (req, res) => {
    log.debug('router: Bad Request ' + req.originalUrl);
    res.sendStatus(400);
  });

// Network
  app.set('trust proxy', 'loopback');
  const server = app.listen(3000, function () {
    log.debug('server: Listening at port ' + server.address().port);
  });

// Watcher - Stylus Compiler
  require('child_process').fork('./controllers/watcher.js');
  log.debug('server: Fork watcher');

/*

              AOSC
          Web Team 2016
           "Cauldron"

                              */
