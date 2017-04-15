'use strict'

const {spawnSync} = require('child_process')
const {EventEmitter} = require('events').EventEmitter
const moment = require('moment-timezone')
const _ = require('lodash')
const bucker = require('bucker')
const ms = require('ms')
const parse = require('./parse')

// I think this is always the last two items
const systemTimezone = () => {
  let tz = null
  try {
    tz = spawnSync('/bin/ls', ['-l', '/etc/localtime'])
      .stdout
      .toString()
      .trim()
      .split('/')
      .slice(-2)
      .join('/')
  } catch (e) {
    tz = null
  }
  return tz
}

class ScoreEmitter extends EventEmitter {
  constructor (options) {
    super()

    this.options = _.defaults(options, {
      url: null,
      logger: bucker.createNullLogger(),
      interval: ms('5m'),
      timezone: systemTimezone() || 'America/New_York',
      dailyCutoff: 180,
      completed: { seriesCompleted: true },
      filter: _.stubTrue,
      parse: {
        finalPeriod: null,
        periodLength: null,
        __now: null
      },
      __now: null,
      __skippedIds: []
    })

    if (typeof this.options.interval === 'string') {
      this.options.interval = ms(this.options.interval)
    }

    if (this.options.__now && !this.options.parse.__now) {
      this.options.parse.__now = this.options.__now
    }

    this.logger = this.options.logger
    this.__skippedIds = this.options.__skippedIds

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

    // Add one minute to the cutoff always. This avoids a rounding bug where sometimes once the
    // timeout to this cutoff is triggered, it is actually less than a second before the cutoff
    // so it completely misses the next days games
    return (current.isBefore(thisCutoff) ? thisCutoff : nextCutoff).add(1, 'm')
  }

  fetch (options) {
    const date = this.getCurrentDate()
    const url = this.options.url.replace('{date}', date)

    if (this.__lastDate && date !== this.__lastDate) {
      // Clear completed game IDs if we are on a new day
      this.__skippedIds = []
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
    const completedOnly = !!this.options.completed
    const filteredEvents = _.filter(allEvents, this.options.filter)

    this.logger.debug('[ALL]', JSON.stringify(allEvents))
    this.logger.debug('[FILTERED]', JSON.stringify(filteredEvents))

    // Emit for completed events only after the initial fetch
    const shouldEmit = completedOnly ? !(options && options.initial) : true

    const available = filteredEvents.filter((event) => this.__skippedIds.indexOf(event.id) === -1)

    const found = _.filter(available, completedOnly ? this.options.completed : _.stubTrue)
    const eventsLeft = available.filter((event) => completedOnly ? !_.find(found, {id: event.id}) : event.status.state !== 'post')

    this.logger.info('[PARSE]', JSON.stringify({
      emit: shouldEmit,
      total: allEvents.length,
      ignored: this.__skippedIds.length,
      pending: eventsLeft.length,
      found: found.length
    }))

    found.forEach((event) => {
      if (completedOnly) this.__skippedIds.push(event.id)

      if (shouldEmit) {
        this.logger.debug('[EVENT]', event.id)
        this.emit('event', event)
      }
    })

    if (!completedOnly && shouldEmit) {
      this.logger.debug('[EVENTS]', JSON.stringify(found))
      this.emit('events', found)
    }

    // If we are not looking for only completed games then just go by the interval
    const nextUpdate = !completedOnly && this.options.interval

    // Otherwise figure it out based on next starting or remaining
    const nextUntil = _.minBy(eventsLeft, 'status.timeUntil')
    const nextRemaining = _.minBy(eventsLeft, 'status.timeRemaining')

    const allUnstarted = eventsLeft.every((event) => event.status.state === 'pre')
    const anyInProgress = eventsLeft.find((event) => event.status.state === 'in')

    if (eventsLeft.length === 0) {
      // There are no games today or no more new games so wait until tomorrow
      this.logger.info('[NEXT]', 'Waiting until tomorrow')
      this.nextFetch(this.getNextCutoff().diff(this.getCurrentMoment()))
    } else if (allUnstarted && nextUntil) {
      // There are games today but none have started, try and get the time of the first game
      this.logger.info('[NEXT]', 'Waiting for first event')
      this.nextFetch(nextUntil.status.timeUntil)
    } else if (anyInProgress && nextUpdate) {
      // There is at least one in progress game, wait for the interval and check again
      this.logger.info('[NEXT]', 'Waiting for interval to check on next event')
      this.nextFetch(nextUpdate)
    } else if (anyInProgress && nextRemaining) {
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
