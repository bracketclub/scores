/* eslint no-magic-numbers:0 */

'use strict'

const test = require('tape')
const ms = require('ms')
const utils = require('../utils')

const PERIOD_LENGTH = '20m'
const FINAL_PERIOD = 2
const GAME_LENGTH = ms(PERIOD_LENGTH) * FINAL_PERIOD

test('scheduled games for the next day', (t) => {
  const options = {
    __now: '2016-03-09T21:00:00-0500',
    periodLength: PERIOD_LENGTH,
    finalPeriod: FINAL_PERIOD
  }

  utils.parseFile('20160310-zero-started', options, (err, events) => {
    t.notOk(err)

    t.equal(events.length, 31, 'Total events')
    t.equal(utils.complete(events).length, 0, 'Complete events')
    t.equal(utils.seriesComplete(events).length, 0, 'Complete events')
    t.equal(utils.progress(events).length, 0, 'In progress events')
    t.equal(utils.pre(events).length, 31, 'Not started events')

    t.equal(events[0].status.timeUntil, ms('15h') + (GAME_LENGTH * utils.LENGTH_COEFFICIENT))
    t.equal(events[1].status.timeUntil, ms('15h') + (GAME_LENGTH * utils.LENGTH_COEFFICIENT))
    t.equal(events[2].status.timeUntil, ms('15h') + (GAME_LENGTH * utils.LENGTH_COEFFICIENT))
    t.equal(events[3].status.timeUntil, ms('15.5h') + (GAME_LENGTH * utils.LENGTH_COEFFICIENT))

    t.end()
  })
})

test('scheduled games for the next day with a different time', (t) => {
  const options = {
    __now: '2016-03-10T12:15:00-0500',
    periodLength: PERIOD_LENGTH,
    finalPeriod: FINAL_PERIOD
  }

  utils.parseFile('20160310-zero-started', options, (err, events) => {
    t.notOk(err)

    t.equal(events[0].status.timeUntil, GAME_LENGTH * utils.LENGTH_COEFFICIENT)
    t.equal(events[1].status.timeUntil, GAME_LENGTH * utils.LENGTH_COEFFICIENT)
    t.equal(events[2].status.timeUntil, GAME_LENGTH * utils.LENGTH_COEFFICIENT)
    t.equal(events[3].status.timeUntil, ms('15m') + (GAME_LENGTH * utils.LENGTH_COEFFICIENT))

    t.end()
  })
})
