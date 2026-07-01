import { useState } from "react";
import { CheckCircle, FileUp } from "lucide-react";
import type { Player } from "../types";
import { parsePlayersFromPdf } from "../services/pdfPlayerParser";

function PdfImport() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [debugText, setDebugText] = useState("");
  const [imported, setImported] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    setFileName(file.name);
    setMessage("PDF wird gelesen...");
    setPlayers([]);
    setDebugText("");
    setImported(false);

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

  function importPlayers() {
    localStorage.setItem("huerthOpenPlayers", JSON.stringify(players));
    window.dispatchEvent(new Event("huerthOpenPlayersUpdated"));
    setImported(true);
    setMessage(`${players.length} Spieler wurden in die Teilnehmerliste übernommen`);
  }

  function resetImport() {
    localStorage.removeItem("huerthOpenPlayers");
    window.dispatchEvent(new Event("huerthOpenPlayersUpdated"));
    setImported(false);
    setMessage("Import wurde zurückgesetzt. Die Standard-Spielerliste ist wieder aktiv.");
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

        {players.length > 0 && (
          <button className="pdfButton" type="button" onClick={importPlayers}>
            <CheckCircle size={20} />
            In Turnier übernehmen
          </button>
        )}

        <button className="pdfResetButton" type="button" onClick={resetImport}>
          Import zurücksetzen
        </button>

        {imported && <strong className="importLoading">✅ Teilnehmerliste aktualisiert</strong>}
      </section>

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

      {debugText && (
        <section className="importPreview">
          <div className="importPreviewHeader">
            <b>PDF-Rohtext</b>
            <span>Nur zur Kontrolle</span>
          </div>

          <pre className="debugText">{debugText}</pre>
        </section>
      )}
    </>
  );
}

export default PdfImport;