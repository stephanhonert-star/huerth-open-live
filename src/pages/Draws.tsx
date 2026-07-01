import { useEffect, useState } from "react";
import DrawBracket from "../components/draw/DrawBracket";
import type { Draw } from "../models/Draw";
import { loadDraws } from "../services/drawProgression";

function Draws() {
  const [draws, setDraws] = useState<Draw[]>(loadDraws);

  useEffect(() => {
    function handleDrawsUpdated() {
      setDraws(loadDraws());
    }

    window.addEventListener("huerthOpenDrawsUpdated", handleDrawsUpdated);

    return () => {
      window.removeEventListener("huerthOpenDrawsUpdated", handleDrawsUpdated);
    };
  }, []);

  const competitions = Array.from(new Set(draws.map((draw) => draw.competition)));
  const [competition, setCompetition] = useState(competitions[0] || "");
  const [bracket, setBracket] = useState<"hauptfeld" | "nebenrunde">("hauptfeld");

  const selectedDraw =
    draws.find((draw) => draw.competition === competition && draw.bracket === bracket) || draws[0];

  return (
    <>
      <section className="pageHeader">
        <p>🏆 TURNIERBÄUME</p>
        <h2>Hauptfeld & Nebenrunde</h2>
        <span>Wische horizontal durch die Runden</span>
      </section>

      <section className="drawControls">
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

        <div className="drawToggle">
          <button
            type="button"
            className={bracket === "hauptfeld" ? "active" : ""}
            onClick={() => setBracket("hauptfeld")}
          >
            Hauptfeld
          </button>

          <button
            type="button"
            className={bracket === "nebenrunde" ? "active" : ""}
            onClick={() => setBracket("nebenrunde")}
          >
            Nebenrunde
          </button>
        </div>
      </section>

      {selectedDraw ? (
        <>
          <section className="drawTitleCard">
            <b>{selectedDraw.title}</b>
            <span>{selectedDraw.rounds.length} Runden</span>
          </section>

          <DrawBracket draw={selectedDraw} />
        </>
      ) : (
        <section className="emptyState">
          <b>Noch kein Turnierbaum</b>
          <span>Für diese Auswahl wurde noch kein Baum importiert.</span>
        </section>
      )}
    </>
  );
}

export default Draws;