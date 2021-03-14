#!/usr/bin/env node

"use strict";

const async = require("async");
const _ = require("lodash");
const parse = require("./parse");

const args = process.argv.slice(2);
const dates = args.filter((date) => date.match(/\d{8}/));

const mapValues = args.indexOf("--mapvalues") > -1;
const namesOnly = args.indexOf("--namesonly") > -1;
const event = args.indexOf("--womens") > -1 ? "womens" : "mens";
const urls = dates.map(
  (date) =>
    `http://espn.go.com/${event}-college-basketball/scoreboard/_/date/${date}`
);

async.map(
  urls,
  (url, cb) => {
    parse(url, (err, events) => {
      if (err) return cb(err);

      return cb(
        null,
        _.transform(
          events,
          (res, e) => {
            res.push(
              _.extend(_.omit(e.home, "winner"), { region: e.region }),
              _.extend(_.omit(e.away, "winner"), { region: e.region })
            );
          },
          []
        )
      );
    });
  },
  (err, results) => {
    if (err) throw err;

    const all = _.chain(results)
      .flatten()
      .uniqBy("name")
      .sortBy(["region", "rank"])
      .groupBy("region")
      .mapValues((teams) => {
        if (mapValues) {
          return teams.map(
            (t) =>
              `${t.rank} - ${t.name} - (${_.without(t.names, t.name).join(
                ", "
              )})`
          );
        }
        if (namesOnly) {
          return teams.map((t) => t.name);
        }
        return teams;
      })
      .value();

    process.stdout.write(JSON.stringify(all, null, 2));
  }
);
