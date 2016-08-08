'use strict'

const EventEmitter = require('events').EventEmitter
const moment = require('moment-timezone')
const _ = require('lodash')
const bucker = require('bucker')
const ms = require('ms')
const parse = require('./parse')

class ScoreEmitter extends EventEmitter {
  constructor (options) {
    super()

    this.options = _.defaults(options, {
      url: null,
      logger: bucker.createNullLogger(),
      interval: ms('5m'),
      timezone: 'America/New_York',
      dailyCutoff: 180,
      parse: {
        finalPeriod: null,
        periodLength: null,
        __now: null
      },
      __now: null,
      __parsedIds: []
    })

    if (typeof this.options.interval === 'string') {
      this.options.interval = ms(this.options.interval)
    }

    if (this.options.__now && !this.options.parse.__now) {
      this.options.parse.__now = this.options.__now
    }

    this.logger = this.options.logger
    this.__parsedIds = this.options.__parsedIds

    this.__timeoutId = null
    this.__lastDate = null

    const url = this.options.url
    const interval = this.options.interval

    if (!interval || typeof interval !== 'number' || interval < ms('1m')) {
      throw new Error('Interval must be a number of milliseconds no less than 1 second')
    }

    if (!url) {
      throw new Error('Url is required')
    }
  }

  start () {
    if (!this.__timeoutId) {
      this.logger.info('[START]')
      this.fetch({initial: true})
    }
    return this
  }

  stop () {
    if (this.__timeoutId) {
      this.logger.info('[STOP]')
      clearTimeout(this.__timeoutId)
      delete this.__timeoutId
    }
    return this
  }

  getCurrentMoment () {
    // __now is just for testing
    return moment(this.options.__now || void 0).tz(this.options.timezone)
  }

  getCurrentDate () {
    return this.getCurrentMoment().subtract(this.options.dailyCutoff, 'm').format('YYYYMMDD')
  }

  getNextCutoff () {
    const cutoff = this.options.dailyCutoff
    const current = this.getCurrentMoment()

    // eslint-disable-next-line no-magic-numbers
    const nextCutoff = current.clone().hour(23).minute(59).second(60).millisecond(0).add(cutoff, 'm')
    const thisCutoff = current.clone().startOf('day').add(cutoff, 'm')

    return current.isBefore(thisCutoff) ? thisCutoff : nextCutoff
  }

  fetch (options) {
    const date = this.getCurrentDate()
    const url = this.options.url.replace('{date}', date)

    if (this.__lastDate && date !== this.__lastDate) {
      // Clear parsed game IDs if we are on a new day
      this.__parsedIds = []
    }

    this.__lastDate = date

    this.logger.info('[FETCH]', url)

    parse(url, this.options.parse, (err, events) => {
      if (err) {
        this.logger.error('[FETCH]', err)
        this.emit('error', err)
        this.nextFetch()
        return
      }
      this.parse(events, options)
    })
  }

  parse (allEvents, options) {
    const initial = !!(options && options.initial)
    const notParsed = allEvents.filter((event) => this.__parsedIds.indexOf(event.id) === -1)
    const newlyCompleted = notParsed.filter((event) => event.status.completed)
    const eventsLeft = notParsed.filter((event) => !_.find(newlyCompleted, {id: event.id}))

    this.logger.info('[PARSE]', JSON.stringify({
      initial,
      total: allEvents.length,
      ignored: this.__parsedIds.length,
      pending: eventsLeft.length,
      completed: newlyCompleted.length
    }))

    newlyCompleted.forEach((event) => {
      this.__parsedIds.push(event.id)
      // Only emit games if this is not the initial fetch
      if (!initial) {
        this.logger.info('[EVENT]', event.id)
        this.emit('event', event)
      }
    })

    const nextUntil = _.minBy(eventsLeft, 'status.timeUntil')
    const nextRemaining = _.minBy(eventsLeft, 'status.timeRemaining')

    if (eventsLeft.length === 0) {
      // There are no games today or no more new games so wait until tomorrow
      this.logger.info('[NEXT]', 'Waiting until tomorrow')
      this.nextFetch(this.getNextCutoff().diff(this.getCurrentMoment()))
    } else if (eventsLeft.every((event) => event.status.state === 'pre') && nextUntil) {
      // There are games today but none have started, try and get the time of the first game
      this.logger.info('[NEXT]', 'Waiting for first event')
      this.nextFetch(nextUntil.status.timeUntil)
    } else if (eventsLeft.find((event) => event.status.state === 'in') && nextRemaining) {
      // There is at least one in progress game, wait for the time in the next closest game
      this.logger.info('[NEXT]', 'Waiting for next event to finish')
      this.nextFetch(nextRemaining.status.timeRemaining)
    } else {
      // Something else happened?
      this.logger.info('[NEXT]', 'Unknown state, waiting 1hr')
      this.nextFetch(ms('1hr'))
    }
  }

  nextFetch (requestedTimeout) {
    // Always wait at least the interval
    const timeout = Math.max(requestedTimeout || 0, this.options.interval)

    this.logger.info('[NEXT]', JSON.stringify({
      display: ms(timeout),
      requested: requestedTimeout,
      actual: timeout
    }))

    this.emit('next', timeout)
    this.__timeoutId = setTimeout(() => this.fetch(), timeout)
  }
}

module.exports = ScoreEmitter
