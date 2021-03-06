"use strict"

const test = require("tape")
const utils = require("../utils")

const testEvents = (t) => (err, events) => {
  t.notOk(err, "No error")
  t.equal(events.length, 1, "Total events")
  t.equal(utils.complete(events).length, 1, "Complete events")
  t.equal(utils.seriesComplete(events).length, 1, "Complete events")
  t.equal(utils.progress(events).length, 0, "In progress events")
  t.equal(utils.pre(events).length, 0, "Not started events")

  t.equal(events[0].region, "national championship")

  t.deepEqual(events[0].status, {
    state: "post",
    completed: true,
    timeRemaining: null,
    timeUntil: null,
  })

  t.deepEqual(events[0].series, {
    completed: true,
    playedCompetitions: 1,
    totalCompetitions: 1,
  })
  t.equal(events[0].seriesCompleted, true)

  t.equal(typeof events[0].home.rank, "number")
  t.equal(typeof events[0].away.rank, "number")

  t.deepEqual(utils.omitRank(events[0].home), {
    winner: true,
    shortName: "Duke",
    longName: "Duke Blue Devils",
    teamName: "Blue Devils",
    name: "Duke",
    abbrv: "DUKE",
    names: ["Duke", "Duke Blue Devils", "Blue Devils", "Duke", "DUKE"],
  })

  t.deepEqual(utils.omitRank(events[0].away), {
    winner: false,
    shortName: "Wisconsin",
    longName: "Wisconsin Badgers",
    teamName: "Badgers",
    name: "Wisconsin",
    abbrv: "WISC",
    names: ["Wisconsin", "Wisconsin Badgers", "Badgers", "Wisconsin", "WISC"],
  })

  t.end()
}

test("complete championship from file", (t) => {
  utils.parseFile("20150406-complete-championship", testEvents(t))
})

test.skip("complete championship from url", (t) => {
  utils.parseUrl(
    "http://espn.go.com/mens-college-basketball/scoreboard/_/group/100/date/20150406",
    testEvents(t)
  )
})
