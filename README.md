# Scores
==============

A node module for tracking scores for NCAA Basketball off of ESPN's website (or any other URL you want to parse).

## Usage
```js
var Scores = require('scores');

var scores = new Scores({
    // Default: 15min
    interval: 5 * 60 * 1000 // miliseconds,
    // If you change the URL you'll probably want to change `Scores.prototype.parse`
    // Default: ESPN's men's NCAA basketball tournament scoreboard
    url: 'http://place-where-scores-are.com'
});

scores.on('game', function(game) {
    /* game
    {
        id: 'AN_ID_FROM_THE_DOM_NODE_123',
        region: 'MIDWEST', // or null if there is no region
        home: {
            name: 'Home Team Name',
            seed: 5, // Or null is there is no seed/rank
            isWinner: false
        },
        visitor: {
            name: 'Visitor Team Name',
            seed: 12, // Or null is there is no seed/rank
            isWinner: true
        }
    }
    */
});

scores.start();
```

## API

#### `new Scores(options)`

- `options.interval (Integer, default: 900000)` Interval in milliseconds for how often to request the url
- `options.url (String)` The url to request. `{date}` will be replaced with today's date as `YYYYMMDD`
- `options.ignoreInitial (Boolean, default: true)` A boolean whether to ignore any already completed games on the initial request
- `options.logger` A [bucker](http://github.com/nlf/bucker) compatible instance which will log interesting things

#### `methods`

- `start()` Start the interval to watch for new games
- `stop()` Stop watching
- `parse(html, ignore)` Parse some `html`. Will emit `game` events. Will `ignore` any already completed games.
- `request(ignore)` Request the url. Will pass `ignore` and the requested `html` to `parse()`. Will emit any `error` events from the request.

#### `events`

- `scores.on('game', function (data) {})`
- `scores.on('error', function (error, responseCode) {})`

## MIT License