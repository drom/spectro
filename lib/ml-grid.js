'use strict';

const onml = require('onml');

const numToFreq = require('./num-to-freq');

const mlGrid = (width, height, fmin, fmax) => ['g', onml.tt(.5, .5),
  ...Array.from({length: 11}, (_, y) => ['line', {
    class: 'grid2',
    y1: ((height - 1) * y / 10)|0,
    y2: ((height - 1) * y / 10)|0,
    x1: 0,
    x2: width
  }]),
  ...[0, 1, 2, 3, 4, 6, 7, 8, 9, 10].map((x)  => ['line', {
    class: 'grid2',
    x1: ((width - 1) * x / 10)|0,
    x2: ((width - 1) * x / 10)|0,
    y1: 0,
    y2: height
  }]),
  ...[5].map(x => ['line', {
    class: 'grid1',
    x1: ((width - 1) * x / 10)|0,
    x2: ((width - 1) * x / 10)|0,
    y1: 0,
    y2: height - 24
  }]),
  ...Array.from({length: 9}, (_, i) =>({
    y: ((height - 1) * (i + 1) / 10 + 5)|0,
    l: (i + 1) * -10
  }))
    .flatMap(({y, l}) => [
      ['text', {class: 'text2l', y, x: 8}, l],
      ['text', {class: 'text2r', y, x: width - 8}, l]
    ]),
  ['text', {
    class: 'text2c',
    x: width / 2,
    y: height - 8
  }, numToFreq((fmin + fmax) / 2)],
  ['text', {
    class: 'text2l',
    x: 8,
    y: height - 8
  }, numToFreq(fmin)],
  ['text', {
    class: 'text2r',
    x: width - 8,
    y: height - 8
  }, numToFreq(fmax)]
];

module.exports = mlGrid;
