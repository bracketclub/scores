/* eslint no-magic-numbers:0 */

'use strict'

const test = require('tape')
const ms = require('ms')
const utils = require('../utils')

const FILE = '20160308-halftime'

test('time remaining for game at halftime', (t) => {
  const options = {}

  utils.parseFile(FILE, options, (err, events) => {
    t.notOk(err)

    t.equal(events.length, 16, 'Total events')
    t.equal(utils.complete(events).length, 1, 'Complete events')
    t.equal(utils.progress(events).length, 3, 'In progress events')
    t.equal(utils.pre(events).length, 12, 'Not started events')

    const progress = utils.progress(events)

    t.equal(progress[2].status.timeUntil, null)
    t.equal(progress[2].status.timeRemaining, 0)

    t.end()
  })
})

test('time remaining for game at halftime', (t) => {
  const options = {
    finalPeriod: 2,
    periodLength: '20m'
  }

  utils.parseFile(FILE, options, (err, events) => {
    t.notOk(err)

    const progress = utils.progress(events)

    t.equal(progress[2].status.timeUntil, null)
    t.equal(progress[2].status.timeRemaining, ms('20m'))

    t.end()
  })
})
