var EventEmitter = require('events').EventEmitter,
    bucker = require('bucker'),
    request = require('request'),
    util = require('util'),
    moment = require('moment-timezone'),
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
        maxInterval: null,
        timezone: 'America/New_York',
        dailyCutoff: 180 * 60 * 1000,
        ignoreInitial: true
    });

    this.logger = options.logger || bucker.createNullLogger();
    this.options = options;
    this.emissions = [];
    this.timeout = null;
    this.lastInterval = null;
    this.date = null;

    EventEmitter.call(this);
}

util.inherits(ScoreTracker, EventEmitter);

ScoreTracker.prototype.start = function () {
    if (!this.timeout) {
        this.logger.info('[START]');
        this.request(this.options.ignoreInitial);
    }
    return this;
};

ScoreTracker.prototype.stop = function () {
    if (this.timeout) {
        this.logger.info('[STOP]');
        clearTimeout(this.timeout);
    }
};

ScoreTracker.prototype.next = function (interval) {
    if (interval === 'tomorrow') {
        // "tomorrow" is midnight in our timezone + our dailyCutoff
        // so that the next request will be made once our "YYYYMMDD" has changed
        interval =
            moment().tz(this.options.timezone)
            .hour(23).minute(59).second(60).millisecond(999)
            .add(this.options.dailyCutoff, 'ms').diff(moment().tz(this.options.timezone));
        // 
        this.lastInterval = null;
    } else if (interval === 'backoff') {
        // Backoff is half of the interval until the max interval
        interval = Math.min(this.lastInterval ? this.lastInterval + (this.options.interval * 0.5) : this.options.interval, this.options.maxInterval);
        this.lastInterval = interval;
    } else {
        interval = this.options.interval;
        this.lastInterval = interval;
    }

    this.logger.info('[NEXT]', interval + 'ms');
    this.timeout = setTimeout(this.request.bind(this), interval);
};

ScoreTracker.prototype.request = function (ignore) {
    var date = moment().tz(this.options.timezone).subtract(this.options.dailyCutoff, 'ms').format('YYYYMMDD');
    if (this.date && date !== this.date) {
        // Clear emitted game IDs if we are on a new day
        this.emissions = [];
    }
    var url = this.options.url.replace('{date}', this.date = date);
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            this.logger.info('[PARSE]', url);
            this.parse(body, ignore);
        } else {
            this.logger.error('[REQUEST]', error);
            this.emit('error', error, response.statusCode);
            this.next();
        }
    }.bind(this));
};

ScoreTracker.prototype.parse = function (body, ignore) {
    var $ = cheerio.load(body);
    var idSuffix = '-gameHeader';
    var $totalGames = $('[id$=' + idSuffix + ']');
    var $finalGames = $totalGames.filter('.final-state');
    var $inProgressGames = $totalGames.filter('.in-progress'); // TODO: confirm this is the right class
    var newGamesCount = $finalGames.length - this.emissions.length;
    var self = this;

    self.logger.info('[GAMES]', newGamesCount);
    $finalGames.each(function () {
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

    if ($totalGames.length === 0) {
        // There are no games today so wait until tomorrow
        this.next('tomorrow');
    } else if (newGamesCount === 0 && $inProgressGames.length === 0) {
        // There are games today but none have started
        // TODO: see if we can get the times of the first game to start and set the next interval for that
        this.next('backoff');
    } else if (newGamesCount === 0 && this.options.maxInterval) {
        // No games have finished, so backoff a little
        this.next('backoff');
    } else {
        this.next();
    }
};

module.exports = ScoreTracker;
