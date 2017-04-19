'use strict';

let stylus = require('stylus');
let nib = require('nib');
let fs = require('fs');
let log = require('./log.js');

let STYLUS_DIR = 'stylesheets';
let CSS_DIR    = 'static/assets/css';

function fullPathOfStylus(file) {
  return STYLUS_DIR + '/' + file + '.styl';
}

function forEachStylus(callback) {
  let files = fs.readdirSync(STYLUS_DIR);
  files.forEach(function(file) {
    let regExFilename = file.match(/^[^\.]+(?!\.include)(?=\.styl$)/i);
    if(regExFilename === null) return;
    if(!fs.statSync(fullPathOfStylus(regExFilename)).isFile()) return;
    callback(regExFilename[0]);
  });
}

function bigBrotherIsWatchingYou() {
  let flagChanged = 0;
  function setNextTick() {
    setTimeout(ticker, 500);
  }
  function ticker() {
    if(flagChanged) {
      flagChanged = 0;
      compileStylus();
    }
    setNextTick();
  }
  log.debug('watcher: Watching at ' + STYLUS_DIR);
  setNextTick();
  fs.watch(STYLUS_DIR, {persistent: true, recursive: true}, function(event, filename) {
    log.debug('watcher: Detected ' + filename + ' ' + event + 'd');
    flagChanged++;
  });
}

function compileStylus() {
  log.info('watcher.compiler: Compiling start');
  forEachStylus(function(file) {
    let sourceStylus = fs.readFileSync(fullPathOfStylus(file), 'utf8');
    stylus(sourceStylus)
    .set('filename', fullPathOfStylus(file))
    .set('compress', false)
    .use(nib())
    .import('nib')
    .render(function(err, targetCss) {
      if(err) {
        log.warn('watcher.compiler: Failed on compiling ' + file + '.styl :\n' + err);
      }
      fs.writeFileSync(CSS_DIR + '/' + file + '.css', targetCss);
      log.success('watcher.compiler: ' + file + '.styl compiled');
    });
  });
  log.info('watcher.compiler: Compiling completed');
}

compileStylus();
bigBrotherIsWatchingYou();
