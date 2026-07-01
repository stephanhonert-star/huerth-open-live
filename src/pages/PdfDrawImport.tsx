import { useState } from "react";
import { GitBranch } from "lucide-react";
import { parseDrawFromPdf } from "../services/pdfDrawParser";
import { saveDraws } from "../services/drawProgression";
import type { Player } from "../types";

const MATCH_STORAGE_KEY = "huerthOpenMatches";
const PLAYER_STORAGE_KEY = "huerthOpenPlayers";

function PdfDrawImport() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [debugText, setDebugText] = useState("");

  function createPlayersFromDraw(result: Awaited<ReturnType<typeof parseDrawFromPdf>>): Player[] {
    const players: Player[] = [];

    result.draw.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        [match.playerA, match.playerB].forEach((drawPlayer) => {
          if (!drawPlayer) return;
          if (drawPlayer.name.includes("Sieger")) return;
          if (drawPlayer.name.includes("Finalist")) return;
          if (drawPlayer.name.includes("Turniersieger")) return;
          if (drawPlayer.name.includes("Verlierer")) return;
          if (players.some((player) => player.name === drawPlayer.name)) return;

          players.push({
            name: drawPlayer.name,
            club: drawPlayer.club || "Unbekannter Verein",
            lk: drawPlayer.lk || "-",
            year: "-",
            competition: result.draw.competition,
          });
        });
      });
    });

    return players;
  }

  async function handleFile(file: File) {
    setLoading(true);
    setFileName(file.name);
    setMessage("Auslosung wird gelesen...");
    setDebugText("");

    try {
      const result = await parseDrawFromPdf(file);
      const importedPlayers = createPlayersFromDraw(result);

      saveDraws([result.draw]);

      localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(result.matches));
      localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(importedPlayers));

      window.dispatchEvent(new Event("huerthOpenMatchesUpdated"));
      window.dispatchEvent(new Event("huerthOpenPlayersUpdated"));

      setDebugText(result.debugText.slice(0, 8000));
      setMessage(
        `${result.draw.competition} importiert · ${importedPlayers.length} Spieler · ${result.matches.length} Spiele`
      );
    } catch (error) {
      console.error(error);
      setMessage("Fehler beim Import der Auslosung");
      setDebugText(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="pdfImportBox">
        <GitBranch size={44} />

        <h3>Auslosung importieren</h3>

        <p>
          Wähle eine nuLiga-Auslosung als PDF. Die App erzeugt daraus automatisch
          Turnierbaum, Spiele und Teilnehmer.
        </p>

        <label className="pdfButton">
          Auslosungs-PDF auswählen
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
            <b>Auslosungs-Rohtext</b>
            <span>Nur zur Kontrolle</span>
          </div>

          <pre className="debugText">{debugText}</pre>
        </section>
      )}
    </>
  );
}

export default PdfDrawImport;