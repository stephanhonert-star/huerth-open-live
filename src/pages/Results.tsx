import MatchCard from "../components/MatchCard";
import type { Match } from "../types";

type ResultsProps = {
  results: Match[];
};

function Results({ results }: ResultsProps) {
  return (
    <>
      <h2>🏆 Ergebnisse</h2>
      <section className="cards">
        {results.map((match) => (
          <MatchCard key={`${match.time}-${match.court}-${match.a}`} match={match} />
        ))}
      </section>
    </>
  );
}

export default Results;