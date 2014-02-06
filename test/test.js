var assert = require('assert');
var ScoreTracker = require('../index');
var s = new ScoreTracker();
var fs = require('fs');
var path = require('path');


describe('Parser', function () {

    it('It should return the correct games from the parser for first round day', function (done) {
        var games = [];
        s.on('game', function (game) {
            games.push(game);

            if (game.id === "330810150") {
                assert.equal(game.home.isWinner, true);
                assert.equal(game.home.name, "Duke");
                assert.equal(game.home.seed, 2);
                assert.equal(game.region, "MIDWEST");
            }

            if (games.length === 16) {
                done();
            }
        });
        s.parse(fs.readFileSync(path.resolve('./test/data/20130322.html')));
    });

    it('It should return the correct games from the parser for second round day', function (done) {
        var games = [];
        s.on('game', function (game) {
            games.push(game);

            if (game.id === "330822250") {
                assert.equal(game.visitor.isWinner, true);
                assert.equal(game.visitor.name, "Wichita State");
                assert.equal(game.visitor.seed, 9);
                assert.equal(game.region, "WEST");
            }

            if (games.length === 8) {
                done();
            }
        });
        s.parse(fs.readFileSync('./test/data/20130323.html'));
    });

    

});