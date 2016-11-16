'use strict'

const program = require('commander')
const _ = require('lodash')
const bucker = require('bucker')
const ScoreEmitter = require('../lib/emitter')

program
  .option('-i, --interval [interval]', 'Interval in minutes', String, '1m')
  .option('-d, --date [date]', 'Date to check', String, '{date}')
  .option('-g, --ignore [ignore]', 'Ignore ids', Array, [])
  .parse(process.argv)

const logger = bucker.createLogger({
  console: {colors: true},
  level: 'info'
})

const emitter = new ScoreEmitter({
  logger,
  interval: program.interval,
  url: `http://espn.go.com/mens-college-basketball/scoreboard/_/date/${program.date}`,
  timezone: 'America/New_York',
  dailyCutoff: 180,
  parse: {
    finalPeriod: 2,
    periodLength: '20m'
  },
  __parsedIds: program.ignore
})

emitter
  .on('event', (data) => logger.info('[EVENT]', {
    id: data.id,
    completed: data.seriesCompleted,
    home: _.pick(data.home, 'rank', 'winner', 'name'),
    away: _.pick(data.away, 'rank', 'winner', 'name')
  }))
  .start()
