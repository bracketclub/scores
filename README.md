scores
==============

Track the completion of sports games from a URL.

[![NPM](https://nodei.co/npm/scores.png)](https://nodei.co/npm/scores/)

[![Build Status](https://travis-ci.org/tweetyourbracket/scores.png?branch=master)](https://travis-ci.org/tweetyourbracket/scores)


## Usage
```js
var Scores = require('scores');

var scores = new Scores({
    // Default: 15min
    interval: 30 // minutes,
    // If you change the URL you'll probably want to override `Scores.prototype.parse`
    url: 'http://place-where-scores-are.com'
});

// Will be fired on the completion of each game
scores.on('game', function(game) {
    /* game
    {
        id: 'AN_ID_FROM_THE_DOM_NODE_123',
        region: 'MIDWEST', // or null if there is no region
        home: {
            name: ['Home Team Name', 'Home team alt name'],
            seed: 5, // Or null is there is no seed/rank
            isWinner: false
        },
        visitor: {
            name: ['Visitor Team Name'],
            seed: 12, // Or null is there is no seed/rank
            isWinner: true
        }
    }
    */
});

scores.start();
```

## How does it work?

It intermittently parses the DOM of the URL to see if any games have been completed. The `parse` method is tied to the DOM structure, so if you are using a different URL, you'll want to change how that method parses the DOM to find completed games.

There is also logic (again, based on the DOM) for what to do in situations where there are no games that day or none of the games have started. If you want this behavior, you'll have to implement it in your modified parse method. See [the original code](https://github.com/tweetyourbracket/scores/blob/master/index.js#L175-L191) for an example.

## API

#### `new Scores(options)`

- `options.interval (Integer, default: 15)` Interval in minutes for how often to request the url
- `options.maxInterval (Integer, default: null)` If a maxInterval is set, the `interval` will be backed off by 50% each time if there are no game events until it reaches the maxInterval.
- `options.timezone (String, default: 'America/New_York')` A [moment-timezone](http://momentjs.com/timezone/data/) string for which timezone you want to base dates off
- `options.dailyCutoff (Integer, default: 180)` The amount of minutes after midnight that the date should switch. This allows you to keep checking for the games that might go past midnight.
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
- `scores.on('setTimeout', function (timeInMsUntilNextReq) {})`

## MIT License