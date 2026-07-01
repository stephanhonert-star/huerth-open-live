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

  function setRow(
    title: string,
    a: number,
    b: number,
    setA: (v: number) => void,
    setB: (v: number) => void
  ) {
    return (
      <>
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
      </>
    );
  }

  return (
    <div
      className="playerModalBackdrop"
      onClick={onClose}
    >
      <section
        className="playerModal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modalClose"
          onClick={onClose}
        >
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

        <button
          className="adminSaveButton"
          onClick={save}
        >
          <Save size={18} />
          Ergebnis speichern
        </button>
      </section>
    </div>
  );
}

export default ResultDialog;