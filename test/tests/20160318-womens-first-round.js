/* eslint no-magic-numbers:0 */

'use strict'

const test = require('tape')
const utils = require('../utils')

const FILE = '20160318-womens-first-round'

test('region name with a space', (t) => {
  const options = {}

  utils.parseFile(FILE, options, (err, events) => {
    t.notOk(err)

    t.equal(events.length, 16, 'Total events')
    t.equal(utils.complete(events).length, 0, 'Complete events')
    t.equal(utils.progress(events).length, 0, 'In progress events')
    t.equal(utils.pre(events).length, 16, 'Not started events')

    const game3 = events[2]
    t.equal(game3.region, 'sioux falls')

    t.end()
  })
})
