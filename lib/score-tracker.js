var EventEmitter = require('events').EventEmitter,
    request = require('request'),
    util = require('util'),
    moment = require('moment'),
    jsdom = require('jsdom');

var ScoreTracker = function(options) {
  EventEmitter.call(this);

  var scoresUrl = "http://scores.espn.go.com/ncb/scoreboard?date={date}&confId=50";
  var interval = (15*60*1000); // default: 15 minutes
  var watching = false;

  if(options && options.hasOwnProperty('interval')) {
    interval = options.interval;
  }

  function getPage() {
    var date = moment();
    scoresUrl = scoresUrl.replace('{date}', date.format('YYYYMMDD'));

    request(scoresUrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        jsdom.env(
          body,
          ["http://code.jquery.com/jquery.js"],
          function(errors, window) {
            var games = window.$('.gameDay-Container .score-row');
            processScores(window.$, games);
          }
        );
      }
    });
  }

  function processScores($, $els) {
    var games = [];

    $els.each(function(idx, item) {
      var matchups = $(item).find('div');

      matchups.each(function(jdx, gameDiv) {
        console.log($(gameDiv).html());
        var game = {
          startTime: $(gameDiv).find('.game-status p').text(),
          home: $(gameDiv).find('.home .team-name span a').text(),
          visitor: $(gameDiv).find('.visitor .team-name span a').text()
        };

        if(game.startTime !== '') {
          games.push(game);
        }
      });

    });
    console.log(games);
  }

  var ST = {

    // EventEmitter Methods
    addListener: this.addListener,
    on: this.on,
    once: this.once,
    removeListener: this.removeListener,
    removeAllListeners: this.removeAllListeners,
    emit: this.emit,
    listeners: this.listeners,

    watch: function() {
      if(!watching) {
        getPage();
        setInterval(getPage, interval);
        watching = true;
      }
    }
  };

  return ST;

};

util.inherits(ScoreTracker, EventEmitter);

module.exports = ScoreTracker;