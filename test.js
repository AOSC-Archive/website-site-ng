const should = require('should');
const request = require('supertest');
const xsd = require('libxml-xsd');
const url = 'http://127.0.0.1:3000';

function createRandomString(length, callback) {
  require('crypto').randomBytes(length, (err, buf) => {
    if (err) throw err;
    callback(buf.toString('base64'));
  });
}

function validateXML(xsd_file, xml, cb) {
  xsd.parseFile(xsd_file, (err, schema) => {
    if (err) throw err;
    schema.validate(xml, (err, warn) => {
      if (err) throw err;
      if (warn) throw warn;
      cb();
    });
  });
}

function getSlug(url, ext, callback) {
  request(url).get('/news')
    .end((err, res) => {
      if (err) {
        throw err;
      }
      res.status.should.be.equal(200, 'Wrong HTTP status!');
      let slug_matcher = new RegExp('<a href=\\"\\/news\\/(\\d+)-.*>.*' + ext + '<\/a>');
      var slug = slug_matcher.exec(res.text);
      if (slug) {
        slug = slug[1];
        callback(slug);
      }
      callback();
    });
}

request(url).get('/').end((err, res) => {
  if (err) {
    const app = require('./app.js').app;
  } else {
    console.warn('\x1b[0;33m' + 'Using already started instance for test may cause data damage!!!' + '\x1b[0m');
  }
});

describe('Basic Tests', () => {
  // Test 1-1: If pages could be visited with HTTP 200 (OK)
  const pages = ['/assets/i/aosc.png', '/news', '/community', '/projects', '/about', '/os-download', '/people', '/mirror-status', '/projects/aosc-os', '/people/~mingcongbai', '/api/splashes', '/api/distro', '/api/mirror-status', '/api/distro-extra?name=KDE'];
  describe('Can visit basic pages', () => {
    it('should load index page properly', done => {
      request(url).get('/').expect(200, done);
    }).timeout(5000);
    for (let page of pages) {
      it('should load ' + page.slice(1) + ' page properly', (done) => {
        request(url).get(page).expect(200, done);
      });
    }
  });

  // Test 1-2: If 404 page could be displayed when unreachable page requested
  describe('404 Page', () => {
    it('should display 404 page on unreachable master page', done => {
      request(url).get('/non-ex').expect(404, done);
    });
    const subpages = ['/assets', '/news', '/community', '/projects', '/about', '/os-download', '/people', '/people/~lionnatsu'];
    for (let subpage of subpages) {
      it('should display 404 page on unreachable ' + subpage.slice(1) + ' sub page(s)',
        (done) => {
          request(url).get(subpage + '/no-such-cute-lion-outside-aosc').expect(404, done);
        });
    }
    it('should return error status when malformed request received', done => {
      request(url).post('/non-ex').expect(400, done);
    });
  });

});

describe('Images Tests', () => {
  // Test 2-1: If thumbnails are generated (we'll only sample one here)
  require('./controllers/router.js');
  const tmb_img = '/assets/i/gallery/thumbs/2016-aoscc-stickers-3.jpg.jpg';
  const full_img = '/assets/i/test.png';
  it('should download the thumbnail properly', done => {
    request(url).get(tmb_img).expect(200, done);
  });
  // Test 2-2: If images are downloadable
  it('should download the image properly', done => {
    request(url).get(full_img).expect(200, done);
  });
});

describe('Admin Page', () => {
  var authCookies, authStatus, authTicket;
  describe('Authentication', () => {
    // Test 3-1-1: Basic check if auth page is shown
    it('should redirect to auth page on first visit', done => {
      request(url).get('/admin').expect(302, done);
    });
    // Test 3-1-2: Basic check if malformed xhr request will cause problems
    it('XHR shouldn\'t respond to malformed request', done => {
      request(url).get('/admin/api/wait-ticket?timestamp=' + new Date().getTime())
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.body.should.match(/no/);
          res.body.should.not.match('accepted');
          done();
        });
    });
    // Test 3-1-3: Basic check if correct ticket is accepted
    it('should process the correct ticket', done => {
      request(url).get('/admin/auth').end((err, res) => {
        if (err) {
          throw err;
        }
        res.status.should.be.equal(200, 'Improper HTTP status on Auth page');
        res.body.should.match(/\$ accept-ticket/);
        const matchExp = /accept\-ticket (.*?)</;
        authTicket = matchExp.exec(res.text)[1];
        authCookies = res.header['set-cookie'][0].split(';')[0];
        /* A possible way to deal with async thingy */
        const redisSender = require('redis').createClient();
        console.info('Test client send auth:' + authTicket);
        redisSender.on('connect', () => {
          redisSender.publish('auth:' + authTicket, 'accept', (err, reply) => {
            if (err) {
              throw err;
            }
            // node_redis does not report server reply in return value
            // so we need to read the reply from redis server
            if (parseInt(reply.toString()) > 0) {
              authStatus = true;
              done();
            } else {
              // What? Nobody subscribed this auth channel??!!! How dare you ...#$%>*@
              throw new Error(
                'Redis server reported it failed to publish the auth message'
              );
            }
          });
        });
      });
    });
    // Test 3-1-4: If correct ticket(s) is(are) accepted
    it('should let the entity who has correct ticket auth in', done => {
      if (!(authStatus && authCookies)) {
        throw new Error('This test failed due to the failure of the previous one');
      }
      request(url).get('/admin/api/wait-ticket?timestamp=' + new Date().getTime())
        .set('Cookie', authCookies)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          console.log('Auth Status: ' + res.text);
          res.body.should.match(/accept/);
          done();
        });
    });
    // Test 3-1-5: Redirect already authenticated username
    it('should redirect authenticated user away from /auth', done => {
      request(url).get('/admin/auth').set('Cookie', authCookies).expect(302, done);
    });
    it('should handle +1s requests', done => {
      request(url).get('/admin/api/renew-ticket').set('Cookie', authCookies).expect(200, done);
    });
  });
  describe('News Editor and Related Things', () => {
    var test_news_ext, test_timestamp, news_template;
    createRandomString(6, ext => {
      test_news_ext = ext.replace(new RegExp('/|\\+', 'g'), '');
      test_timestamp = new Date().getTime();
      news_template = {
        'title': 'AOSC News Mocha Post Test ' + test_news_ext,
        'type': 'news',
        'content': 'This is a test.\n\n`Test Identifier: ' + test_news_ext + '`\n\n```c\nint main() {return 0;}\n```\n\nCreated By Mocha Test Framework',
        'imgOrig': '',
        'imgThumb': '',
        'timestamp': test_timestamp,
        'action': 'preview'
      };
    });
    it('should go to news editor upon good auth is presented', done => {
      request(url).get('/admin/news-post').set('Cookie', authCookies)
        .expect(200, done);
    });
    describe('Post news and view the news', () => {
      // Test 3-2-1: If preview function is good
      it('should be able to preview news', done => {
        request(url).post('/admin/news-post').type('form').set('Cookie', authCookies)
          .send(news_template)
          .expect(200, done);
      });
      // Test 3-2-2.1: If Post function is good
      it('should be able to post the news', done => {
        news_template.action = 'post';
        request(url).post('/admin/news-post').type('form').set('Cookie', authCookies)
          .send(news_template)
          .expect(302, done);
      });
      // Test 3-2-2: If news appears on the page
      it('should be able to view the previously posted news', done => {
        getSlug(url, test_news_ext, slug => {
          request(url).get('/news/' + slug + '-aosc-news-mocha-post-test-' + test_news_ext.toLowerCase())
            .end((err, res) => {
              if (err) {
                throw err;
              }
              res.status.should.be.equal(200, 'Wrong HTTP status!');
              res.text.should.match(/Mocha Test Framework/);
              res.text.should.match(new RegExp(test_news_ext));
              done();
            });
        });
      });
      // Test 3-2-3.1: If news could be modified
      it('should be able to modify news', done => {
        news_template.content = 'This is a test.\n\n`Test Identifier: ' + test_news_ext + test_timestamp + '`\n\nCreated By Mocha Test Framework';
        news_template.action = 'post';
        request(url).post('/admin/news-post').type('form').set('Cookie', authCookies)
          .send(news_template)
          .expect(302, done);
      });
      // Test 3-2-3.2: If modified news appears
      it('should be able to view modified news', done => {
        getSlug(url, test_news_ext, slug => {
          request(url).get('/news/' + slug + '-aosc-news-mocha-post-test-' + test_news_ext.toLowerCase())
            .end((err, res) => {
              if (err) {
                throw err;
              }
              res.status.should.be.equal(200, 'Wrong HTTP status!');
              res.text.should.match(/Mocha Test Framework/);
              res.text.should.match(new RegExp(test_news_ext + test_timestamp));
              done();
            });
        });
      });
      describe('should be able to completely wipe news', () => {
        // Test 3-2-4.1: If news could be deleted
        it('should be able to remove news using empty title', done => {
          news_template.title = '';
          news_template.action = 'post';
          request(url).post('/admin/news-post').type('form').set('Cookie', authCookies)
            .send(news_template)
            .expect(302, done);
        });
        // Test 3-2-4.2: If news could be deleted and not display on the page
        it('should not be able to access the deleted news page', done => {
          getSlug(url, test_news_ext, slug => {
            request(url).get('/news/' + slug + '-aosc-news-mocha-post-test-' + test_news_ext.toLowerCase())
              .expect(404, done);
          });
        });
        // Test 3-2-4.3: If news is no longer on the news board
        it('should not be able to be seen on news page', done => {
          request(url).get('/news').end((err, res) => {
            if (err) {
              throw err;
            }
            res.status.should.be.equal(200, 'This may caused by the same reason of one the above tests');
            res.text.should.not.match(new RegExp(test_news_ext), 'The deleted news still on the news page!');
            done();
          });
        });
        // Test 3-2-4.4: If news is no longer on the index
        it('should not be able to be seen on index page', done => {
          request(url).get('/').end((err, res) => {
            if (err) {
              throw err;
            }
            res.status.should.be.equal(200, 'This may caused by the same reason of one the above tests');
            res.text.should.not.match(new RegExp(test_news_ext), 'The deleted news still on the index page!');
            done();
          });
        });
      });
    });
  });
  describe('Admin Logout', () => {
    it('should logout safe and sound', done => {
      request(url).get('/admin/bye').set('Cookie', authCookies).expect(302, done);
    });
    it('should not be logged in using busted ticket', done => {
      request(url).get('/admin/news-post').set('Cookie', authCookies).end((err, res) => {
        if (err) throw err;
        res.text.should.not.match(/EDITOR/);
        done();
      });
    });
  });
});

describe('SEO related pages', () => {
  it('should generate sitemap correctly', done => {
    request(url).get('/sitemap.xml').end((err, res) => {
      if (err) throw err;
      res.status.should.be.equal(200, 'Cannot load sitemap!');
      validateXML('./tests/sitemap.xsd', res.text, done);
    });
  });
  it('should generate RSS feed correctly', done => {
    request(url).get('/feed.rss').end((err, res) => {
      if (err) throw err;
      res.status.should.be.equal(200, 'Cannot load RSS feed!');
      done();
      // HACK: Test Disabled: Upstream bug, npm package feed does not
      // conform to correct xsd schema
      // validateXML('./tests/RSS20.xsd', res.text, done);
    });
  });
  it('Close Redis Instance', function() {
    const redisSender = require('redis').createClient();
    redisSender.shutdown();
    redisSender.quit();
  });
});
