'use strict';
(() => {
let hljs = require('highlight.js');
let md = require('markdown-it')({
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        } catch (__) {}
      }
      return ''; // use external default escaping
    },
    html: true,
    linkify: true,
    typographer: true
  }).use(require('markdown-it-abbr'))
  .use(require('markdown-it-footnote'));

exports = module.exports = md;

})();
