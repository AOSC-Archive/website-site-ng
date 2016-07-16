(function(){

var express = require('express');
var router = express.Router();

var log    = require('./log.js');
var auth    = require('./auth.js');
var newsdb  = require('./news-db.js');

const SECURE_RESTRICT = true;

function isLocalDebug(req) {
  return req.hostname=="127.0.0.1" || req.hostname=="localhost";
}

function saveTicketCookie(res, ticket, expire) {
  res.cookie('adminTicket', ticket, {
    path: '/admin',
    httpOnly: true,
    maxAge: expire * 1000
  });
}
function clearTicketCookie(res, ticket, expire) {
  res.clearCookie('adminTicket', {
    path: '/admin',
  });
}

router.use(function(req, res, next) {
  if(SECURE_RESTRICT && !req.secure && !isLocalDebug(req))
    return res.redirect('https://' + req.get('host') + req.originalUrl);
  req.ticket = req.cookies.adminTicket;
  next();
});

router.get('/auth' , function(req, res) {
  auth.createTicket(function(ticket) {
    saveTicketCookie(res, ticket, auth.TICKET_ACCEPT_TIMEOUT);
    res.render("auth", {"params" : {
      "ticket" : ticket,
      "timeout" : auth.TICKET_ACCEPT_TIMEOUT,
      "expire" : auth.TICKET_EXPIRE_TIMEOUT,
      "redirect" : "/admin/auth-success",
    }});
  });
});

router.get('/auth-success' , function(req, res) {
  saveTicketCookie(res, req.cookies.adminTicket, auth.TICKET_EXPIRE_TIMEOUT);
  res.redirect('/admin/news-post');
});

router.get('/api/wait-auth' , function(req, res) {
  var ticket = req.cookies.adminTicket;
  auth.getStatus(ticket, function(status) {
    if(status.status == "ACCEPTED") res.send("accepted");
    if(status.status == "INVALID") res.send("noooooo");
    auth.createListener(ticket, function() {
      res.send("accepted");
    }, function() {});
  });
});

router.use(function(req, res, next) {
  auth.getStatus(req.ticket, function(status) {
    if(status.status != "ACCEPTED") return res.redirect('/admin/auth');
    req.ttl = status.ttl;
    next();
  });
});

router.all('/news-post' , function(req, res) {
  if(req.body.action == "post") {
    log.debug("redis: post news " + req.body.title);
    newsdb.post({
      "title" : req.body.title,
      "type" : req.body.type,
      "content" : req.body.content,
      "timestamp" : new Date().getTime(),
      "slug" : newsdb.slug(req.body.title),
    }, function() {
      res.redirect('/news');
    });
  } else {
    var news = {
      "title" : (req.body.title? req.body.title : "Lovely Title"),
      "type" : (req.body.type? req.body.type : "news"),
      "content" : req.body.content,
      "timestamp" : new Date().getTime(),
      "previewed" : (req.body.action == "preview"? true : false),
    };
    res.render('news-post', {'params' : newsdb.render(news)});
  }
});

module.exports = router;

})();
