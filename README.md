# Scores
===

A node module for tracking scores for NCAA Basketball off of ESPN's website.

### Usage
```
var ScoreTracker = require('scores').ScoreTracker;

var scoreTracker = new ScoreTracker({
  interval: // miliseconds
});

scoreTracker.on('gameChange', function(game) {
  // do something with game object
});

scoreTracker.watch();

```

#### MIT License