import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { FileUp, Play, RotateCcw, Square, Trash2, Trophy, Users } from "lucide-react";
import ResultDialog from "../components/admin/ResultDialog";
import { matches as defaultMatches } from "../data/matches";
import type { Match, Player } from "../types";
import { db } from "../services/firebase";
import { loadDraws, resetDraws, saveDraws, updateDrawAfterResult } from "../services/drawProgression";
import { parseDrawFromPdf } from "../services/pdfDrawParser";
import { parsePlayersFromPdf } from "../services/pdfPlayerParser";

const ADMIN_PASSWORD = "huerth2026";
const MATCH_STORAGE_KEY = "huerthOpenMatches";
const PLAYER_STORAGE_KEY = "huerthOpenPlayers";

function cleanForFirebase<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function publishLiveData(matches: Match[], players: Player[]) {
  await setDoc(
    doc(db, "huerthOpen", "live"),
    cleanForFirebase({
      matches,
      players,
      draws: loadDraws(),
      updatedAt: new Date().toISOString(),
    })
  );
}

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

function loadPlayers(): Player[] {
  const saved = localStorage.getItem(PLAYER_STORAGE_KEY);

  if (!saved) return [];

  try {
    return JSON.parse(saved) as Player[];
  } catch {
    return [];
  }
}

function savePlayers(players: Player[]) {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(players));
  window.dispatchEvent(new Event("huerthOpenPlayersUpdated"));
}

function getDatePart(time: string) {
  return time.includes(".") ? time.split(" ")[0] : "Ohne Datum";
}

function getTimePart(time: string) {
  return time.includes(".") ? time.split(" ").slice(1).join(" ") : time;
}

function dateSortValue(date: string) {
  if (date === "Ohne Datum") return 999999;

  const parts = date.split(".");
  const day = Number(parts[0]);
  const month = Number(parts[1]);

  return month * 100 + day;
}

function timeSortValue(time: string) {
  const date = getDatePart(time);
  const clock = getTimePart(time).replace("Uhr", "").trim();
  const [hour, minute] = clock.split(":").map(Number);

  return dateSortValue(date) * 10000 + (hour || 0) * 100 + (minute || 0);
}

function statusSortValue(status: Match["status"]) {
  if (status === "live") return 0;
  if (status === "planned") return 1;
  return 2;
}

function sortMatches(matches: Match[]) {
  return [...matches].sort((a, b) => {
    const statusDiff = statusSortValue(a.status) - statusSortValue(b.status);
    if (statusDiff !== 0) return statusDiff;

    const timeDiff = timeSortValue(a.time) - timeSortValue(b.time);
    if (timeDiff !== 0) return timeDiff;

    return a.court - b.court;
  });
}

function isPlaceholderName(name: string) {
  return (
    name.includes("Sieger") ||
    name.includes("Finalist") ||
    name.includes("Verlierer") ||
    name.includes("Turniersieger") ||
    name === "offen"
  );
}

function createPlayersFromDraw(result: Awaited<ReturnType<typeof parseDrawFromPdf>>): Player[] {
  const players: Player[] = [];

  result.draw.rounds.forEach((round) => {
    round.matches.forEach((match) => {
      [match.playerA, match.playerB].forEach((drawPlayer) => {
        if (!drawPlayer) return;
        if (isPlaceholderName(drawPlayer.name)) return;
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
  const [selectedDate, setSelectedDate] = useState("Alle");
  const [importMessage, setImportMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      setUnlocked(true);
      setError("");
      return;
    }

    setError("Falsches Passwort");
  }

  async function updateMatch(updatedMatch: Match) {
    const nextMatches = matches.map((match) =>
      match.drawMatchId === updatedMatch.drawMatchId ? updatedMatch : match
    );

    setMatches(nextMatches);
    saveMatches(nextMatches);
    await publishLiveData(nextMatches, loadPlayers());
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

  function undoStartMatch(match: Match) {
    updateMatch({
      ...match,
      status: "planned",
      since: "",
    });
  }

  function changeCourt(match: Match, court: number) {
    updateMatch({ ...match, court });
  }

  function changeTime(match: Match, time: string) {
    updateMatch({ ...match, time });
  }

  async function importDrawPdf(file: File) {
    setLoading(true);
    setImportMessage("Auslosung wird importiert...");

    try {
      const result = await parseDrawFromPdf(file);
      const importedPlayers = createPlayersFromDraw(result);

      const existingDraws = loadDraws().filter((draw) => draw.id !== result.draw.id);
      const existingMatches = matches.filter((match) => match.competition !== result.draw.competition);
      const existingPlayers = loadPlayers().filter((player) => player.competition !== result.draw.competition);

      const nextDraws = [...existingDraws, result.draw];
      const nextMatches = [...existingMatches, ...result.matches];
      const nextPlayers = [...existingPlayers, ...importedPlayers];

      saveDraws(nextDraws);
      setMatches(nextMatches);
      saveMatches(nextMatches);
      savePlayers(nextPlayers);

      await publishLiveData(nextMatches, nextPlayers);

      setImportMessage(
        `${result.draw.competition} importiert · ${importedPlayers.length} Spieler · ${result.matches.length} Spiele`
      );
    } catch (error) {
      console.error(error);
      setImportMessage("Fehler beim Import der Auslosung");
    } finally {
      setLoading(false);
    }
  }

  async function importPlayersPdf(file: File) {
    setLoading(true);
    setImportMessage("Teilnehmerliste wird importiert...");

    try {
      const result = await parsePlayersFromPdf(file);
      savePlayers(result.players);
      await publishLiveData(matches, result.players);
      setImportMessage(`${result.players.length} Teilnehmer importiert`);
    } catch (error) {
      console.error(error);
      setImportMessage("Fehler beim Import der Teilnehmerliste");
    } finally {
      setLoading(false);
    }
  }

  async function saveResult(result: string, winner: "A" | "B") {
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

    await publishLiveData(nextMatches, loadPlayers());

    setSelectedMatch(null);
  }

  async function resetMatches() {
    localStorage.removeItem(MATCH_STORAGE_KEY);
    resetDraws();
    setMatches(defaultMatches);
    setSelectedDate("Alle");
    window.dispatchEvent(new Event("huerthOpenMatchesUpdated"));
    await publishLiveData(defaultMatches, loadPlayers());
  }

  async function resetEverything() {
    const confirmed = window.confirm(
      "Wirklich alle importierten Spieler und gespeicherten Ergebnisse löschen?"
    );

    if (!confirmed) return;

    localStorage.removeItem(MATCH_STORAGE_KEY);
    localStorage.removeItem(PLAYER_STORAGE_KEY);

    resetDraws();
    setMatches(defaultMatches);
    setSelectedDate("Alle");

    window.dispatchEvent(new Event("huerthOpenMatchesUpdated"));
    window.dispatchEvent(new Event("huerthOpenPlayersUpdated"));

    await publishLiveData(defaultMatches, []);
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

  const dates = Array.from(new Set(matches.map((match) => getDatePart(match.time)))).sort(
    (a, b) => dateSortValue(a) - dateSortValue(b)
  );

  const visibleMatches =
    selectedDate === "Alle"
      ? matches
      : matches.filter((match) => getDatePart(match.time) === selectedDate);

  const sortedMatches = sortMatches(visibleMatches);
  const plannedMatches = matches.filter((match) => match.status === "planned");
  const liveMatches = matches.filter((match) => match.status === "live");
  const doneMatches = matches.filter((match) => match.status === "done");

  return (
    <>
      <section className="pageHeader adminTopHeader">
        <div>
          <p>⚙️ ADMIN</p>
          <h2>Turnierverwaltung</h2>
          <span>PDF-Import, Ergebnisse und Live-Steuerung</span>
        </div>

        <div className="adminImportActions">
          <label className="adminImportButton">
            <FileUp size={18} />
            Auslosung
            <input
              type="file"
              accept="application/pdf"
              onClick={(event) => {
                event.currentTarget.value = "";
              }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importDrawPdf(file);
              }}
            />
          </label>

          <label className="adminImportButton">
            <Users size={18} />
            Teilnehmer
            <input
              type="file"
              accept="application/pdf"
              onClick={(event) => {
                event.currentTarget.value = "";
              }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importPlayersPdf(file);
              }}
            />
          </label>
        </div>
      </section>

      {(importMessage || loading) && (
        <section className="adminImportStatus">
          {loading ? "Bitte warten..." : importMessage}
        </section>
      )}

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

        <section className="competitionChips">
          <button
            type="button"
            className={selectedDate === "Alle" ? "active" : ""}
            onClick={() => setSelectedDate("Alle")}
          >
            Alle <span>{matches.length}</span>
          </button>

          {dates.map((date) => {
            const count = matches.filter((match) => getDatePart(match.time) === date).length;

            return (
              <button
                type="button"
                key={date}
                className={selectedDate === date ? "active" : ""}
                onClick={() => setSelectedDate(date)}
              >
                {date} <span>{count}</span>
              </button>
            );
          })}
        </section>

        <div className="adminMatchList">
          {sortedMatches.map((match) => (
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
                    value={getTimePart(match.time)}
                    onChange={(event) => {
                      const date = getDatePart(match.time);
                      const nextTime =
                        date === "Ohne Datum" ? event.target.value : `${date} ${event.target.value}`;

                      changeTime(match, nextTime);
                    }}
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

                {match.status === "live" && (
                  <button type="button" onClick={() => undoStartMatch(match)}>
                    <Square size={18} />
                    Start rückgängig
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
    </>
  );
}

export default Admin;