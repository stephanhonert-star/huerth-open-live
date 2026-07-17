import { useState } from "react";
import { Save } from "lucide-react";
import { calculateWinner } from "../../services/resultEngine";

type Props = {
  playerA: string;
  playerB: string;
  onSave: (result: string, winner: "A" | "B") => void;
  onClose: () => void;
};

function ResultDialog({ playerA, playerB, onSave, onClose }: Props) {
  const [a1, setA1] = useState(0);
  const [b1, setB1] = useState(0);

  const [a2, setA2] = useState(0);
  const [b2, setB2] = useState(0);

  const [a3, setA3] = useState(0);
  const [b3, setB3] = useState(0);

  function save() {
    const result = calculateWinner([
      { a: a1, b: b1 },
      { a: a2, b: b2 },
      { a: a3, b: b3 },
    ]);

    if (!result.winner) {
      alert("Kein Gewinner erkennbar.");
      return;
    }

    onSave(result.scoreText, result.winner);
  }

  function saveSpecialResult(result: "n.a." | "Aufgabe", winner: "A" | "B") {
    onSave(result, winner);
  }

  function setRow(
    title: string,
    a: number,
    b: number,
    setA: (value: number) => void,
    setB: (value: number) => void,
  ) {
    return (
      <>
        <b>{title}</b>

        <div className="resultRow">
          <input
            type="number"
            min={0}
            value={a}
            onChange={(event) => setA(Number(event.target.value))}
          />

          <span>:</span>

          <input
            type="number"
            min={0}
            value={b}
            onChange={(event) => setB(Number(event.target.value))}
          />
        </div>
      </>
    );
  }

  return (
    <div className="playerModalBackdrop" onClick={onClose}>
      <section
        className="playerModal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modalClose" type="button" onClick={onClose}>
          ×
        </button>

        <h2>Ergebnis</h2>

        <p>
          {playerA}
          <br />
          gegen
          <br />
          {playerB}
        </p>

        {setRow("Satz 1", a1, b1, setA1, setB1)}
        {setRow("Satz 2", a2, b2, setA2, setB2)}
        {setRow("Match-Tiebreak", a3, b3, setA3, setB3)}

        <button className="adminSaveButton" type="button" onClick={save}>
          <Save size={18} />
          Ergebnis speichern
        </button>

        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid #333",
          }}
        >
          <b
            style={{
              display: "block",
              marginBottom: 10,
              color: "white",
            }}
          >
            Sonderergebnis
          </b>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <button
              className="adminSaveButton"
              type="button"
              onClick={() => saveSpecialResult("n.a.", "B")}
            >
              {playerA} n.a.
            </button>

            <button
              className="adminSaveButton"
              type="button"
              onClick={() => saveSpecialResult("n.a.", "A")}
            >
              {playerB} n.a.
            </button>

            <button
              className="adminSaveButton"
              type="button"
              onClick={() => saveSpecialResult("Aufgabe", "B")}
            >
              {playerA} Aufgabe
            </button>

            <button
              className="adminSaveButton"
              type="button"
              onClick={() => saveSpecialResult("Aufgabe", "A")}
            >
              {playerB} Aufgabe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ResultDialog;