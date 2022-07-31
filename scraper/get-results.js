const Data = require("bracket-data");
const P = require("bracket-possibilities");
const Score = require("bracket-scorer");
const Updater = require("bracket-updater");
const Validator = require("bracket-validator");
const assert = require("assert");
const { pick } = require("lodash");
const binaryCombinations = require("bracket-possibilities/lib/binary-combinations");
const { nextGame } = require("bracket-possibilities/lib/each-game");
const log = require("single-line-log").stdout;
const fs = require("fs");

const o = { sport: "ncaam", year: "2022" };
const data = Data(o);
const poss = new P(o);
const updater = new Updater(o);
const validator = new Validator(o);

const raw = require("./data.json");
const master = raw[0].main;
const gamesLeft = master.match(/X/g)?.length ?? 0;
const combinations = binaryCombinations(gamesLeft);
const col = (x) =>
  x.toString().padStart(combinations.length.toString().length, " ");

const entries = raw.map(({ entry, user, entryName }) => ({
  name: user + " / " + entryName,
  bracket: entry,
}));

const results = entries.reduce((acc, { name }) => {
  const canWin = poss.canWin({
    entries,
    master,
    findEntry: (b) => b.name === name,
  });
  acc[name] = {
    winners: [],
    canWin: !!canWin,
  };
  return acc;
}, {});

const display = () =>
  Object.entries(results)
    .sort(([, a], [, b]) => b.winners.length - a.winners.length)
    .map(([name, data]) => [col(data.winners.length), name, data.canWin]);

// make sure my scores match espns so i can be trusted
raw.forEach((entry) => {
  const s = new Score({
    sport: "ncaam",
    year: "2022",
    entry: entry.entry,
    master,
  });

  assert.equal(s.standard(), entry.score);
  assert.equal(s.standard() + s.standardPPR(), entry.ppr);
});

combinations.forEach((combo, index) => {
  const finalMaster = combo.reduce((memo, c) => {
    return updater.update({
      currentMaster: memo,
      ...nextGame(
        validator.validate(memo),
        ({ prevRound, game, region, gameIndex }) => {
          if (game === null) {
            return {
              fromRegion: region.id,
              winner: pick(prevRound[gameIndex * 2 + c], "seed", "name"),
              playedCompetitions: prevRound[gameIndex * 2 + c].winsIn,
            };
          }
        }
      ),
    });
  }, master);

  const s = new Score({
    sport: "ncaam",
    year: "2022",
    entry: entries,
    master: finalMaster,
  });

  const ranked = s.standard().sort((a, b) => b.score - a.score);
  const winners = [
    ranked[0],
    // ties
    ...ranked.slice(1).filter((s) => s.score === ranked[0].score),
  ];

  winners.forEach((w) => results[w.name].winners.push(finalMaster));

  log(
    [
      `${col(index)} of ${combinations.length}`,
      ...display().map((l) => l.slice(0, 2).join(" -- ")),
    ].join("\n")
  );
});

console.clear();
console.log(
  display()
    .map(([winners, name, canWin]) =>
      [winners, (canWin ? "✅" : "❌") + " " + name].join(" -- ")
    )
    .join("\n")
);

fs.writeFileSync("./results.json", JSON.stringify(results, null, 2));
