/* eslint no-magic-numbers:0 */

"use strict";

const test = require("tape");
const ms = require("ms");
const utils = require("../utils");

const FILE = "20160308-first-and-second-half";

test("time remaining for games in first half and second half", (t) => {
  const options = {};

  utils.parseFile(FILE, options, (err, events) => {
    t.notOk(err);

    t.equal(events.length, 16, "Total events");
    t.equal(utils.complete(events).length, 3, "Complete events");
    t.equal(utils.seriesComplete(events).length, 3, "Complete events");
    t.equal(utils.progress(events).length, 2, "In progress events");
    t.equal(utils.pre(events).length, 11, "Not started events");

    const progress = utils.progress(events);

    t.equal(progress[0].status.timeUntil, null);
    t.equal(
      progress[0].status.timeRemaining,
      ms("542s") * utils.LENGTH_COEFFICIENT
    );

    t.equal(progress[1].status.timeUntil, null);
    t.equal(
      progress[1].status.timeRemaining,
      ms("983s") * utils.LENGTH_COEFFICIENT
    );

    t.end();
  });
});

test("time remaining for games in first half and second half with period options", (t) => {
  const options = {
    finalPeriod: 2,
    periodLength: "20m",
  };

  utils.parseFile(FILE, options, (err, events) => {
    t.notOk(err);

    t.equal(events.length, 16, "Total events");
    t.equal(utils.complete(events).length, 3, "Complete events");
    t.equal(utils.seriesComplete(events).length, 3, "Complete events");
    t.equal(utils.progress(events).length, 2, "In progress events");
    t.equal(utils.pre(events).length, 11, "Not started events");

    const progress = utils.progress(events);

    t.equal(progress[0].status.timeUntil, null);
    t.equal(
      progress[0].status.timeRemaining,
      ms("542s") * utils.LENGTH_COEFFICIENT
    );

    t.equal(progress[1].status.timeUntil, null);
    t.equal(
      progress[1].status.timeRemaining,
      ms(`${983 + 20 * 60}s`) * utils.LENGTH_COEFFICIENT
    );

    t.end();
  });
});
