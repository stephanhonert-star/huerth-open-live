import { useMemo, useState } from "react";
import PlayerCard from "../components/PlayerCard";
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

  const competitions = useMemo(() => {
    return ["Alle", ...Array.from(new Set(players.map((player) => player.competition)))];
  }, [players]);

  const filteredPlayers = players.filter((player) => {
    const searchText = `${player.name} ${player.club} ${player.competition}`.toLowerCase();
    const matchesSearch = searchText.includes(search.toLowerCase());
    const matchesCompetition = competition === "Alle" || player.competition === competition;

    return matchesSearch && matchesCompetition;
  });

  return (
    <>
      <section className="pageHeader">
        <p>👥 TEILNEHMER</p>
        <h2>{filteredPlayers.length} Spieler gefunden</h2>
        <span>Suche nach Name, Verein oder Konkurrenz</span>
      </section>

      <section className="filterBox">
        <input
          type="text"
          placeholder="Spieler oder Verein suchen..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="chips">
          {clubs.map((club) => (
            <button
              className={selectedClub === club ? "activeChip" : ""}
              onClick={() => onSelectClub(club)}
              key={club}
            >
              {club}
            </button>
          ))}
        </div>

        <div className="chips">
          {competitions.map((item) => (
            <button
              className={competition === item ? "activeChip" : ""}
              onClick={() => setCompetition(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {filteredPlayers.length > 0 ? (
        <section className="players">
          {filteredPlayers.map((player) => (
            <PlayerCard key={player.name} player={player} onClubClick={onSelectClub} />
          ))}
        </section>
      ) : (
        <section className="emptyState">
          <b>Keine Teilnehmer gefunden</b>
          <span>Bitte Suche oder Filter ändern.</span>
        </section>
      )}
    </>
  );
}

export default Players;