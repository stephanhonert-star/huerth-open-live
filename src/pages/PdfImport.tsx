import { useState } from "react";
import { FileUp } from "lucide-react";
import type { Player } from "../types";
import { parsePlayersFromPdf } from "../services/pdfPlayerParser";

function PdfImport() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [debugText, setDebugText] = useState("");

  async function handleFile(file: File) {
    setLoading(true);
    setFileName(file.name);
    setMessage("PDF wird gelesen...");
    setPlayers([]);
    setDebugText("");

    try {
      const result = await parsePlayersFromPdf(file);

      setPlayers(result.players);
      setDebugText(result.debugText.slice(0, 8000));
      setMessage(`${result.pages} Seiten gelesen · ${result.players.length} Spieler erkannt`);
    } catch (error) {
      console.error(error);
      setMessage("Fehler beim Lesen der PDF");
      setDebugText(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="pageHeader">
        <p>📄 PDF-IMPORT</p>
        <h2>nuLiga Import</h2>
        <span>Spieler automatisch aus der Zulassungsliste erkennen</span>
      </section>

      <section className="pdfImportBox">
        <FileUp size={44} />

        <h3>PDF hochladen</h3>

        <p>
          Wähle eine nuLiga-Zulassungsliste aus. Die App liest daraus Name,
          Verein, LK, Jahrgang und Konkurrenz.
        </p>

        <label className="pdfButton">
          PDF auswählen
          <input
            type="file"
            accept="application/pdf"
            onClick={(event) => {
              event.currentTarget.value = "";
            }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>

        {fileName && <small className="fileName">Datei: {fileName}</small>}
        {message && <strong className="importLoading">{message}</strong>}
        {loading && <strong className="importLoading">Bitte warten...</strong>}
      </section>

      {debugText && (
        <section className="importPreview">
          <div className="importPreviewHeader">
            <b>PDF-Rohtext</b>
            <span>Kopiere mir bitte die ersten 30–50 Zeilen daraus.</span>
          </div>

          <pre className="debugText">{debugText}</pre>
        </section>
      )}

      {players.length > 0 && (
        <section className="importPreview">
          <div className="importPreviewHeader">
            <b>{players.length} Spieler erkannt</b>
            <span>Vorschau aus der PDF</span>
          </div>

          <div className="importTable">
            {players.map((player) => (
              <article key={`${player.name}-${player.competition}`}>
                <b>{player.name}</b>
                <span>{player.club}</span>
                <small>
                  LK {player.lk} · Jg. {player.year} · {player.competition}
                </small>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default PdfImport;