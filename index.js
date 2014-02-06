var EventEmitter = require('events').EventEmitter,
    bucker = require('bucker'),
    request = require('request'),
    util = require('util'),
    moment = require('moment'),
    _ = require('lodash'),
    cheerio = require('cheerio');

var rRegion = / ([A-Za-z]*) REGION /i,
    rFinalFour = /FINAL FOUR/,
    rChampionship = /NATIONAL CHAMPIONSHIP/i;

var parseTeam = function ($team) {
    var seed = $team.find('.team-name span:first-child').text();
    return {
        name: $team.find('.team-name a[title]').attr('title'),
        seed: isNaN(seed) ? null : parseInt(seed, 10),
        isWinner: $team.find('.winner-arrow').css('display') === 'block'
    };
};

var parseRegion = function ($game) {
    var gameNote = $game.find('.game-note').text();

    var region = (gameNote.match(rRegion) || [])[1];
    var finalFour = (gameNote.match(rFinalFour) || [])[0];
    var championship = (gameNote.match(rChampionship) || [])[0];
    
    return (region || finalFour || championship || '').toUpperCase() || null;
};

function ScoreTracker(options) {
    options || (options = {});
    _.defaults(options, {
        url: 'http://scores.espn.go.com/ncb/scoreboard?date={date}&confId=100',
        interval: 15 * 60 * 1000,
        ignoreInitial: true
    });

    this.logger = options.logger || bucker.createNullLogger();
    this.options = options;
    this.emissions = [];
    this.interval = null;
    this.date = null;

    EventEmitter.call(this);
}

util.inherits(ScoreTracker, EventEmitter);

ScoreTracker.prototype.start = function () {
    if (!this.interval) {
        this.logger.debug('[START]', 'fetch every', this.options.interval + 'ms');
        this.interval = setInterval(this.request.bind(this), this.options.interval);
        this.request(this.options.ignoreInitial);
    }
    return this;
};

ScoreTracker.prototype.stop = function () {
    if (this.interval) {
        this.logger.debug('[STOP]');
        clearInterval(this.interval);
    }
};

ScoreTracker.prototype.request = function (ignore) {
    var date = moment().subtract('hours', 5).format('YYYYMMDD');
    if (this.date && date !== this.date) {
        // Clear emitted game IDs if we are on a new day
        this.emissions = [];
    }
    var url = this.options.url.replace('{date}', this.date = date);
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            this.logger.debug('[PARSE]', url);
            this.parse(body, ignore);
        } else {
            this.logger.error('[REQUEST]', error);
            this.emit('error', error, response.statusCode);
        }
    }.bind(this));
};

ScoreTracker.prototype.parse = function (body, ignore) {
    var $ = cheerio.load(body);
    var idSuffix = '-gameHeader';
    var $games = $('[id$=' + idSuffix + '].final-state');
    var self = this;

    self.logger.debug('[GAMES]', $games.length - this.emissions.length);
    $games.each(function () {
        var $game = $(this);
        var id = $game.attr('id').replace(idSuffix, '');
        if (ignore) {
            self.logger.debug('[IGNORE]', id);
            self.emissions.push(id);
        } else if (!_.contains(self.emissions, id)) {
            self.logger.debug('[EMIT]', id);
            self.emit('game', {
                id: id,
                region: parseRegion($game),
                home: parseTeam($game.find('.home')),
                visitor: parseTeam($game.find('.visitor'))
            });
            self.emissions.push(id);
        } else {
            self.logger.debug('[ALREADY EMITTED]', id);
        }
    });
};

module.exports = ScoreTracker;
