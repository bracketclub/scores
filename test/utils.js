'use strict'

const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const parse = require('../lib/parse')

const readFile = (file) => fs.readFileSync(path.resolve(__dirname, `./data/${file}.html`), 'utf-8')
const parseFile = (file, options, cb) => parse(readFile(file), options, cb)
const parseUrl = (url, options, cb) => parse(url, options, cb)

const seriesComplete = (events) => events.filter((event) => event.seriesCompleted)
const complete = (events) => events.filter((event) => event.status.completed)
const progress = (events) => events.filter((event) => event.status.state === 'in')
const pre = (events) => events.filter((event) => event.status.state === 'pre')

module.exports = {
  complete,
  seriesComplete,
  progress,
  pre,
  parseUrl,
  parseFile,
  // omit rank because it can be unreliable from old pages fetched by url
  omitRank: (data) => _.omit(data, 'rank')
}
