var EventEmitter = require('events').EventEmitter,
    request = require('request'),
    util = require('util'),
    moment = require('moment'),
    jsdom = require('jsdom'),
    _ = require('underscore');

var ScoreTracker = function(options) {
  EventEmitter.call(this);

  var scoresUrl = "http://scores.espn.go.com/ncb/scoreboard?date={date}&confId=50";
  var interval = (15*60*1000); // default: 15 minutes
  var watching = false;
  var games = {};

  if(options && options.hasOwnProperty('interval')) {
    interval = options.interval;
  }

  if(options && options.hasOwnProperty('scoresUrl')) {
    scoresUrl = (options.scoresUrl.indexOf('http') === 0) ? options.scoresUrl : scoresUrl.replace(/(\?).*/, '$1' + options.scoresUrl);
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

    $els.each(function(idx, item) {
      var matchups = $(item).find('div.span-2');

      matchups.each(function(jdx, gameDiv) {
        var gameId = null;

        var status = $(gameDiv).find('.game-status p').text();
        var game = {
          id: null,
          startTime: null,
          status: 'scheduled',
          winner: false,
          home: {
            team: $(gameDiv).find('.home .team-name span a').attr('title'),
            score: null
          },
          visitor: {
            team: $(gameDiv).find('.visitor .team-name span a').attr('title'),
            score: null
          }
        };

        if(status.match(/final/ig)) {
          status = 'final';
          game.status = status;
        } else if(status.match(/[\d]:[\d]{2} [AP]M /)) {
          status = moment(moment().format('YYYYMMDD') + ' ' + status.replace('ET', '-0500'), 'YYYYMMDD h:mm A Z').toString();
          game.startTime = status;
        } else {
          game.status = status;
        }

        game.home.score = parseInt($(gameDiv).find('.home ul.score li.final').text(), 10);
        game.visitor.score = parseInt($(gameDiv).find('.visitor ul.score li.final').text(), 10);

        if(status === 'final') {
          if(game.home.score > game.visitor.score) {
            game.winner = 'home';
          } else if (game.home.score < game.visitor.score){
            game.winner = 'visitor';
          }
        }

        gameId = game.home.team.replace(/\s/ig, '') + 'v' + game.visitor.team.replace(/\s/ig, '') + moment().format('YYYYMMDD');

        game.id = gameId;

        if(games.hasOwnProperty(gameId) &&
           !_.isEqual(games[gameId], game)) {
          ST.emit('gameChange', game);
        }

        games[gameId] = game;
      });
    });
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