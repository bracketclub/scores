'use strict';

const test = require('tape');
const utils = require('../utils');

const testEvents = (t) => (err, events) => {
  t.notOk(err, 'No error');

  t.equal(events.length, 2, 'Total events');
  t.equal(utils.complete(events).length, 2, 'Complete events');
  t.equal(utils.progress(events).length, 0, 'In progress events');
  t.equal(utils.pre(events).length, 0, 'Not started events');

  t.equal(events[0].region, 'final four');

  t.deepEqual(events[0].status, {
    state: 'post',
    completed: true,
    timeRemaining: null,
    timeUntil: null
  });

  t.equal(typeof events[0].home.rank, 'number');
  t.equal(typeof events[0].away.rank, 'number');
  t.equal(typeof events[1].home.rank, 'number');
  t.equal(typeof events[1].away.rank, 'number');

  t.deepEqual(utils.omitRank(events[0].home), {
    winner: false,
    shortName: 'Kentucky',
    longName: 'Kentucky Wildcats',
    teamName: 'Wildcats',
    name: 'Kentucky',
    names: ['Kentucky', 'Kentucky Wildcats', 'Wildcats', 'Kentucky']
  });

  t.deepEqual(utils.omitRank(events[0].away), {
    winner: true,
    shortName: 'Wisconsin',
    longName: 'Wisconsin Badgers',
    teamName: 'Badgers',
    name: 'Wisconsin',
    names: ['Wisconsin', 'Wisconsin Badgers', 'Badgers', 'Wisconsin']
  });

  t.equal(events[1].region, 'final four');

  t.deepEqual(utils.omitRank(events[1].status), {
    state: 'post',
    completed: true,
    timeRemaining: null,
    timeUntil: null
  });

  t.deepEqual(utils.omitRank(events[1].home), {
    winner: true,
    shortName: 'Duke',
    longName: 'Duke Blue Devils',
    teamName: 'Blue Devils',
    name: 'Duke',
    names: ['Duke', 'Duke Blue Devils', 'Blue Devils', 'Duke']
  });

  t.deepEqual(utils.omitRank(events[1].away), {
    winner: false,
    shortName: 'Michigan State',
    longName: 'Michigan State Spartans',
    teamName: 'Spartans',
    name: 'Michigan State',
    names: ['Michigan State', 'Michigan State Spartans', 'Spartans', 'Michigan State']
  });

  t.end();
};

test('complete final four from file', (t) => {
  utils.parseFile('20150404-complete-final-four', testEvents(t));
});

test.skip('complete final four from url', (t) => {
  utils.parseUrl('http://espn.go.com/mens-college-basketball/scoreboard/_/group/50/date/20150404', testEvents(t));
});

