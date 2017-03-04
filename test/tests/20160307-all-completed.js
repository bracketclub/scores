/* eslint no-magic-numbers:0 */

'use strict'

const test = require('tape')
const _ = require('lodash')
const utils = require('../utils')

const FILE = '20160307-all-completed'

test('completed games from a previous day', (t) => {
  const options = {}

  utils.parseFile(FILE, options, (err, events) => {
    t.notOk(err)

    t.equal(events.length, 17, 'Total events')
    t.equal(utils.complete(events).length, 17, 'Complete events')
    t.equal(utils.seriesComplete(events).length, 17, 'Complete events')
    t.equal(utils.progress(events).length, 0, 'In progress events')
    t.equal(utils.pre(events).length, 0, 'Not started events')

    const timeRemaining = _.map(events, 'status.timeRemaining')
    const timeUntil = _.map(events, 'status.timeUntil')

    t.equal(timeRemaining.length, 17)
    t.equal(timeRemaining.filter(Boolean).length, 0)

    t.equal(timeUntil.length, 17)
    t.equal(timeUntil.filter(Boolean).length, 0)

    const homeRanks = _.map(events, 'home.rank')
    const awayRanks = _.map(events, 'away.rank')

    t.equal(homeRanks[0], 99)
    t.equal(_.uniq(homeRanks).length, 1)
    t.equal(awayRanks[0], 99)
    t.equal(_.uniq(awayRanks).length, 1)

    t.end()
  })
})
