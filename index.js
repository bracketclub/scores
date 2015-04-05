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
    var $teamName = $team.find('.team-name a[title]');
    return {
        name: _.uniq(_.compact([$teamName.attr('title'), $teamName.text()])),
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

var parseTime = function ($, game) {
    var status = $(game).find('.game-status').text() || '';
    var matches = status.match(/([0-9]{1,2}):([0-9]{1,2}) ([AP]M)/i).slice(1, 4);
    if (matches.length === 3) {
        return {
            hours: parseInt(matches[0]),
            minutes: parseInt(matches[1]),
            period: matches[2].toUpperCase()
        };
    } else {
        return null;
    }
};

var ms = function (m) {
    return m * 60 * 1000;
};

function ScoreTracker(options) {
    options || (options = {});
    _.defaults(options, {
        url: 'http://scores.espn.go.com/ncb/scoreboard?date={date}&confId=100',
        interval: 15,
        maxInterval: null,
        timezone: 'America/New_York',
        dailyCutoff: 180,
        ignoreInitial: true,
        __now: null
    });

    this.logger = options.logger || bucker.createNullLogger();
    this.options = options;
    this.emissions = [];
    this.timeout = null;
    this.lastInterval = null;
    this.currentInterval = null;
    this.lastDate = null;
    this.__now = options.__now;

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

ScoreTracker.prototype._next = function (interval) {
    var m = (this.__now || moment()).tz(this.options.timezone);
    var cutoff;
    var nextMoment;
    if (_.isObject(interval)) {
        interval =
            m.clone()
            .hour(interval.period === 'PM' && interval.hours !== 12 ? interval.hours + 12 : interval.hours)
            .minute(interval.minutes).second(0).millisecond(0)
            .diff(m.clone());
        this.lastInterval = null;
    } else if (interval === 'tomorrow') {
        // "tomorrow" is midnight in our timezone + our dailyCutoff
        // so that the next request will be made once our "YYYYMMDD" has changed
        cutoff = m.clone().startOf('day').add(this.options.dailyCutoff, 'm');

        if (m.isBefore(cutoff)) {
            nextMoment = cutoff.clone();
        } else {
            nextMoment = m.clone()
                .hour(23).minute(59).second(60).millisecond(0)
                .add(this.options.dailyCutoff, 'm');
        }

        interval = nextMoment.diff(m.clone());
        this.lastInterval = null;
    } else if (interval === 'backoff') {
        // Backoff is half of the interval until the max interval
        interval = Math.min(this.lastInterval ? this.lastInterval + (this.lastInterval * 0.5) : ms(this.options.interval), ms(this.options.maxInterval));
        this.lastInterval = interval;
    } else if (typeof interval === 'number') {
        interval = ms(interval);
        this.lastInterval = null;
    } else {
        interval = ms(this.options.interval);
        this.lastInterval = interval;
    }

    if (interval <= 0) {
        interval = ms(this.options.interval);
        this.lastInterval = interval;
    }

    this.currentInterval = interval;
    this.logger.info('[NEXT]', interval + 'ms');
    this.timeout = setTimeout(this.request.bind(this), interval);
    this.emit('setTimeout', interval);
};

ScoreTracker.prototype.request = function (ignore) {
    var date = (this.__now || moment()).tz(this.options.timezone).subtract(this.options.dailyCutoff, 'm').format('YYYYMMDD');
    if (this.lastDate && date !== this.lastDate) {
        // Clear emitted game IDs if we are on a new day
        this.emissions = [];
    }
    var url = this.options.url.replace('{date}', this.lastDate = date);
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            this.logger.info('[PARSE]', url);
            this.parse(body, ignore);
        } else {
            this.logger.error('[REQUEST]', error);
            this.emit('error', error, response.statusCode);
            this._next();
        }
    }.bind(this));
};

ScoreTracker.prototype.parse = function (body, ignore) {
    var $ = cheerio.load(body);
    var idSuffix = '-gameHeader';
    var $totalGames = $('[id$=' + idSuffix + ']');
    var $finalGames = $totalGames.filter('.final-state');
    var $toStartGames = $totalGames.filter('.preview');
    var newGamesCount = _.without($finalGames.map(function () { return $(this).attr('id').replace(idSuffix, ''); }), this.emissions).length;
    var emitGameCount = 0;
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
            emitGameCount++;
        } else {
            self.logger.debug('[ALREADY EMITTED]', id);
        }
    });

    if ($totalGames.length === 0 || $totalGames.length === $finalGames.length) {
        // There are no games today so wait until tomorrow
        this._next('tomorrow');
    } else if ($toStartGames.length === $totalGames.length) {
        // There are games today but none have started, try and get the time of the first game
        var time = _.chain($toStartGames).map(_.partial(parseTime, $)).compact().value().sort(function (a, b) {
            if (a.period < b.period) return -1;
            if (a.period > b.period) return 1;

            if (a.hours === 12 && b.hours !== 12) return -1;
            if (b.hours === 12 && a.hours !== 12) return 1;

            if (a.hours < b.hours) return -1;
            if (a.hours > b.hours) return 1;

            if (a.minutes < b.minutes) return -1;
            if (a.minutes > b.minutes) return 1;

            return 0;
        })[0];
        if (time && _.has(time, 'hours') && _.has(time, 'minutes') && _.has(time, 'period')) {
            this._next(time);
        } else {
            this._next('backoff');
        }
    } else if (emitGameCount === 0 && this.options.maxInterval) {
        // No games have finished, so backoff a little
        this._next('backoff');
    } else {
        this._next();
    }
};

module.exports = ScoreTracker;
