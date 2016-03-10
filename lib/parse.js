'use strict';

const jsdom = require('jsdom');
const _ = require('lodash');
const moment = require('moment');
const ms = require('ms');

// Strip out stiff that we'll never need but retain some stuff for easier debugging
const overwrite = (obj, omitKeys, newObj) => Object.assign({}, _.omit(obj, omitKeys), newObj);
const omitKeys = {
  event: ['links', 'season', 'weather'],
  competitor: ['records', 'leaders', 'statistics', 'uid', 'score', 'id', 'type', 'linescores'],
  team: ['links', 'venue', 'logo', 'location', 'color', 'uid', 'id', 'isActive'],
  competition: [
    'status', 'venue', 'odds', 'broadcasts', 'attendance', 'neutralSite',
    'uid', 'conferenceCompetition', 'geoBroadcasts', 'timeValid', 'id', 'headlines'
  ]
};
const parseRaw = (e) => overwrite(e, omitKeys.event, {
  competitions: e.competitions.map((c) => overwrite(c, omitKeys.competition, {
    competitors: c.competitors.map((co) => overwrite(co, omitKeys.competitor, {
      team: _.omit(co.team, omitKeys.team)
    }))
  }))
});

// Get the rank (seed), whether the team was the winner, and a plethora of names
const parseCompetitor = (c) => {
  const shortName = _.unescape(c.team.shortDisplayName);
  const longName = _.unescape(c.team.displayName);
  const teamName = _.unescape(c.team.name);
  const name = _.unescape(c.team.displayName.replace(c.team.name, '').trim());

  return {
    rank: c.curatedRank.current,
    winner: !!c.winner,
    // N Arizona
    shortName,
    // Northern Arizona Lumberjacks
    longName,
    // Lumberjacks
    teamName,
    // Northern Arizona
    name,
    // All the names
    names: [shortName, longName, teamName, name].filter(Boolean)
  };
};

// A negative time is possible depending on if a event should've started or
// if the fetch returned stale data. For this case, the time should always be
// 0 meaning a refetch will happen as soon as possible
const parseTime = (time) => {
  const parsed = parseInt(time, 10);
  if (_.isNaN(parsed)) return 0;
  if (parsed <= 0) return 0;
  return parsed || 0;
};

// Try to get the most intelligent guess for how much time remains in the event
// Final period and period length are options that can be passed in to better estimate
const parseTimeRemaining = (s) => {
  const period = parseInt(s.period, 10);
  const finalPeriod = parseInt(s.finalPeriod, 10);

  const clock = ms(`${s.clock}s`);
  const periodLength = typeof s.periodLength === 'string' ? ms(s.periodLength) : s.periodLength;

  // If no options were supplied then return the time left on the clock
  // which could be too early, but its better to err on checking again quickly than not
  if (!finalPeriod || !periodLength || period === finalPeriod) {
    return clock;
  }

  // Otherwise multiply by the number of periods left
  return (finalPeriod - period) * periodLength + clock;
};

// The status of the event. Whether its complete and the state [pre, post, in]
// and some info about the time depending if its 'pre' or 'in'
const parseStatus = (s) => {
  const state = s.type.state;
  const completed = !!s.type.completed;
  const __now = s.__now;

  return {
    state,
    completed,
    timeRemaining: state === 'in' ? parseTime(parseTimeRemaining(s)) : null,
    timeUntil: state === 'pre' ? parseTime(moment(s.date).diff(moment(__now || void 0))) : null
  };
};

// Look at the notes for the event and determine what region it is for
// This will need to be updated based on the event probably
// TODO: figure out how to update based on event
const parseRegion = (notes) => {
  const matchNote = (regex) => {
    const matched = (notes || []).find((note) => {
      const headline = note.headline;
      const matches = headline && headline.match(regex);
      return matches && matches[1];
    });

    return matched ? matched.headline.match(regex)[1].toLowerCase() : null;
  };

  const regionNote = matchNote(/\b(\w*) region\b/i);
  const finalFourNote = matchNote(/\b(final four)\b/i);
  const championshipNote = matchNote(/\b(national championship)\b/i);

  if (regionNote) return regionNote;
  if (finalFourNote) return finalFourNote;
  if (championshipNote) return championshipNote;

  return null;
};

const parseEvent = (e, options) => {
  const c = e.competitions[0];
  const status = e.status;
  const date = e.date;
  const notes = c.notes;
  const home = _.find(c.competitors, {homeAway: 'home'});
  const away = _.find(c.competitors, {homeAway: 'away'});

  return {
    uid: e.uid,
    id: e.id,
    region: parseRegion(notes),
    status: parseStatus(Object.assign({date}, options, status)),
    home: parseCompetitor(home),
    away: parseCompetitor(away),
    __raw: parseRaw(e)
  };
};

const parseScores = (url, options, cb) => {
  if (!cb) {
    cb = options;
    options = {};
  }

  return jsdom.env(url, {
    // Only process inline JS
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: ['script'],
      SkipExternalResources: true
    },
    done: (err, window) => {
      if (err) return cb(err, null);

      let events;

      try {
        events = window.espn.scoreboardData.events;
        if (!events || !Array.isArray(events)) {
          throw new Error('Events could not be found or is not an array');
        }
      }
      catch (parseErr) {
        return cb(parseErr, null);
      }

      window.close();
      return cb(null, events.map((e) => parseEvent(e, options)));
    }
  });
};

module.exports = parseScores;
