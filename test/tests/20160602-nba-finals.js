/* eslint no-magic-numbers:0 */

"use strict"

const test = require("tape")
const utils = require("../utils")

const testEvents = (t) => (err, events) => {
  t.notOk(err)

  t.equal(events[0].region, "nba finals")

  t.end()
}

test("Works with NBA finals from file", (t) => {
  utils.parseFile("20160602-nba-finals", testEvents(t))
})

test.skip("Works with NBA finals from url", (t) => {
  utils.parseUrl(
    "http://www.espn.com/nba/scoreboard/_/date/20160602",
    testEvents(t)
  )
})
