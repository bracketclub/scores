/* eslint no-magic-numbers:0 */

"use strict"

const test = require("tape")
const utils = require("../utils")

const testEvents = (t) => (err, events) => {
  t.notOk(err)

  t.equal(events[0].region, "nba finals")

  t.end()
}

test("works with tbd first round fil", (t) => {
  utils.parseFile("20210320-first-round-uncontested", (err, events) => {
    const uncontested = events.find((e) => e.id === "401310924")
    t.equal(uncontested.seriesCompleted, true)
    t.end()
  })
})

test.only("works with 20210320-first-round-uncontested url", (t) => {
  utils.parseUrl(
    "https://www.espn.com/mens-college-basketball/scoreboard/_/group/100/date/20210320",
    (err, events) => {
      const uncontested = events.find((e) => e.id === "401310924")
      t.equal(uncontested.seriesCompleted, true)
      t.end()
    }
  )
})
