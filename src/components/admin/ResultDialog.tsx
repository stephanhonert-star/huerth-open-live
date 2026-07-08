import { useState } from "react";
import { Save } from "lucide-react";
import { calculateWinner } from "../../services/resultEngine";

type Props = {
  playerA: string;
  playerB: string;
  onSave: (result: string, winner: "A" | "B") => void;
  onClose: () => void;
};

const setButtons = [
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [7, 5],
  [7, 6],
  [0, 6],
  [1, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 7],
  [6, 7],
];

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

  function setRow(
    title: string,
    a: number,
    b: number,
    setA: (v: number) => void,
    setB: (v: number) => void
  ) {
    return (
      <div>
        <b>{title}</b>

        <div className="resultRow">
          <input
            type="number"
            value={a}
            onChange={(e) => setA(Number(e.target.value))}
          />
          <span>:</span>
          <input
            type="number"
            value={b}
            onChange={(e) => setB(Number(e.target.value))}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {setButtons.map(([x, y]) => (
            <button
              type="button"
              className="adminImportButton"
              key={`${title}-${x}-${y}`}
              onClick={() => {
                setA(x);
                setB(y);
              }}
            >
              {x}:{y}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="playerModalBackdrop" onClick={onClose}>
      <section className="playerModal" onClick={(e) => e.stopPropagation()}>
        <button className="modalClose" onClick={onClose}>
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

        <div style={{ display: "grid", gap: 18, margin: "18px 0" }}>
          {setRow("Satz 1", a1, b1, setA1, setB1)}
          {setRow("Satz 2", a2, b2, setA2, setB2)}
          {setRow("Match-Tiebreak", a3, b3, setA3, setB3)}
        </div>

        <button className="adminSaveButton" onClick={save}>
          <Save size={18} />
          Ergebnis speichern
        </button>
      </section>
    </div>
  );
}

export default ResultDialog;