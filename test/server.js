var Scores = require('../index');

var logger = require('bucker').createLogger({
        console: {
            colors: true
        }
    });

var s = new Scores({
    logger: logger,
    url: 'http://scores.espn.go.com/ncb/scoreboard?date={date}&confId=50'
});

s.on('game', function (data) {
    logger.debug('[GAME]', data);
});

s.start();