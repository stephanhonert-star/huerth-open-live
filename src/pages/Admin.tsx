import { useState } from "react";
import { Play, RotateCcw, Trash2, Trophy } from "lucide-react";
import ResultDialog from "../components/admin/ResultDialog";
import PdfImport from "./PdfImport";
import PdfDrawImport from "./PdfDrawImport";
import { matches as defaultMatches } from "../data/matches";
import type { Match } from "../types";
import { loadDraws, resetDraws, updateDrawAfterResult } from "../services/drawProgression";

const ADMIN_PASSWORD = "huerth2026";
const MATCH_STORAGE_KEY = "huerthOpenMatches";
const PLAYER_STORAGE_KEY = "huerthOpenPlayers";

function loadMatches(): Match[] {
  const saved = localStorage.getItem(MATCH_STORAGE_KEY);

  if (!saved) return defaultMatches;

  try {
    return JSON.parse(saved) as Match[];
  } catch {
    return defaultMatches;
  }
}

function saveMatches(matches: Match[]) {
  localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(matches));
  window.dispatchEvent(new Event("huerthOpenMatchesUpdated"));
}

function getNextMatchInfo(drawMatchId?: string) {
  if (!drawMatchId) return null;

  const draws = loadDraws();

  for (const draw of draws) {
    for (const round of draw.rounds) {
      const match = round.matches.find((item) => item.id === drawMatchId);

      if (match?.nextMatchId && match.nextSlot) {
        return {
          nextMatchId: match.nextMatchId,
          nextSlot: match.nextSlot,
        };
      }
    }
  }

  return null;
}

function Admin() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Match[]>(loadMatches);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      setUnlocked(true);
      setError("");
      return;
    }

    setError("Falsches Passwort");
  }

  function updateMatch(updatedMatch: Match) {
    const nextMatches = matches.map((match) =>
      match.drawMatchId === updatedMatch.drawMatchId ? updatedMatch : match
    );

    setMatches(nextMatches);
    saveMatches(nextMatches);
  }

  function startMatch(match: Match) {
    updateMatch({
      ...match,
      status: "live",
      since: new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  function changeCourt(match: Match, court: number) {
    updateMatch({
      ...match,
      court,
    });
  }

  function changeTime(match: Match, time: string) {
    updateMatch({
      ...match,
      time,
    });
  }

  function saveResult(result: string, winner: "A" | "B") {
    if (!selectedMatch) return;

    const winnerName = winner === "A" ? selectedMatch.a : selectedMatch.b;
    const nextInfo = getNextMatchInfo(selectedMatch.drawMatchId);

    const nextMatches = matches.map((match) => {
      if (match.drawMatchId === selectedMatch.drawMatchId) {
        return {
          ...match,
          status: "done" as const,
          result,
        };
      }

      if (nextInfo && match.drawMatchId === nextInfo.nextMatchId) {
        return {
          ...match,
          a: nextInfo.nextSlot === "playerA" ? winnerName : match.a,
          b: nextInfo.nextSlot === "playerB" ? winnerName : match.b,
        };
      }

      return match;
    });

    setMatches(nextMatches);
    saveMatches(nextMatches);

    if (selectedMatch.drawMatchId) {
      updateDrawAfterResult(selectedMatch.drawMatchId, winnerName, result);
    }

    setSelectedMatch(null);
  }

  function resetMatches() {
    localStorage.removeItem(MATCH_STORAGE_KEY);
    resetDraws();
    setMatches(defaultMatches);
    window.dispatchEvent(new Event("huerthOpenMatchesUpdated"));
  }

  function resetEverything() {
    const confirmed = window.confirm(
      "Wirklich alle importierten Spieler und gespeicherten Ergebnisse löschen?"
    );

    if (!confirmed) return;

    localStorage.removeItem(MATCH_STORAGE_KEY);
    localStorage.removeItem(PLAYER_STORAGE_KEY);

    resetDraws();
    setMatches(defaultMatches);

    window.dispatchEvent(new Event("huerthOpenMatchesUpdated"));
    window.dispatchEvent(new Event("huerthOpenPlayersUpdated"));
  }

  if (!unlocked) {
    return (
      <>
        <section className="pageHeader">
          <p>⚙️ ADMIN</p>
          <h2>Turnierleitung</h2>
          <span>Geschützter Bereich für Import und Verwaltung</span>
        </section>

        <form className="adminLogin" onSubmit={login}>
          <b>Admin-Zugang</b>
          <span>Bitte Passwort eingeben.</span>

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && <em>{error}</em>}

          <button type="submit">Einloggen</button>
        </form>
      </>
    );
  }

  const plannedMatches = matches.filter((match) => match.status === "planned");
  const liveMatches = matches.filter((match) => match.status === "live");
  const doneMatches = matches.filter((match) => match.status === "done");

  return (
    <>
      <section className="pageHeader">
        <p>⚙️ ADMIN</p>
        <h2>Turnierverwaltung</h2>
        <span>PDF-Import, Ergebnisse und Live-Steuerung</span>
      </section>

      <section className="adminGrid">
        <article>
          <b>{plannedMatches.length}</b>
          <span>geplante Spiele</span>
        </article>

        <article>
          <b>{liveMatches.length}</b>
          <span>Live-Spiele</span>
        </article>

        <article>
          <b>{doneMatches.length}</b>
          <span>Ergebnisse</span>
        </article>
      </section>

      <section className="adminSection">
        <div className="adminSectionHeader">
          <div>
            <p>🎾 LIVE & ERGEBNISSE</p>
            <h2>Spielsteuerung</h2>
          </div>

          <div className="adminHeaderActions">
            <button type="button" className="adminResetButton" onClick={resetMatches}>
              <RotateCcw size={18} />
              Spiele zurücksetzen
            </button>

            <button type="button" className="adminDeleteButton" onClick={resetEverything}>
              <Trash2 size={18} />
              Alles zurücksetzen
            </button>
          </div>
        </div>

        <div className="adminMatchList">
          {matches.map((match) => (
            <article
              className={`adminMatchCard adminMatchCard-${match.status}`}
              key={`${match.drawMatchId}-${match.a}-${match.b}`}
            >
              <div className="adminMatchTop">
                <div>
                  <b>Platz {match.court}</b>
                  <span>{match.time} Uhr</span>
                </div>

                <em>
                  {match.status === "live"
                    ? "LIVE"
                    : match.status === "done"
                    ? "FERTIG"
                    : "GEPLANT"}
                </em>
              </div>

              <small>{match.competition}</small>

              <div className="adminPlayers">
                <strong>{match.a}</strong>
                <span>gegen</span>
                <strong>{match.b}</strong>
              </div>

              <div className="adminEditGrid">
                <label className="adminCourtSelect">
                  Platz ändern
                  <select
                    value={match.court}
                    onChange={(event) => changeCourt(match, Number(event.target.value))}
                  >
                    <option value={1}>Platz 1</option>
                    <option value={2}>Platz 2</option>
                    <option value={3}>Platz 3</option>
                    <option value={4}>Platz 4</option>
                    <option value={5}>Platz 5</option>
                    <option value={6}>Platz 6 Reserve</option>
                  </select>
                </label>

                <label className="adminCourtSelect">
                  Uhrzeit ändern
                  <input
                    type="time"
                    value={match.time}
                    onChange={(event) => changeTime(match, event.target.value)}
                  />
                </label>
              </div>

              {match.status === "live" && (
                <p className="adminInfo">läuft seit {match.since} Uhr</p>
              )}

              {match.result && <p className="adminResult">Ergebnis: {match.result}</p>}

              <div className="adminActions">
                {match.status === "planned" && (
                  <button type="button" onClick={() => startMatch(match)}>
                    <Play size={18} />
                    Spiel starten
                  </button>
                )}

                <button type="button" onClick={() => setSelectedMatch(match)}>
                  <Trophy size={18} />
                  Ergebnis
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedMatch && (
        <ResultDialog
          playerA={selectedMatch.a}
          playerB={selectedMatch.b}
          onSave={saveResult}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      <PdfDrawImport />
      <PdfImport />
    </>
  );
}

export default Admin;