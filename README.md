scores
==============

Track the completion of sports games from a URL.

[![NPM](https://nodei.co/npm/scores.png)](https://nodei.co/npm/scores/)

[![Build Status](https://travis-ci.org/bracketclub/scores.png?branch=master)](https://travis-ci.org/bracketclub/scores)


## Usage
```js
const Scores = require('scores');

new Scores({
  url: 'http://place-where-scores-are.com',
  interval: '5m', // or a number of ms
  timezone: 'America/New_York',
  dailyCutoff: 180, // in minutes,
  completed: { seriesCompleted: true }, // passed to _.filter to decide if an event is completed
  parse: {
    // Is used to try and guess the ending time of the event
    // In this case we are checking for college basketball where
    // there are two 20 minute halves. Eg NBA would be '12m' and 4
    finalPeriod: 2,
    periodLength: '20m' // or a number of ms
  }
})
// Will be fired on the completion of each game
.on('event', (game) => console.log(game))
// Start the watcher
.start();
```

## How does it work?

It intermittently parses the DOM of the URL to see if any games have been completed. There is also logic for what to do in situations where there are no games that day or none of the games have started, or all the games have finished.

## API

#### `new Scores(options)`

- `options.interval (Integer, default: 15)` Interval in minutes for how often to request the url
- `options.timezone (String, default: 'America/New_York')` A [moment-timezone](http://momentjs.com/timezone/data/) string for which timezone you want to base dates off
- `options.dailyCutoff (Integer, default: 180)` The amount of minutes after midnight that the date should switch. This allows you to keep checking for the games that might go past midnight.
- `options.url (String)` The url to request. `{date}` will be replaced with today's date as `YYYYMMDD`
- `options.logger` A [bucker](http://github.com/nlf/bucker) compatible instance which will log interesting things
- `options.parse (Object)` Options that will be passed directly to the parse method

#### `methods`
- `start()` Start the interval to watch for new games
- `stop()` Stop watching

#### `events`
- `scores.on('event', event => { ... })`
- `scores.on('error', err => { ... })`

## MIT License
