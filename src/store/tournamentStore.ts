import { matches } from "../data/matches";
import { players } from "../data/players";

export const tournamentStore = {
  tournament: {
    name: "9. Hürth Open",
    date: "18.07.2026 – 02.08.2026",
    club: "TC Rot-Weiß Hürth-Gleuel",
    sponsor: "DMF Consulting GmbH",
    courts: 5,
    reserveCourt: 6,
    competitions: 10,
  },

  players,
  matches,

  get liveMatches() {
    return this.matches.filter((match) => match.status === "live");
  },

  get plannedMatches() {
    return this.matches.filter((match) => match.status === "planned");
  },

  get doneMatches() {
    return this.matches.filter((match) => match.status === "done");
  },

  get clubs() {
    return ["Alle", ...Array.from(new Set(this.players.map((player) => player.club)))];
  },
};