var Scores = require('../index');
var program = require('commander');
var modulePackage = require('../package.json');

program
  .version(modulePackage.version)
  .option('-m, --minutes [minutes]', 'Interval in minutes', Number, 10)
  .option('-x, --max [max]', 'Max interval in minutes', Number, 0)
  .option('-d, --date [date]', 'Date to check', String, '{date}')
  .parse(process.argv);

var logger = require('bucker').createLogger({
        console: {
            colors: true
        },
        level: 'info'
    });

var s = new Scores({
    logger: logger,
    interval: program.minutes,
    maxInterval: program.max ? program.max : null,
    url: 'http://scores.espn.go.com/ncb/scoreboard?date=' + program.date + '&confId=50',
    timezone: 'America/New_York',
    dailyCutoff: 180,
    ignoreInitial: true
});

s.on('game', function (data) {
    logger.info('[GAME]', JSON.stringify(data));
});

s.start();