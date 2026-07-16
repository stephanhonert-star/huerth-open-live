import type { DrawMatch } from "../../models/Draw";

type SpecialCardProps = {
  match: DrawMatch;
};

function getScore(result: string | undefined, side: "a" | "b") {
  if (!result) return "–";

  return result
    .split(" ")
    .map((set) => set.split(":")[side === "a" ? 0 : 1])
    .filter(Boolean)
    .join(" ");
}

export function ThirdPlaceCard({ match }: SpecialCardProps) {
  return (
    <button type="button" className="drawCard drawThirdCard">
      <div className="drawCardHead">
        <span>🥉 Platz 3</span>
        <b>{match.status === "done" ? "beendet" : "offen"}</b>
      </div>

      <div className="drawPlayerLine">
        <small></small>
        <strong>{match.playerA?.name || "Verlierer Halbfinale 1"}</strong>
        <em>{getScore(match.result, "a")}</em>
      </div>

      <div className="drawPlayerLine">
        <small></small>
        <strong>{match.playerB?.name || "Verlierer Halbfinale 2"}</strong>
        <em>{getScore(match.result, "b")}</em>
      </div>

      <div className="drawCardMeta">
        <span>🎾 Platz {match.court || "offen"}</span>
        <span>🕒 {match.time || "noch offen"}</span>
      </div>
    </button>
  );
}

export function FinalCard({ match }: SpecialCardProps) {
  return (
    <button type="button" className="drawCard drawFinalCard">
      <div className="drawCardHead">
        <span>🏆 Finale</span>
        <b>{match.status === "done" ? "beendet" : "offen"}</b>
      </div>

      <div className="drawPlayerLine">
        <small></small>
        <strong>{match.playerA?.name || "Finalist 1"}</strong>
        <em>{getScore(match.result, "a")}</em>
      </div>

      <div className="drawPlayerLine">
        <small></small>
        <strong>{match.playerB?.name || "Finalist 2"}</strong>
        <em>{getScore(match.result, "b")}</em>
      </div>

      <div className="drawCardMeta">
        <span>🎾 Platz {match.court || "offen"}</span>
        <span>🕒 {match.time || "noch offen"}</span>
      </div>

      <i className="drawConnector drawFinalConnector" />
    </button>
  );
}

export function WinnerCard({ match }: SpecialCardProps) {
  const winner = match.winner || match.playerA?.name || "Turniersieger";

  return (
    <section className="drawWinnerCard">
      <small>🏆 Sieger</small>
      <div className="drawWinnerTrophy">🏆</div>
      <h3>{winner}</h3>
      <p>Herzlichen Glückwunsch!</p>
      <span>Hürth Open 2026</span>
    </section>
  );
}