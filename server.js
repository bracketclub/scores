var ScoreTracker = require('./index').ScoreTracker;

var st = new ScoreTracker();

st.on('gameChange', function(game) {
  console.log('Game Change:');
  console.log(game);
});

st.watch();

console.log('Watching ESPN Game Feed');