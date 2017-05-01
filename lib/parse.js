'use strict'

const jsdom = require('jsdom')
const _ = require('lodash')
const moment = require('moment')
const ms = require('ms')

const STATES = {
  PRE: 'pre',
  POST: 'post',
  IN: 'in'
}

// Strip out stiff that we'll never need but retain some stuff for easier debugging
const overwrite = (obj, omitKeys, newObj) => Object.assign({}, _.omit(obj, omitKeys), newObj)
const omitKeys = {
  event: ['links', 'season', 'weather'],
  competitor: ['records', 'probables', 'leaders', 'statistics', 'uid', 'id', 'type', 'linescores'],
  team: ['links', 'venue', 'logo', 'location', 'color', 'uid', 'id', 'isActive'],
  competition: [
    'leaders', 'notes', 'venue', 'odds', 'broadcasts', 'attendance', 'neutralSite',
    'uid', 'conferenceCompetition', 'geoBroadcasts', 'timeValid', 'id', 'headlines'
  ]
}

const parseRaw = (e) => overwrite(e, omitKeys.event, {
  competitions: e.competitions.map((c) => overwrite(c, omitKeys.competition, {
    competitors: c.competitors.map((co) => overwrite(co, omitKeys.competitor, {
      team: _.omit(co.team, omitKeys.team)
    }))
  }))
})

// Get the rank (seed), whether the team was the winner, and a plethora of names
const parseCompetitor = (c) => {
  const shortName = _.unescape(_.get(c, 'team.shortDisplayName', ''))
  const longName = _.unescape(_.get(c, 'team.displayName', ''))
  const teamName = _.unescape(_.get(c, 'team.name', ''))
  const abbrv = _.unescape(_.get(c, 'team.abbreviation', ''))
  const name = _.unescape(_.get(c, 'team.displayName', '').replace(_.get(c, 'team.name', ''), '').trim())

  return {
    rank: _.get(c, 'curatedRank.current', null),
    winner: c.winner === true,
    abbrv, // NAU
    shortName, // N Arizona
    longName, // Northern Arizona Lumberjacks
    teamName, // Lumberjacks
    name, // Northern Arizona
    names: [shortName, longName, teamName, name, abbrv].filter(Boolean)
  }
}

const parseSeries = (s) => {
  const playedCompetitions = _.sumBy(_.get(s, 'summary', '1-0').match(/\d+/g), (n) => +n)
  const totalCompetitions = _.get(s, 'totalCompetitions', playedCompetitions)
  const completed = _.get(s, 'completed', playedCompetitions === totalCompetitions)

  return {
    completed,
    totalCompetitions,
    playedCompetitions
  }
}

// A negative time is possible depending on if a event should've started or
// if the fetch returned stale data. For this case, the time should always be
// 0 meaning a refetch will happen as soon as possible
const parseTime = (time) => {
  const parsed = parseInt(time, 10)
  if (_.isNaN(parsed)) return 0
  if (parsed <= 0) return 0
  return parsed || 0
}

// Try to get the most intelligent guess for how much time remains in the event
// Final period and period length are options that can be passed in to better estimate
const parseTimeRemaining = (s) => {
  const period = parseInt(s.period, 10)
  const finalPeriod = parseInt(s.finalPeriod, 10)

  const clock = ms(`${s.clock}s`)
  const periodLength = typeof s.periodLength === 'string' ? ms(s.periodLength) : s.periodLength

  // If no options were supplied then return the time left on the clock
  // which could be too early, but its better to err on checking again quickly than not
  if (!finalPeriod || !periodLength || period >= finalPeriod) {
    return clock
  }

  // Otherwise multiply by the number of periods left
  return ((finalPeriod - period) * periodLength) + clock
}

// The status of the event. Whether its complete and the state [pre, post, in]
// and some info about the time depending if its 'pre' or 'in'
const parseStatus = (s) => {
  const hasWinner = s.hasWinner
  let state = s.type.state
  let completed = !!s.type.completed
  const __now = s.__now

  // Fix for what might've led to an incorrect result being saved.
  // If a game is complete but a winner has not been updated yet then reset the game
  // to not being in progress, since it should only ever log games with a winner
  if (state === STATES.POST && completed && !hasWinner) {
    state = STATES.IN
    completed = false
  }

  return {
    state,
    completed,
    timeRemaining: state === 'in' ? parseTime(parseTimeRemaining(s)) : null,
    timeUntil: state === 'pre' ? parseTime(moment(s.date).diff(moment(__now || void 0))) : null
  }
}

// Look at the notes for the event and determine what region it is for
// This will need to be updated based on the event probably
// TODO: figure out how to update based on event
const parseRegion = (notes) => {
  const matchNote = (regex) => {
    const matched = (notes || []).find((note) => {
      const headline = note.headline
      const matches = headline && headline.match(regex)
      return matches && matches[1]
    })

    return matched ? matched.headline.match(regex)[1].toLowerCase() : null
  }

  const regionNote = matchNote(/\b([\w\s]*) region\b/i)
  const finalFourNote = matchNote(/\b(final four)\b/i)
  const championshipNote = matchNote(/\b(national championship)\b/i)
  const confNote = matchNote(/\b(\w+ conference)\b/i)
  const nbaFinals = matchNote(/\b(nba finals)\b/i)
  const nhlFinals = matchNote(/\b(stanley cup final)\b/i)

  if (regionNote) return regionNote
  if (finalFourNote) return finalFourNote
  if (championshipNote) return championshipNote
  if (confNote) return confNote
  if (nbaFinals) return nbaFinals
  if (nhlFinals) return nhlFinals

  // TODO: NHL data says Eastern/Western Conference when bracket-data uses division
  return null
}

const parseEvent = (e, options) => {
  const c = e.competitions[0]
  const date = e.date
  const notes = c.notes
  const home = _.find(c.competitors, {homeAway: 'home'})
  const away = _.find(c.competitors, {homeAway: 'away'})
  const hasWinner = home.winner === true || away.winner === true
  const status = parseStatus(Object.assign({date, hasWinner}, options, e.status))
  const series = parseSeries(c.series)

  return {
    uid: e.uid,
    id: e.id,
    region: parseRegion(notes),
    series,
    status,
    home: parseCompetitor(home),
    away: parseCompetitor(away),
    seriesCompleted: typeof series.completed === 'boolean' ? series.completed && status.completed : status.completed,
    __raw: parseRaw(e)
  }
}

const parseScores = (url, options, cb) => {
  if (!cb) {
    cb = options
    options = {}
  }

  return jsdom.env(url, {
    // Only process inline JS
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: ['script'],
      SkipExternalResources: true
    },
    done: (err, window) => {
      const closeCb = (err, resp) => {
        window && window.close()
        cb(err, resp)
      }

      if (err) return closeCb(err, null)

      let events

      try {
        events = window.espn.scoreboardData.events
        if (!events || !Array.isArray(events)) {
          throw new Error('Events could not be found or is not an array')
        }
      } catch (parseErr) {
        return closeCb(parseErr, null)
      }

      return closeCb(null, events.map((e) => parseEvent(e, options)))
    }
  })
}

module.exports = parseScores
