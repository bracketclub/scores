# Scores
===

A node module for tracking scores for NCAA Basketball off of ESPN's website.

### Usage
```
var Scores = require('scores');

var scores = new Scores({
    interval: 5 * 60 * 1000 // miliseconds (Default: 15min),
    // If you change the URL you'll probably want to change `Scores.prototype.parse`
    url: 'http://place-where-scores-are.com' // url (Default is ESPN college basketball)
});

scores.on('game', function(game) {
    /* game
    {
        id: 'AN_ID_FROM_THE_URLS_DOM_123',
        region: 'MIDWEST', // or null if there is no region
        home: {
            name: 'Home Team Name',
            seed: 5, // Or null is there is no seed
            isWinner: false
        },
        visitor: {
            name: 'Visitor Team Name',
            seed: 12, // Or null is there is no seed
            isWinner: true
        }
    }
    */
});

scores.start();

```

### API

`new Scores(options)`

- `options.interval` Interval in milliseconds for how often to fetch the url
- `options.url` The url to fetch. `{date}` will be replaced with today's date as `YYYYMMDD`
- `options.ignoreInitial` A boolean whether to ignore any already completed games on the initial fetch
- `options.logger` A [bucker](http://github.com/nlf/bucker) logger instance which will log interesting things

`methods`

- `start()` Start the interval to watch for new games
- `stop()` Stop watching
- `parse(html, ignore)` Parse some `html`. Will `emit` some things. Will `ignore` any already completed games.
- `fetch(ignore)` Request the url. Will pass `ignore` and the fetched `html` to parse. Will `emit` any `error` from the request.

`EventEmitter`

- `scores.on('game', function (data) {})`
- `scores.on('error', function (error, responseCode))`

#### MIT License