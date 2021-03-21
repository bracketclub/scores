/* eslint no-magic-numbers:0 */

"use strict"

const test = require("tape")
const utils = require("../utils")

const testEvents = (t) => (err, events) => {
  t.notOk(err)

  t.equal(events.length, 2, "Total events")
  t.equal(utils.complete(events).length, 2, "Complete events")
  t.equal(utils.seriesComplete(events).length, 1, "Series complete events")
  t.equal(utils.progress(events).length, 0, "In progress events")
  t.equal(utils.pre(events).length, 0, "Not started events")

  t.deepEqual(events[0].series, {
    completed: true,
    totalCompetitions: 7,
    playedCompetitions: 4,
  })

  t.equal(events[0].region, "eastern conference")

  t.deepEqual(events[1].series, {
    completed: false,
    totalCompetitions: 7,
    playedCompetitions: 4,
  })

  t.equal(events[0].region, "eastern conference")

  t.end()
}

test("Works with NBA series completion from file", (t) => {
  utils.parseFile("20160508-nba-one-series-completion", testEvents(t))
})

test.skip("Works with NBA series completion from url", (t) => {
  utils.parseUrl(
    "http://www.espn.com/nba/scoreboard/_/date/20160508",
    testEvents(t)
  )
})
