const should = require('should');
const request = require('supertest');
const url = 'http://127.0.0.1:3000';

function createRandomString(length, callback) {
    require('crypto').randomBytes(length, (err, buf) => {
        if (err) throw err;
        callback(buf.toString('base64'));
    });
}

request(url).get('/').end(function(err, res) {
    if (err) {
        require('./app.js').app;
    } else {
        console.warn('\x1b[0;33m' + 'Using already started instance for test may cause data damage!!!' + '\x1b[0m')
    }
});

describe('Basic Tests', function() {
    // Test 1-1: If pages could be visited with HTTP 200 (OK)
    const pages = ['/assets/i/aosc.png', '/news', '/community', '/projects', '/about', '/os-download'];
    describe('Can visit basic pages', function() {
        it('should load index page properly', function(done) {
            request(url).get('/').expect(200, done);
        });
        for (let page of pages) {
            it('should load ' + page.slice(1) + ' page properly', function(done) {
                request(url).get(page).expect(200, done);
            });
        }
    });

    // Test 1-2: If 404 page could be displayed when unreachable page requested
    describe('404 Page', function() {
        it('should display 404 page on unreachable master page', function(done) {
            request(url).get('/non-ex').expect(404, done);
        });
        const subpages = ['/assets', '/news', '/community', '/projects', '/about', '/os-download'];
        for (let subpage of subpages) {
            it('should display 404 page on unreachable ' + subpage.slice(1) + ' sub page(s)',
                function(done) {
                    request(url).get(subpage + '/no-such-cute-lion-outside-aosc').expect(404, done);
                });
        }
    });
});

describe('Images Tests', function() {
    // Test 2-1: If thumbnails are generated (we'll only sample one here)
    require('./controllers/router.js');
    const tmb_img = '/assets/i/gallery/thumbs/2016-aoscc-stickers-3.jpg.jpg';
    const full_img = '/assets/i/gallery/2016-aoscc-day1-a-warm-note-from-geekpie.jpg';
    it('should download the thumbnail properly', function(done) {
        request(url).get(tmb_img).expect(200, done);
    });
    // Test 2-2: If images are downloadable
    it('should download the image properly', function(done) {
        request(url).get(full_img).expect(200, done);
    });
});

describe('Admin Page', function() {
    var authCookies, authStatus, authTicket;
    describe('Authentication', function() {
        // Test 3-1-1: Basic check if auth page is shown
        it('should redirect to auth page on first visit', function(done) {
            request(url).get('/admin').expect(302, done);
        });
        // Test 3-1-2: Basic check if malformed xhr request will cause problems
        it('XHR shouldn\'t respond to malformed request', function(done) {
            request(url).get('/admin/api/wait-ticket?timestamp=' + new Date().getTime())
                .end(function(err, res) {
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
        it('should process the correct ticket', function(done) {
            request(url).get('/admin/auth').end(function(err, res) {
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
                redisSender.on('connect', function() {
                    redisSender.publish('auth:' + authTicket, 'accept', function(err, reply) {
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
        it('should let the entity who has correct ticket auth in', function(done) {
            if (!(authStatus && authCookies)) {
                throw new Error('This test failed due to the failure of the previous one');
            }
            request(url).get('/admin/api/wait-ticket?timestamp=' + new Date().getTime())
                .set('Cookie', authCookies)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                    console.log('Auth Status: ' + res.text);
                    res.body.should.match(/accept/);
                    done();
                });
        });
    });
    describe('News Editor and Related Things', function() {
        var test_news_ext, test_timestamp, news_template;
        createRandomString(6, function(ext) {
            test_news_ext = ext.replace(new RegExp('/', 'g'), '');
            test_timestamp = new Date().getTime();
            news_template = {
                'title': 'AOSC News Mocha Post Test ' + test_news_ext,
                'type': 'news',
                'content': 'This is a test.\n\n`Test Identifier: ' + test_news_ext + '`\n\nCreated By Mocha Test Framework',
                'imgOrig': '',
                'imgThumb': '',
                'timestamp': test_timestamp,
                'action': 'preview'
            };
        });
        it('should go to news editor upon good auth is presented', function(done) {
            request(url).get('/admin/news-post').set('Cookie', authCookies)
                .expect(200, done);
        });
        describe('Post news and view the news', function() {
            console.log(news_template);
            // Test 3-2-1: If preview function is good
            it('should be able to preview news', function(done) {
                request(url).post('/admin/news-post').type('form').set('Cookie', authCookies)
                    .send(news_template)
                    .expect(200, done);
            });
            // Test 3-2-2.1: If Post function is good
            it('should be able to post the news', function(done) {
                news_template.action = 'post';
                request(url).post('/admin/news-post').type('form').set('Cookie', authCookies)
                    .send(news_template)
                    .expect(302, done);
            });
            // Test 3-2-2.2: If news appears on the page
            it('should be able to view the previously posted news', function(done) {
                request(url).get('/news/aosc-news-mocha-post-test-' + test_news_ext.toLowerCase())
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        res.status.should.be.equal(200, 'Wrong HTTP status!');
                        res.text.should.match(/Mocha Test Framework/);
                        res.text.should.match(new RegExp(test_news_ext));
                        done();
                    });
            });
            // Test 3-2-3.1: If news could be modified
            it('should be able to modify news', function(done) {
                news_template.content = 'This is a test.\n\n`Test Identifier: ' + test_news_ext + test_timestamp + '`\n\nCreated By Mocha Test Framework';
                news_template.action = 'put';
                request(url).post('/admin/news-post').type('form').set('Cookie', authCookies)
                    .send(news_template)
                    .expect(302, done);
            });
            // Test 3-2-3.2: If modified news appears
            it('should be able to view modified news', function(done) {
                request(url).get('/news/aosc-news-mocha-post-test-' + test_news_ext.toLowerCase())
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        res.status.should.be.equal(200, 'Wrong HTTP status!');
                        res.text.should.match(/Mocha Test Framework/);
                        res.text.should.match(new RegExp(test_news_ext + test_timestamp));
                        done();
                    });
            });
            describe('should be able to completely wipe news', function() {
                // Test 3-2-4.1: If news could be deleted
                it('should be able to remove news using empty title', function(done) {
                    news_template.title = '';
                    news_template.action = 'push';
                    request(url).post('/admin/news-post').type('form').set('Cookie', authCookies)
                        .send(news_template)
                        .expect(302, done);
                });
                // Test 3-2-4.2: If news could be deleted and not display on the page
                it('should not be able to access the deleted news page', function(done) {
                    request(url).get('/news/aosc-news-mocha-post-test-' + test_news_ext.toLowerCase())
                        .expect(404, done);
                });
                // Test 3-2-4.3: If news is no longer on the news board
                it('should not be able to be seen on news page', function(done) {
                    request(url).get('/news').end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        res.status.should.be.equal(200, 'This may caused by the same reason of one the above tests');
                        res.text.should.not.match(new RegExp(test_news_ext), 'The deleted news still on the news page!');
                        done();
                    });
                });
                // Test 3-2-4.4: If news is no longer on the index
                it('should not be able to be seen on index page', function(done) {
                    request(url).get('/').end(function(err, res) {
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
});
