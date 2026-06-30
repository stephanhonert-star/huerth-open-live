import type { Match } from "../types";

type MatchCardProps = {
  match: Match;
};

function MatchCard({ match }: MatchCardProps) {
  return (
    <article className={`card ${match.status === "live" ? "liveCard" : ""}`}>
      <div className="top">
        <span>{match.competition}</span>
        <b>Platz {match.court}</b>
      </div>

      <strong className="time">{match.time}</strong>

      <h3>{match.a}</h3>
      <p>gegen</p>
      <h3>{match.b}</h3>

      {match.status === "live" && <em>läuft seit {match.since} Uhr</em>}
      {match.status === "done" && <em className="result">Ergebnis: {match.result}</em>}
    </article>
  );
}

export default MatchCard;