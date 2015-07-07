// ** DO **
var express = require('express'); // ← Familiar things
// Because it's still the **BACKEND**
"Neop's love." // you love
/* only better */


// Do blink-of-an-WINK
var app = express(); // ← things
// With quick start up and performance.

// Do the same things
// Because
var routes  = require('./routes.js'); // ← your stuff
// comes with you.
function router(req, res) {
  try {
    switch(req.params.resource) {
      case undefined :
      case 'index.html' :
        var bc = readYAML('news');
        var pj = readYAML('projects');
        for(var i_ct in bc) {
          bc[i_ct].date = formatDate(bc[i_ct].date).toUpperCase();
          var _ct = bc[i_ct].content;
          for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
        }
        res.render('index',
          {'params' : {
              'title' : 'Community Portal - AOSC',
              'broadcast' : bc,
              'projects' : pj
            }
          });
        break;
        case 'news-flow' :
          var bct = readYAML('news');
          for(var i_ct in bc) {
            bc[i_ct].date = formatDate(bc[i_ct].date).toUpperCase();
            var _ct = bc[i_ct].content;
            for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
          }
          res.render('news-flow',
            {'params' : {
                'title' : 'Community Portal - More News',
                'broadcast' : bct,
              }
            });
          break;
        case 'news-flow' :
          var bct = readYAML('news');
          for(var i_ct in bc) {
            bc[i_ct].date = formatDate(bc[i_ct].date).toUpperCase();
            var _ct = bc[i_ct].content;
            for(var i_para in _ct) _ct[i_para] = md.toHTML(_ct[i_para]);
          }
          res.render('news-flow',
            {'params' : {
                'title' : 'Community Portal - More News',
                'broadcast' : bct,
              }
            });
          break;
        case 'projects' :
          var pjt = readYAML('projects');
          res.render('projects',
            {'params' : {
                'title' : 'Community Portal - Projects',
                'project' : pjt
              }
            });
          break;
        case 'about' :
          var abt = readYAML('about');
          var ct = readYAML('contacts');
          res.render('about',
            {'params' : {
                'title' : 'Community Portal - About',
                'about' : abt,
                'contacts' : ct
              }
            });
          break;
        case 'distro.html' :
            var doc = readYAML('distro');
            res.render('distro', {'param' : doc});
          break;
        default:
            res.status(404).render('err/404');
    }
  } catch (e) { console.log(e); res.status(500).render('err/500'); }
}

/* Do personal things
       private
      whatever        */
", such as sleeping together,"
// With a more secure Framework.

// Do
// to-do things
'"Plz read the fine manual" says the Jeff'
app.set('view engine', 'jade'); // Use Lion and Jade
app.set('views', './views');    // your truly personal digital
// assistant

// on your home
// Reminding you to get
{{};;{};['',"w"];}; // flowers

// and
// finding that static pages
app.use(express.static('public')); // on your *public*

// Do unexpected things
// that turn browsing
/* into doing */

routes.DoBoom(app);
// Cha-cha-cha

var server = app.listen(3000, function () {
  console.log('Listening at port %s', server.address().port);
});
// tweet-tweet

// With a one-stop AOSC Web Team
/*  full of
    straights,
    lions,
    and bis.  */

// Do visual things
// Like using AOSC OS for
// Free
// Zero
// Zilch
// Nada
///////  FREE  ////////
// Available in 2015 //
/* Reserve a lion today. */

/*

              AOSC
          Web Team 2015
             "Safe"

                              */
