import { useState } from "react";
import type { Player } from "../types";

type PlayersProps = {
  players: Player[];
  clubs: string[];
  selectedClub: string;
  onSelectClub: (club: string) => void;
};

type SortMode = "lk" | "name" | "club";

function Players({ players, clubs, selectedClub, onSelectClub }: PlayersProps) {
  const [search, setSearch] = useState("");
  const [competition, setCompetition] = useState("Alle");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("lk");

  const competitionOrder = [
    "Damen Einzel",
    "Damen 40 Einzel",
    "Damen 50 Einzel",
    "Damen 55 Einzel",
    "Herren Einzel",
    "Herren 30 Einzel",
    "Herren 40 Einzel",
    "Herren 50 Einzel",
    "Herren 55 Einzel",
    "Herren 65 Einzel",
  ];

  const competitions = [
    "Alle",
    ...Array.from(new Set(players.map((player) => player.competition))).sort((a, b) => {
      const ia = competitionOrder.indexOf(a);
      const ib = competitionOrder.indexOf(b);

      if (ia === -1 && ib === -1) return a.localeCompare(b, "de");
      if (ia === -1) return 1;
      if (ib === -1) return -1;

      return ia - ib;
    }),
  ];

  const getCompetitionCount = (item: string) => {
    if (item === "Alle") return players.length;
    return players.filter((player) => player.competition === item).length;
  };

  const filteredPlayers = players
    .filter((player) => {
      const matchesSearch =
        player.name.toLowerCase().includes(search.toLowerCase()) ||
        player.club.toLowerCase().includes(search.toLowerCase());

      const matchesClub = selectedClub === "Alle" || player.club === selectedClub;
      const matchesCompetition = competition === "Alle" || player.competition === competition;

      return matchesSearch && matchesClub && matchesCompetition;
    })
    .sort((a, b) => {
      if (sortMode === "name") {
        return a.name.localeCompare(b.name, "de");
      }

      if (sortMode === "club") {
        return a.club.localeCompare(b.club, "de");
      }

      const lkA = Number(String(a.lk).replace(",", "."));
      const lkB = Number(String(b.lk).replace(",", "."));

      return lkA - lkB;
    });

  const visibleCompetitions = competitions.filter((item) => item !== "Alle");

  function shortCompetitionName(item: string) {
    return item.replace(" Einzel", "");
  }

  return (
    <>
      <section className="pageHeader">
        <p>👥 TEILNEHMER</p>
        <h2>Spieler & Vereine</h2>
        <span>Suche nach Spieler, Verein oder Konkurrenz</span>
      </section>

      <section className="playerFilters">
        <input
          type="text"
          placeholder="Spieler oder Verein suchen..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="filterSelects">
          <label>
            Verein
            <select value={selectedClub} onChange={(event) => onSelectClub(event.target.value)}>
              {clubs.map((club) => (
                <option key={club} value={club}>
                  {club}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sortierung
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="lk">Beste LK zuerst</option>
              <option value="name">Name A-Z</option>
              <option value="club">Verein A-Z</option>
            </select>
          </label>
        </div>

        <div className="competitionChips">
          <button
            type="button"
            className={competition === "Alle" ? "active" : ""}
            onClick={() => setCompetition("Alle")}
          >
            Alle <span>{getCompetitionCount("Alle")}</span>
          </button>

          {visibleCompetitions.map((item) => (
            <button
              type="button"
              key={item}
              className={competition === item ? "active" : ""}
              onClick={() => setCompetition(item)}
            >
              {shortCompetitionName(item)} <span>{getCompetitionCount(item)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="pageHeader" style={{ marginTop: 20 }}>
        <span>
          <b>{filteredPlayers.length}</b> Teilnehmer gefunden
        </span>
      </section>

      <section className="playersList">
        {filteredPlayers.map((player) => (
          <article
            className="playerCard clickablePlayerCard"
            key={`${player.name}-${player.competition}`}
            onClick={() => setSelectedPlayer(player)}
          >
            <div>
              <h3>{player.name}</h3>
              <p>{player.club}</p>
            </div>

            <div className="playerMeta">
              <span>{player.competition}</span>
              <span>LK {player.lk}</span>
              <span>Jg. {player.year}</span>
            </div>
          </article>
        ))}
      </section>

      {selectedPlayer && (
        <div className="playerModalBackdrop" onClick={() => setSelectedPlayer(null)}>
          <section className="playerModal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modalClose" onClick={() => setSelectedPlayer(null)}>
              ×
            </button>

            <div className="playerInitials">
              {selectedPlayer.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>

            <h2>{selectedPlayer.name}</h2>
            <p>{selectedPlayer.club}</p>

            <div className="playerModalMeta">
              <span>🎾 {selectedPlayer.competition}</span>
              <span>🏆 LK {selectedPlayer.lk}</span>
              <span>🎂 Jahrgang {selectedPlayer.year}</span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default Players;