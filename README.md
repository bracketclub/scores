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

#### Game Object
```
{ 
  id: 'HawaiivUCSantaBarbara20132702', // <home team>v<visitor team><date>
  startTime: 'Wed Feb 27 2013 22:00:00 GMT-0700',
  status: 'scheduled',
  winner: false, // 'home', 'visitor', false
  home: { 
    team: 'Hawaii', 
    score: 0
  },
  visitor: { 
    team: 'UC Santa Barbara', 
    score: 0
  }
}

```

#### MIT License