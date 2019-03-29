(() => {
'use strict';

let fs      = require('fs');
let express = require('express');
let router  = express.Router();

let log     = require('./log.js');
let auth    = require('./auth.js');
let newsdb  = require('./news-db.js');

const CONTENTS_DIR    = 'contents';

const SECURE_RESTRICT = true;

const isLocalDebug = req => req.hostname==='127.0.0.1' || req.hostname==='localhost';

function saveTicketCookie(res, ticket, expire) {
  res.cookie('adminTicket', ticket, {
    path: '/admin',
    httpOnly: true,
    maxAge: expire * 1000,
    signed: true
  });
}

function clearTicketCookie(res, ticket, expire) {
  res.clearCookie('adminTicket', {
    path: '/admin',
  });
}

router.use((req, res, next) => {
  if(SECURE_RESTRICT && !isLocalDebug(req) && !req.secure) {
    log.debug(`https: detected an insecure request, redirecting...`);
    return res.redirect('https://' + req.get('host') + req.originalUrl);
  }
  req.ticket = req.signedCookies.adminTicket;
  next();
});

function requirePermission(callback) {
  return (req, res, next) => {
    auth.getStatus(req.ticket, status => {
      if(status.status === 'ACCEPTED') {
        req.ttl = status.ttl;
        saveTicketCookie(res, req.ticket, req.ttl);
        return callback(req, res, next);
      }
      return res.redirect('/admin/auth');
    });
  };
}

router.get('/auth' , (req, res) => {
  new Promise((resolve, reject) =>
    auth.getStatus(req.ticket, status => {
      if(status.status === 'ACCEPTED') {
        res.redirect('/');
        reject();
      } else {
        resolve();
      }
    })
  ).then(
    () => new Promise(resolve => auth.createTicket(resolve))
  ).then(ticket => {
    saveTicketCookie(res, ticket, auth.TICKET_ACCEPT_TIMEOUT);
    res.render('admin/auth', {'params' : {
      'ticket' : ticket,
      'timeout' : auth.TICKET_ACCEPT_TIMEOUT,
      'expire' : auth.TICKET_EXPIRE_TIMEOUT,
      'redirect' : '/admin/',
    }});
  });
});

router.get('/api/wait-ticket' , (req, res) =>
  auth.getStatus(req.ticket, status => {
    if(status.status === 'ACCEPTED') res.send('accepted');
    if(status.status === 'INVALID') res.send('noooooo');
    auth.createListener(req.ticket, () => res.send('accepted'), () => {});
  })
);

router.get('/api/renew-ticket' , requirePermission((req, res) =>
  auth.renewTicket(req.ticket, () => res.send('done'))
));

router.get('/bye' , requirePermission((req, res) =>
  auth.destroyTicket(req.ticket, () => res.redirect('/'))
));

router.get('/' , requirePermission((req, res) =>
  res.render('admin/index', {'params' : {
    'ticket' : req.ticket,
    'expire' : req.ttl,
  }})
));

router.all('/news-post' , requirePermission((req, res) => {
  if(req.body.action === 'post') {
    log.debug('redis: post news ' + req.body.title);
    newsdb.post({
      'title' : req.body.title,
      'type' : req.body.type,
      'imgThumb' : req.body.imgThumb,
      'imgOrig' : req.body.imgOrig,
      'content' : req.body.content,
      'timestamp' : req.body.timestamp,
      'slug' : newsdb.slug(req.body.title, req.body.timestamp),
    }, () => res.redirect('/'));
  } else if(req.body.action === 'put') {
    log.debug('redis: put news ' + req.body.title);
    newsdb.put({
      'title' : req.body.title,
      'type' : req.body.type,
      'imgThumb' : req.body.imgThumb,
      'imgOrig' : req.body.imgOrig,
      'content' : req.body.content,
      'timestamp' : req.body.timestamp,
      'slug' : newsdb.slug(req.body.title, req.body.timestamp),
    }, () => res.redirect('/'));
  } else if(req.body.action === 'fetch') {
    newsdb.get(req.body.timestamp, true, result =>
      res.render('admin/news-post', {'params' : result})
    );
  } else {
    const mdText = fs.readFileSync(CONTENTS_DIR + '/news-example.md', 'utf8');
    const news = {
      'title' : req.body.title,
      'type' : req.body.type,
      'imgThumb' : req.body.imgThumb,
      'imgOrig' : req.body.imgOrig,
      'content' : req.body.content? req.body.content : mdText,
      'timestamp' : req.body.timestamp? req.body.timestamp : new Date().getTime(),
      'previewed' : (req.body.action == 'preview'? true : false),
    };
    res.render('admin/news-post', {'params' : newsdb.render(news)});
  }
}));

module.exports = router;

})();
