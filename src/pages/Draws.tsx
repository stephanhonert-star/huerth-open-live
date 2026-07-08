import { useEffect, useState } from "react";
import DrawBracket from "../components/draw/DrawBracket";
import { loadDraws } from "../services/drawProgression";

function Draws() {
  const [draws, setDraws] = useState(loadDraws);
  const [competition, setCompetition] = useState("");
  const [bracket, setBracket] = useState<"hauptfeld" | "nebenrunde">("hauptfeld");

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

  useEffect(() => {
    if (draws.length === 0) return;

    const firstDraw = draws[0];

    if (!competition) {
      setCompetition(firstDraw.competition);
      setBracket(firstDraw.bracket);
      return;
    }

    const availableForCompetition = draws.filter(
      (draw) => draw.competition === competition
    );

    if (
      availableForCompetition.length > 0 &&
      !availableForCompetition.some((draw) => draw.bracket === bracket)
    ) {
      setBracket(availableForCompetition[0].bracket);
    }
  }, [draws, competition, bracket]);

  const availableBrackets = draws.filter((draw) => draw.competition === competition);

  const selectedDraw = draws.find(
    (draw) => draw.competition === competition && draw.bracket === bracket
  );

  if (draws.length === 0) {
    return (
      <>
        <section className="pageHeader">
          <p>🏆 TURNIERBÄUME</p>
          <h2>Auslosung</h2>
          <span>Noch keine Auslosung importiert</span>
        </section>

        <section className="emptyState">
          <b>Noch keine Auslosung vorhanden</b>
          <span>Importiere im Adminbereich eine nuLiga-Auslosung.</span>
        </section>
      </>
    );
  }

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
          <select
            value={competition}
            onChange={(event) => {
              const nextCompetition = event.target.value;
              const firstDrawForCompetition = draws.find(
                (draw) => draw.competition === nextCompetition
              );

              setCompetition(nextCompetition);

              if (firstDrawForCompetition) {
                setBracket(firstDrawForCompetition.bracket);
              }
            }}
          >
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
            disabled={!availableBrackets.some((draw) => draw.bracket === "hauptfeld")}
            className={bracket === "hauptfeld" ? "active" : ""}
            onClick={() => setBracket("hauptfeld")}
          >
            Hauptfeld
          </button>

          <button
            type="button"
            disabled={!availableBrackets.some((draw) => draw.bracket === "nebenrunde")}
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