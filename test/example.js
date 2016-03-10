'use strict';

const ScoreEmitter = require('../lib/emitter');
const program = require('commander');
const _ = require('lodash');

program
  .option('-i, --interval [interval]', 'Interval in minutes', String, '1m')
  .option('-d, --date [date]', 'Date to check', String, '{date}')
  .parse(process.argv);

const logger = require('bucker').createLogger({
  console: {colors: true},
  level: 'info'
});

const emitter = new ScoreEmitter({
  logger,
  interval: program.interval,
  url: `http://espn.go.com/mens-college-basketball/scoreboard/_/group/50/date/${program.date}`,
  timezone: 'America/New_York',
  dailyCutoff: 180,
  parse: {
    finalPeriod: 2,
    periodLength: '20m'
  }
});

emitter
  .on('event', (data) => logger.info('[EVENT]', {
    id: data.id,
    completed: data.status.completed,
    home: _.pick(data.home, 'rank', 'winner', 'name'),
    away: _.pick(data.away, 'rank', 'winner', 'name')
  }))
  .start();
