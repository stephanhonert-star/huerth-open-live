import type { Match } from "../types";
import ResultScore from "./ResultScore";

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

      {match.status === "done" && match.result ? (
        <ResultScore playerA={match.a} playerB={match.b} result={match.result} />
      ) : (
        <>
          <h3>{match.a}</h3>
          <p>gegen</p>
          <h3>{match.b}</h3>
        </>
      )}

      {match.status === "live" && <em>läuft seit {match.since} Uhr</em>}
      {match.status === "planned" && <em className="planned">angesetzt</em>}
    </article>
  );
}

export default MatchCard;