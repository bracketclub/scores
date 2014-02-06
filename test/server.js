var Scores = require('../index');
var program = require('commander');
var modulePackage = require('../package.json');

program
  .version(modulePackage.version)
  .option('-m, --minutes [minutes]', 'Interval in minutes', Number, 10)
  .parse(process.argv);

var logger = require('bucker').createLogger({
        console: {
            colors: true
        },
        level: 'info'
    });

var s = new Scores({
    logger: logger,
    interval: program.minutes * 60 * 1000,
    url: 'http://scores.espn.go.com/ncb/scoreboard?date={date}&confId=50'
});

s.on('game', function (data) {
    logger.info('[GAME]', JSON.stringify(data));
});

s.start();