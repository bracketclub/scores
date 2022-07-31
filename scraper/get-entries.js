const scrapeIt = require("scrape-it");
const { fetch } = require("undici");
const { decode } = require("html-entities");
const fs = require("fs/promises");

const espn = {
  $: (s) => `#pane-main ${s}`,
  baseUrl: "https://fantasy.espn.com/tournament-challenge-bracket/2022/en",
  entryUrl: (id) => `${espn.baseUrl}/entry?entryID=${id}`,
  groupUrl: (id) => `${espn.baseUrl}/api/v7/group?groupID=${id}&length=50`,
  bracket: (picks) => {
    const final = "FF";

    // The scraper returns an array of picks, the index of each pick
    // in that list corresponds to a value here
    const order = {
      W: [0, 1, 2, 3, 4, 5, 6, 7, 32, 33, 34, 35, 48, 49, 56],
      E: [8, 9, 10, 11, 12, 13, 14, 15, 36, 37, 38, 39, 50, 51, 57],
      S: [16, 17, 18, 19, 20, 21, 22, 23, 40, 41, 42, 43, 52, 53, 58],
      MW: [24, 25, 26, 27, 28, 29, 30, 31, 44, 45, 46, 47, 54, 55, 59],
      [final]: [60, 61, 62],
    };

    const teams = {};
    const get = (name, pick, region) => {
      if (pick && region === final) {
        return teams[name];
      }
      return pick;
    };
    const put = (pick, region) => {
      if (region !== final) {
        teams[pick.name] = region;
      }
      return pick;
    };

    return Object.entries(order).reduce(
      (brackets, [region, games]) => (
        (brackets.entry += region),
        (brackets.main += region),
        games
          .map((game) => put(picks[game], region))
          .map(({ name, pick, actual }) => [
            get(name, pick, region),
            get(name, actual, region) ?? "X",
          ])
          .reduce(
            (brackets, [e, m]) => (
              (brackets.entry += e), (brackets.main += m), brackets
            ),
            brackets
          )
      ),
      { entry: "", main: "" }
    );
  },
};

const int = (s) => ({
  selector: s,
  convert: (d) => (d ? parseInt(d, 10) : null),
});

const getBracket = async (id) =>
  scrapeIt(espn.entryUrl(id), {
    score: int(espn.$(".value.points")),
    ppr: int(espn.$(".ppr .value")),
    picks: {
      listItem: espn.$(".mW .matchup"),
      data: {
        pick: int(".selectedToAdvance .seed"),
        actual: int(".actual.winner .seed"),
        name: ".selectedToAdvance .abbrev",
      },
    },
  }).then(({ data }) => ({
    ...espn.bracket(data.picks),
    score: data.score,
    ppr: data.ppr,
  }));

const getGroup = async (id) => {
  const res = await fetch(espn.groupUrl(id));
  const data = await res.json();
  return Promise.all(
    data.g.e.map(async (e) => ({
      ...(await getBracket(e.id)),
      id: e.id,
      user: decode(e.n_d),
      entryName: decode(e.n_e),
    }))
  );
};

getGroup(process.argv[2])
  .then((d) => JSON.stringify(d, null, 2))
  .then((d) => fs.writeFile("entries.json", d).then(() => d))
  .then(console.log)
  .catch(console.error);
