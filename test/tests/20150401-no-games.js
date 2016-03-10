/* eslint no-magic-numbers:0 */

'use strict';

const test = require('tape');
const utils = require('../utils');

const FILE = '20150401-no-games';

test('No games', (t) => {
  const options = {};

  utils.parseFile(FILE, options, (err, events) => {
    t.notOk(err);

    t.equal(events.length, 0);

    t.end();
  });
});
