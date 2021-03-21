/* eslint no-magic-numbers:0 */

"use strict"

const test = require("tape")
const utils = require("../utils")

const testEvents = (t) => (err, events) => {
  t.notOk(err)

  t.equal(events[0].region, "nba finals")

  t.end()
}

test("works with tbd first round", (t) => {
  utils.parseFile("20210319-tbd-first-round", (err, events) => {
    t.equal(events.length, 16)
    t.end()
  })
})

test.skip("works with tbd first round", (t) => {
  utils.parseUrl(
    "https://www.espn.com/mens-college-basketball/scoreboard/_/group/100/date/20210319",
    (err, events) => {
      t.equal(events.length, 16)
      t.end()
    }
  )
})
