/* eslint no-magic-numbers:0 */

'use strict';

const test = require('tape');
const ms = require('ms');
const utils = require('../utils');

test('scheduled games for the next day', (t) => {
  const options = {
    __now: '2016-03-09T21:00:00-0500'
  };

  utils.parseFile('20160310-zero-started', options, (err, events) => {
    t.notOk(err);

    t.equal(events.length, 31, 'Total events');
    t.equal(utils.complete(events).length, 0, 'Complete events');
    t.equal(utils.progress(events).length, 0, 'In progress events');
    t.equal(utils.pre(events).length, 31, 'Not started events');

    t.equal(events[0].status.timeUntil, ms('15h'));
    t.equal(events[1].status.timeUntil, ms('15h'));
    t.equal(events[2].status.timeUntil, ms('15h'));
    t.equal(events[3].status.timeUntil, ms('15.5h'));

    t.end();
  });
});

test('scheduled games for the next day with a different time', (t) => {
  const options = {
    __now: '2016-03-10T12:15:00-0500'
  };

  utils.parseFile('20160310-zero-started', options, (err, events) => {
    t.notOk(err);

    t.equal(events[0].status.timeUntil, 0);
    t.equal(events[1].status.timeUntil, 0);
    t.equal(events[2].status.timeUntil, 0);
    t.equal(events[3].status.timeUntil, ms('15m'));

    t.end();
  });
});
