import type { Draw, DrawMatch, DrawRound } from "../models/Draw";

type DrawBracketProps = {
  draw: Draw;
};

function scoreFor(result: string | undefined, player: "a" | "b") {
  if (!result) return "–";
  return result
    .split(" ")
    .map((set) => set.split(":")[player === "a" ? 0 : 1])
    .filter(Boolean)
    .join(" ");
}

function RoundHeader({ round }: { round: DrawRound }) {
  const isFinal = round.name === "Finale";
  const isWinner = round.name === "Sieger";
  const isThird = round.name === "Spiel um Platz 3";

  return (
    <div className={`drawRoundHeader ${isFinal ? "gold" : ""} ${isWinner ? "green" : ""} ${isThird ? "bronze" : ""}`}>
      <b>
        {isFinal && "🏆 "}
        {isThird && "🥉 "}
        {isWinner && "🏆 "}
        {round.name}
      </b>
      <span>{round.matches.length} Spiel{round.matches.length === 1 ? "" : "e"}</span>
    </div>
  );
}

function NormalMatchCard({ match }: { match: DrawMatch }) {
  return (
    <button type="button" className="drawMatchPro">
      <div className="drawMatchLabel">
        <span>Match {match.matchIndex}</span>
        <em>{match.status === "done" ? "beendet" : "offen"}</em>
      </div>

      <div className="drawCompetitor">
        <small>{match.playerA?.seed ? `${match.playerA.seed}.` : ""}</small>
        <b>{match.playerA?.name || "offen"}</b>
        <strong>{scoreFor(match.result, "a")}</strong>
      </div>

      <div className="drawCompetitor">
        <small>{match.playerB?.seed ? `${match.playerB.seed}.` : ""}</small>
        <b>{match.playerB?.name || "offen"}</b>
        <strong>{scoreFor(match.result, "b")}</strong>
      </div>

      <div className="drawMatchMeta">
        <span>🎾 Platz {match.court || "offen"}</span>
        <span>🕒 {match.time || "noch offen"}</span>
      </div>

      <div className="drawConnector" />
    </button>
  );
}

function ThirdPlaceCard({ match }: { match: DrawMatch }) {
  return (
    <button type="button" className="drawMatchPro thirdPlaceMatch">
      <div className="drawMatchLabel">
        <span>🥉 Spiel um Platz 3</span>
        <em>{match.status === "done" ? "beendet" : "offen"}</em>
      </div>

      <div className="drawCompetitor">
        <small></small>
        <b>{match.playerA?.name || "Verlierer Halbfinale 1"}</b>
        <strong>{scoreFor(match.result, "a")}</strong>
      </div>

      <div className="drawCompetitor">
        <small></small>
        <b>{match.playerB?.name || "Verlierer Halbfinale 2"}</b>
        <strong>{scoreFor(match.result, "b")}</strong>
      </div>

      <div className="drawMatchMeta">
        <span>🎾 Platz {match.court || "offen"}</span>
        <span>🕒 {match.time || "noch offen"}</span>
      </div>
    </button>
  );
}

function FinalCard({ match }: { match: DrawMatch }) {
  return (
    <button type="button" className="drawMatchPro finalMatch">
      <div className="drawMatchLabel">
        <span>🏆 Finale</span>
        <em>{match.status === "done" ? "beendet" : "offen"}</em>
      </div>

      <div className="drawCompetitor">
        <small></small>
        <b>{match.playerA?.name || "Finalist 1"}</b>
        <strong>{scoreFor(match.result, "a")}</strong>
      </div>

      <div className="drawCompetitor">
        <small></small>
        <b>{match.playerB?.name || "Finalist 2"}</b>
        <strong>{scoreFor(match.result, "b")}</strong>
      </div>

      <div className="drawMatchMeta">
        <span>🎾 Center Court</span>
        <span>🕒 {match.time || "02.08. 14:00"}</span>
      </div>

      <div className="drawConnector finalConnector" />
    </button>
  );
}

function WinnerCard({ match }: { match: DrawMatch }) {
  const winner = match.winner || match.playerA?.name || "Turniersieger";

  return (
    <section className="winnerCard">
      <small>🏆 Sieger</small>
      <div className="winnerTrophy">🏆</div>
      <h3>{winner}</h3>
      <p>Herzlichen Glückwunsch!</p>
      <span>Hürth Open 2026</span>
    </section>
  );
}

function renderMatch(round: DrawRound, match: DrawMatch) {
  if (round.name === "Sieger") return <WinnerCard key={match.id} match={match} />;
  if (round.name === "Finale") return <FinalCard key={match.id} match={match} />;
  if (round.name === "Spiel um Platz 3") return <ThirdPlaceCard key={match.id} match={match} />;

  return <NormalMatchCard key={match.id} match={match} />;
}

function DrawBracket({ draw }: DrawBracketProps) {
  return (
    <section className="drawArena">
      <div className="drawBracketPro">
        {draw.rounds.map((round) => (
          <section
            className={`drawRoundPro ${round.name === "Finale" ? "finalRound" : ""} ${
              round.name === "Sieger" ? "winnerRound" : ""
            }`}
            key={round.name}
          >
            <RoundHeader round={round} />

            <div className="drawRoundStack">
              {round.matches.map((match) => renderMatch(round, match))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export default DrawBracket;