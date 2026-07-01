import { useState } from "react";
import type { Player } from "../types";

type PlayersProps = {
  players: Player[];
  clubs: string[];
  selectedClub: string;
  onSelectClub: (club: string) => void;
};

function Players({ players, clubs, selectedClub, onSelectClub }: PlayersProps) {
  const [search, setSearch] = useState("");
  const [competition, setCompetition] = useState("Alle");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const competitions = ["Alle", ...Array.from(new Set(players.map((player) => player.competition)))];

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.name.toLowerCase().includes(search.toLowerCase()) ||
      player.club.toLowerCase().includes(search.toLowerCase());

    const matchesCompetition = competition === "Alle" || player.competition === competition;

    return matchesSearch && matchesCompetition;
  });

  return (
    <>
      <section className="pageHeader">
        <p>👥 TEILNEHMER</p>
        <h2>Spieler & Vereine</h2>
        <span>Suche nach Spieler, Verein oder Konkurrenz</span>
      </section>

      {selectedPlayer && (
        <section className="playerDetail">
          <button type="button" onClick={() => setSelectedPlayer(null)}>
            Schließen
          </button>

          <h2>{selectedPlayer.name}</h2>
          <p>{selectedPlayer.club}</p>

          <div className="playerMeta">
            <span>{selectedPlayer.competition}</span>
            <span>LK {selectedPlayer.lk}</span>
            <span>Jg. {selectedPlayer.year}</span>
          </div>
        </section>
      )}

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
            Konkurrenz
            <select value={competition} onChange={(event) => setCompetition(event.target.value)}>
              {competitions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="playersList">
        {filteredPlayers.map((player) => (
          <article
            className="playerCard"
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
    </>
  );
}

export default Players;