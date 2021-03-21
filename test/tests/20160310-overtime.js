/* eslint no-magic-numbers:0 */

"use strict"

const test = require("tape")
const ms = require("ms")
const utils = require("../utils")

const FILE = "20160310-end-second-half-tied"
const OT_FILE = "20160310-overtime"
const OT_GAME = (event) => event.home.name === "Michigan"

test("Time left when going into overtime", (t) => {
  const options = {
    finalPeriod: 2,
    periodLength: "20m",
  }

  utils.parseFile(FILE, options, (err, events) => {
    t.notOk(err)

    t.equal(events.find(OT_GAME).status.timeRemaining, 0)

    t.end()
  })
})

test("Time left in overtime", (t) => {
  const options = {
    finalPeriod: 2,
    periodLength: "20m",
  }

  utils.parseFile(OT_FILE, options, (err, events) => {
    t.notOk(err)

    t.equal(
      events.find(OT_GAME).status.timeRemaining,
      ms("219s") * utils.LENGTH_COEFFICIENT
    )

    t.end()
  })
})
