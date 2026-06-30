type ResultScoreProps = {
  playerA: string;
  playerB: string;
  result: string;
};

function ResultScore({ playerA, playerB, result }: ResultScoreProps) {
  const sets = result.split(" ").filter(Boolean);

  const playerAScores = sets.map((set) => set.split(":")[0] ?? "");
  const playerBScores = sets.map((set) => set.split(":")[1] ?? "");

  return (
    <div className="resultScore">
      <div className="scoreRow">
        <b>{playerA}</b>
        {playerAScores.map((score, index) => (
          <span key={`a-${index}`}>{score}</span>
        ))}
      </div>

      <div className="scoreRow">
        <b>{playerB}</b>
        {playerBScores.map((score, index) => (
          <span key={`b-${index}`}>{score}</span>
        ))}
      </div>
    </div>
  );
}

export default ResultScore;