# jstransformer-markdown

[Markdown](npm.im/markdown) support for [JSTransformers](http://github.com/jstransformers).

[![Build Status](https://img.shields.io/travis/jstransformers/jstransformer-markdown/master.svg)](https://travis-ci.org/jstransformers/jstransformer-markdown)
[![Coverage Status](https://img.shields.io/coveralls/jstransformers/jstransformer-markdown/master.svg)](https://coveralls.io/r/jstransformers/jstransformer-markdown?branch=master)
[![Dependency Status](https://img.shields.io/david/jstransformers/jstransformer-markdown/master.svg)](http://david-dm.org/jstransformers/jstransformer-markdown)
[![NPM version](https://img.shields.io/npm/v/jstransformer-markdown.svg)](https://www.npmjs.org/package/jstransformer-markdown)

## Installation

    npm install jstransformer-markdown

## API

```js
var foo = require('jstransformer')(require('jstransformer-markdown'))

foo.render('# Hello World!').body
//=> '<h1>Hello World!</h1>'
```

## License

MIT
