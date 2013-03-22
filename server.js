var ScoreTracker = require('./index').ScoreTracker;

var st = new ScoreTracker({interval: 60000});

st.on('gameChange', function(game) {
  console.log('Game Change:');
  console.log(game);
});

st.on('gameFinal', function(game) {
  console.log('Game Final:');
  console.log(game);
});

debugger;

st.watch();

console.log('Watching ESPN Game Feed');