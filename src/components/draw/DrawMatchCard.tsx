import type { DrawMatch } from "../../models/Draw";

type DrawMatchCardProps = {
  match: DrawMatch;
  showConnector?: boolean;
};

function getScore(result: string | undefined, side: "a" | "b") {
  if (!result) return "–";

  return result
    .split(" ")
    .map((set) => set.split(":")[side === "a" ? 0 : 1])
    .filter(Boolean)
    .join(" ");
}

function DrawMatchCard({ match, showConnector = true }: DrawMatchCardProps) {
  return (
    <button type="button" className="drawCard">
      <div className="drawCardHead">
        <span>Match {match.matchIndex}</span>
        <b>{match.status === "done" ? "beendet" : "offen"}</b>
      </div>

      <div className="drawPlayerLine">
        <small>{match.playerA?.seed ? `${match.playerA.seed}.` : ""}</small>
        <strong>{match.playerA?.name || "offen"}</strong>
        <em>{getScore(match.result, "a")}</em>
      </div>

      <div className="drawPlayerLine">
        <small>{match.playerB?.seed ? `${match.playerB.seed}.` : ""}</small>
        <strong>{match.playerB?.name || "offen"}</strong>
        <em>{getScore(match.result, "b")}</em>
      </div>

      <div className="drawCardMeta">
        <span>🎾 Platz {match.court || "offen"}</span>
        <span>🕒 {match.time || "noch offen"}</span>
      </div>

      {showConnector && <i className="drawConnector" />}
    </button>
  );
}

export default DrawMatchCard;