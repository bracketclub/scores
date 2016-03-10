'use strict';

const test = require('tape');
const utils = require('../utils');

const testEvents = (t) => (err, events) => {
  t.notOk(err, 'No error');

  t.equal(events.length, 2, 'Total events');
  t.equal(utils.complete(events).length, 2, 'Complete events');
  t.equal(utils.progress(events).length, 0, 'In progress events');
  t.equal(utils.pre(events).length, 0, 'Not started events');

  t.equal(events[0].region, 'south');

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
    winner: true,
    shortName: 'Duke',
    longName: 'Duke Blue Devils',
    teamName: 'Blue Devils',
    name: 'Duke',
    names: ['Duke', 'Duke Blue Devils', 'Blue Devils', 'Duke']
  });

  t.deepEqual(utils.omitRank(events[0].away), {
    winner: false,
    shortName: 'Gonzaga',
    longName: 'Gonzaga Bulldogs',
    teamName: 'Bulldogs',
    name: 'Gonzaga',
    names: ['Gonzaga', 'Gonzaga Bulldogs', 'Bulldogs', 'Gonzaga']
  });

  t.equal(events[1].region, 'east');

  t.deepEqual(events[1].status, {
    state: 'post',
    completed: true,
    timeRemaining: null,
    timeUntil: null
  });

  t.deepEqual(utils.omitRank(events[1].home), {
    winner: false,
    shortName: 'Louisville',
    longName: 'Louisville Cardinals',
    teamName: 'Cardinals',
    name: 'Louisville',
    names: ['Louisville', 'Louisville Cardinals', 'Cardinals', 'Louisville']
  });

  t.deepEqual(utils.omitRank(events[1].away), {
    winner: true,
    shortName: 'Michigan State',
    longName: 'Michigan State Spartans',
    teamName: 'Spartans',
    name: 'Michigan State',
    names: ['Michigan State', 'Michigan State Spartans', 'Spartans', 'Michigan State']
  });

  t.end();
};

test('complete elite eight from file', (t) => {
  utils.parseFile('20150329-complete-elite-eight', testEvents(t));
});

test('complete elite eight from url', (t) => {
  utils.parseUrl('http://espn.go.com/mens-college-basketball/scoreboard/_/group/50/date/20150329', testEvents(t));
});

