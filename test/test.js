var assert = require('assert');
var ScoreTracker = require('../index');
var timezone = 'America/New_York';
var dailyCutoff = 180;
var interval = 15;
var maxInterval = 60;
var fs = require('fs');
var path = require('path');
var moment = require('moment-timezone');
var format = "YYYY-MM-DDTHH:mm:ss zz";
var _ = require('lodash');

var nextTomorrow = function (ms) {
    return moment().tz('America/New_York').add(ms, 'ms').format(format);
};
var tomorrowCutoff = function () {
    return moment().tz('America/New_York').add(1, 'd').hours(0).minutes(0).seconds(0).milliseconds(0).add(dailyCutoff, 'm').format(format);
};

describe('Parser', function () {

    it('It should return the correct games from the parser for first round day', function (done) {
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: maxInterval,
            dailyCutoff: dailyCutoff
        });
        var games = [];
        s.on('game', function (game) {
            games.push(game);
        });
        s.on('setTimeout', function (currentInterval) {
            var game = _.find(games, function (g) { return g.id === "330810150"; });
            assert.equal(game.home.isWinner, true);
            assert.equal(game.home.name, "Duke");
            assert.equal(game.home.seed, 2);
            assert.equal(game.region, "MIDWEST");

            assert.equal(games.length, 16);
            assert.equal(nextTomorrow(currentInterval), tomorrowCutoff());
            done();
        });
        s.parse(fs.readFileSync(path.resolve('./test/data/round-one-complete.html')));
    });

    it('It should return the correct games from the parser for second round day', function (done) {
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: maxInterval,
            dailyCutoff: dailyCutoff
        });
        var games = [];
        s.on('game', function (game) {
            games.push(game);
        });
        s.on('setTimeout', function (currentInterval) {
            var game = _.find(games, function (g) { return g.id === "330822250"; });
            assert.equal(game.visitor.isWinner, true);
            assert.equal(game.visitor.name, "Wichita State");
            assert.equal(game.visitor.seed, 9);
            assert.equal(game.region, "WEST");

            assert.equal(games.length, 8);
            assert.equal(nextTomorrow(currentInterval), tomorrowCutoff());
            done();
        });
        s.parse(fs.readFileSync('./test/data/round-two-complete.html'));
    });

    it('It should ignore initial games', function (done) {
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: maxInterval,
            dailyCutoff: dailyCutoff
        });
        var games = [];
        s.on('game', function (game) {
            games.push(game);
        });
        s.on('setTimeout', function (currentInterval) {
            assert.equal(games.length, 0);
            assert.equal(nextTomorrow(currentInterval), tomorrowCutoff());
            done();
        });
        s.parse(fs.readFileSync('./test/data/round-two-complete.html'), true);
    });

    it('It should increase the interval', function (done) {
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: maxInterval,
            dailyCutoff: dailyCutoff
        });
        var count = 0;
        s.on('setTimeout', function (currentInterval) {
            count++;
            s.stop();
            assert.equal(currentInterval, _.reduce(_.range(1, count + 1), function (sum, num) {
                return sum + (sum ? sum * 0.5 : interval * 60 * 1000);
            }, 0));
            if (count === 3) done();
        });
        s.parse(fs.readFileSync('./test/data/in-progress-2nd-rd-2014.html'), true);
        s.parse(fs.readFileSync('./test/data/in-progress-2nd-rd-2014.html'), true);
        s.parse(fs.readFileSync('./test/data/in-progress-2nd-rd-2014.html'), true);
    });

    it('Interval should not increase beyond the max', function (done) {
        var max = 25;
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: max,
            dailyCutoff: dailyCutoff
        });
        var count = 0;
        s.on('setTimeout', function (currentInterval) {
            count++;
            s.stop();
            if (count <= 2) {
                assert.equal(currentInterval, _.reduce(_.range(1, count + 1), function (sum, num) {
                    return sum + (sum ? sum * 0.5 : interval * 60 * 1000);
                }, 0));
            } else {
                assert.equal(currentInterval, max * 60 * 1000);
            }
            if (count === 5) done();
        });
        s.parse(fs.readFileSync('./test/data/in-progress-2nd-rd-2014.html'), true);
        s.parse(fs.readFileSync('./test/data/in-progress-2nd-rd-2014.html'), true);
        s.parse(fs.readFileSync('./test/data/in-progress-2nd-rd-2014.html'), true);
        s.parse(fs.readFileSync('./test/data/in-progress-2nd-rd-2014.html'), true);
        s.parse(fs.readFileSync('./test/data/in-progress-2nd-rd-2014.html'), true);
    });

    it('It should not fetch until the first game', function () {
        var now = moment().hours(12).minutes(0).seconds(0).milliseconds(0);
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: maxInterval,
            dailyCutoff: dailyCutoff,
            __now: now.clone()
        });
        s.parse(fs.readFileSync('./test/data/no-started-games.html'));
        var next = now.clone().tz('America/New_York').add(s.currentInterval, 'ms').format(format);
        var expected = now.clone().tz('America/New_York').hours(19).minutes(0).seconds(0).milliseconds(0).format(format);
        assert.equal(next, expected);
    });

    it('If the first game is in the past, use normal interval', function () {
        var now = moment().hours(9).minutes(16).seconds(0).milliseconds(0);
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: maxInterval,
            dailyCutoff: dailyCutoff,
            __now: now.clone()
        });
        s.parse(fs.readFileSync('./test/data/no-started-games-2014-rd1.html'));
        var next = now.clone().tz('America/New_York').add(s.currentInterval, 'ms').format(format);
        var expected = now.clone().tz('America/New_York').add(interval, 'm').format(format);
        assert.equal(next, expected);
    });

    it('It should not fetch until the first game 12:15pm', function () {
        var now = moment().hours(7).minutes(0).seconds(0).milliseconds(0);
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: maxInterval,
            dailyCutoff: dailyCutoff,
            __now: now.clone()
        });
        s.parse(fs.readFileSync('./test/data/no-started-games-2014-rd1.html'));
        var next = now.clone().tz('America/New_York').add(s.currentInterval, 'ms').format(format);
        var expected = now.clone().tz('America/New_York').hours(12).minutes(15).seconds(0).milliseconds(0).format(format);
        assert.equal(next, expected);
    });

    it('It should not fetch until tomorrow if there are no games', function () {
        var s = new ScoreTracker({
            timezone: timezone,
            interval: interval,
            maxInterval: maxInterval,
            dailyCutoff: dailyCutoff
        });
        s.parse(fs.readFileSync('./test/data/no-games.html'));
        var next = moment().tz('America/New_York').add(s.currentInterval, 'ms').format(format);
        var expected = moment().tz('America/New_York').add(1, 'd').hours(3).minutes(0).seconds(0).milliseconds(0).format(format);
        assert.equal(next, expected);
    });

});