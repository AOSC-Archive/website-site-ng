const express = require('express');
const log = require('./controllers/log.js');
const i18n = require('i18next');
const i18n_middleware = require('i18next-express-middleware');
const i18n_fsbackend = require('i18next-node-fs-backend');
const sprintf = require('i18next-sprintf-postprocessor');

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

// Translation - Handler
  i18n.use(sprintf).use(i18n_fsbackend).use(i18n_middleware.LanguageDetector)
    .init({
    "debug": true,  // TODO: Set to false in production
    "fallbackLng": "en",
    "backend": {
    "loadPath": "locales/{{lng}}.json"  // Languages files in (top)/locales/
  },
    "load": "all",
    "detection":
    {
      // order and from where user language should be detected
      order: ['querystring', 'cookie', 'header'],
      // keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next'
    }
  });
  app.use(i18n_middleware.handle(i18n, {
  removeLngFromUrl: false
}));


// Routing - Filters
  app.use(express.static('static'));
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
