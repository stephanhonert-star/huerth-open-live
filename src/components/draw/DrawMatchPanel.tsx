import type { DrawMatch } from "../../models/Draw";

type DrawMatchPanelProps = {
  match: DrawMatch | null;
  onClose: () => void;
};

function DrawMatchPanel({ match, onClose }: DrawMatchPanelProps) {
  if (!match) return null;

  return (
    <aside className="drawPanel">
      <button className="drawPanelClose" type="button" onClick={onClose}>
        ×
      </button>

      <small>{match.competition}</small>
      <h2>{match.round}</h2>

      <div className="drawPanelPlayers">
        <b>{match.playerA?.name || "offen"}</b>
        <span>gegen</span>
        <b>{match.playerB?.name || "offen"}</b>
      </div>

      <div className="drawPanelFacts">
        <div>
          <span>Status</span>
          <b>{match.status === "done" ? "Beendet" : "Offen"}</b>
        </div>
        <div>
          <span>Ergebnis</span>
          <b>{match.result || "noch offen"}</b>
        </div>
        <div>
          <span>Platz</span>
          <b>{match.court ? `Platz ${match.court}` : "noch offen"}</b>
        </div>
        <div>
          <span>Zeit</span>
          <b>{match.time || "noch offen"}</b>
        </div>
      </div>
    </aside>
  );
}

export default DrawMatchPanel;