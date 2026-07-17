import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import {
  CalendarDays,
  FileUp,
  Filter,
  MapPin,
  Play,
  RotateCcw,
  Settings,
  Square,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import ResultDialog from "../components/admin/ResultDialog";
import { matches as defaultMatches } from "../data/matches";
import type { Match, Player } from "../types";
import { db } from "../services/firebase";
import {
  loadDraws,
  resetDraws,
  saveDraws,
  updateDrawAfterResult,
  updateDrawSchedule,
} from "../services/drawProgression";
import { parseDrawFromPdf } from "../services/pdfDrawParser";
import { parsePlayersFromPdf } from "../services/pdfPlayerParser";
import { parseScheduleFromPdf } from "../services/pdfScheduleParser";

const ADMIN_PASSWORD = "huerth2026";
const MATCH_STORAGE_KEY = "huerthOpenMatches";
const PLAYER_STORAGE_KEY = "huerthOpenPlayers";

const TOURNAMENT_DATES = [
  "18.07.",
  "19.07.",
  "20.07.",
  "21.07.",
  "22.07.",
  "23.07.",
  "24.07.",
  "25.07.",
  "26.07.",
  "27.07.",
  "28.07.",
  "29.07.",
  "30.07.",
  "31.07.",
  "01.08.",
  "02.08.",
];

type StatusFilter = "Alle" | Match["status"];

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

  const [day, month] = date.split(".").map(Number);

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

function createPlayersFromDraw(
  result: Awaited<ReturnType<typeof parseDrawFromPdf>>
): Player[] {
  const players: Player[] = [];

  result.draws.forEach((draw) => {
    draw.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        [match.playerA, match.playerB].forEach((drawPlayer) => {
          if (!drawPlayer) return;
          if (isPlaceholderName(drawPlayer.name)) return;

          const exists = players.some(
            (player) =>
              player.name === drawPlayer.name &&
              player.competition === draw.competition
          );

          if (exists) return;

          players.push({
            name: drawPlayer.name,
            club: drawPlayer.club || "Unbekannter Verein",
            lk: drawPlayer.lk || "-",
            year: "-",
            competition: draw.competition,
          });
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

function hasRealPlayers(match: Match) {
  return !isPlaceholderName(match.a) && !isPlaceholderName(match.b);
}

function getStatusLabel(status: Match["status"]) {
  if (status === "live") return "LIVE";
  if (status === "done") return "FERTIG";
  return "GEPLANT";
}

function Admin() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("huerth-open-admin") === "true"
  );
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Match[]>(loadMatches);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedDate, setSelectedDate] = useState("Alle");
  const [selectedCourt, setSelectedCourt] = useState("Alle");
  const [selectedStatus, setSelectedStatus] =
    useState<StatusFilter>("Alle");
  const [importMessage, setImportMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  function getMatchKey(match: Match) {
    return match.drawMatchId || `${match.a}-${match.b}-${match.time}`;
  }

  function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("huerth-open-admin", "true");
      setUnlocked(true);
      setError("");
      return;
    }

    setError("Falsches Passwort");
  }

  async function updateMatch(updatedMatch: Match) {
    const updatedKey = getMatchKey(updatedMatch);

    const nextMatches = matches.map((match) =>
      getMatchKey(match) === updatedKey ? updatedMatch : match
    );

    setMatches(nextMatches);
    saveMatches(nextMatches);
    await publishLiveData(nextMatches, loadPlayers());
  }

  async function startMatch(match: Match) {
    await updateMatch({
      ...match,
      status: "live",
      since: new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  async function undoStartMatch(match: Match) {
    await updateMatch({
      ...match,
      status: "planned",
      since: "",
    });
  }

  async function changeCourt(match: Match, court: number) {
    updateDrawSchedule(match.drawMatchId, { court });

    await updateMatch({
      ...match,
      court,
    });
  }

  async function changeTime(match: Match, time: string) {
    updateDrawSchedule(match.drawMatchId, { time });

    await updateMatch({
      ...match,
      time,
    });
  }

  async function changeDate(match: Match, date: string) {
    const clock = getTimePart(match.time).replace("Uhr", "").trim();
    const nextTime =
      date === "Ohne Datum"
        ? clock
        : `${date}${clock ? ` ${clock}` : ""}`;

    updateDrawSchedule(match.drawMatchId, {
      time: nextTime,
    });

    await updateMatch({
      ...match,
      time: nextTime,
    });
  }

  async function importDrawPdf(file: File) {
    setLoading(true);
    setImportMessage("Auslosung wird importiert...");

    try {
      const result = await parseDrawFromPdf(file);
      const importedPlayers = createPlayersFromDraw(result);

      const importedDrawIds = new Set(result.draws.map((draw) => draw.id));
      const importedCompetitions = new Set(
        result.draws.map((draw) => draw.competition)
      );

      const existingDraws = loadDraws().filter(
        (draw) => !importedDrawIds.has(draw.id)
      );

      const existingMatches = matches.filter(
        (match) => !importedCompetitions.has(match.competition)
      );

      const existingPlayers = loadPlayers().filter(
        (player) => !importedCompetitions.has(player.competition)
      );

      const nextDraws = [...existingDraws, ...result.draws];
      const nextMatches = [...existingMatches, ...result.matches];
      const nextPlayers = [...existingPlayers, ...importedPlayers];

      saveDraws(nextDraws);
      setMatches(nextMatches);
      saveMatches(nextMatches);
      savePlayers(nextPlayers);

      await publishLiveData(nextMatches, nextPlayers);

      setImportMessage(
        `${result.draws.length} Konkurrenzen importiert · ${importedPlayers.length} Spieler · ${result.matches.length} Spiele`
      );
    } catch (importError) {
      console.error(importError);
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
    } catch (importError) {
      console.error(importError);
      setImportMessage("Fehler beim Import der Teilnehmerliste");
    } finally {
      setLoading(false);
    }
  }

  async function importSchedulePdf(file: File) {
    setLoading(true);
    setImportMessage("Spielplan wird aktualisiert...");

    try {
      const updatedMatches = await parseScheduleFromPdf(file, matches);

      setMatches(updatedMatches);
      saveMatches(updatedMatches);
      await publishLiveData(updatedMatches, loadPlayers());

      setImportMessage("Spielplan erfolgreich aktualisiert");
    } catch (importError) {
      console.error(importError);
      setImportMessage("Fehler beim Aktualisieren des Spielplans");
    } finally {
      setLoading(false);
    }
  }

  async function saveResult(result: string, winner: "A" | "B") {
    if (!selectedMatch) return;

    const winnerName = winner === "A" ? selectedMatch.a : selectedMatch.b;
    const nextInfo = getNextMatchInfo(selectedMatch.drawMatchId);

    const nextMatches = matches.map((match) => {
      if (getMatchKey(match) === getMatchKey(selectedMatch)) {
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
    setSelectedCourt("Alle");
    setSelectedStatus("Alle");
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
    setSelectedCourt("Alle");
    setSelectedStatus("Alle");

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

  const dates = Array.from(
    new Set(matches.map((match) => getDatePart(match.time)))
  ).sort((a, b) => dateSortValue(a) - dateSortValue(b));

  const plannedMatches = matches.filter((match) => match.status === "planned");
  const liveMatches = matches.filter((match) => match.status === "live");
  const doneMatches = matches.filter((match) => match.status === "done");

  const filteredMatches = sortMatches(
    matches.filter((match) => {
      const matchesDate =
        selectedDate === "Alle" || getDatePart(match.time) === selectedDate;

      const matchesCourt =
        selectedCourt === "Alle" || String(match.court) === selectedCourt;

      const matchesStatus =
        selectedStatus === "Alle" || match.status === selectedStatus;

      return (
        hasRealPlayers(match) &&
        matchesDate &&
        matchesCourt &&
        matchesStatus
      );
    })
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        margin: "0 auto",
        padding: "0 0 48px",
      }}
    >
      <section
        className="pageHeader adminTopHeader"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 24,
          alignItems: "center",
        }}
      >
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

          <label className="adminImportButton">
            <FileUp size={18} />
            Spielplan
            <input
              type="file"
              accept="application/pdf"
              onClick={(event) => {
                event.currentTarget.value = "";
              }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importSchedulePdf(file);
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

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          margin: "18px 0",
          padding: "16px 18px",
          background: "#121212",
          border: "1px solid #2b2b2b",
          borderRadius: 22,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          <span style={{ color: "white", fontWeight: 900 }}>
            {matches.length} Spiele
          </span>
          <span style={{ color: "#aeb7c5", fontWeight: 800 }}>
            {plannedMatches.length} geplant
          </span>
          <span style={{ color: "#80ffad", fontWeight: 800 }}>
            {liveMatches.length} live
          </span>
          <span style={{ color: "#ff8da4", fontWeight: 800 }}>
            {doneMatches.length} beendet
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="adminResetButton"
            onClick={resetMatches}
          >
            <RotateCcw size={17} />
            Spiele zurücksetzen
          </button>

          <button
            type="button"
            className="adminDeleteButton"
            onClick={resetEverything}
          >
            <Trash2 size={17} />
            Alles zurücksetzen
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 14,
          marginBottom: 18,
          padding: 18,
          background: "#101010",
          border: "1px solid #2b2b2b",
          borderRadius: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#80ffad",
            fontWeight: 950,
            letterSpacing: ".06em",
          }}
        >
          <Filter size={18} />
          SPIELE FILTERN
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <label className="adminCourtSelect">
            <CalendarDays size={16} />
            Datum
            <select
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            >
              <option value="Alle">Alle Tage</option>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date === "Ohne Datum" ? date : `${date}2026`}
                </option>
              ))}
            </select>
          </label>

          <label className="adminCourtSelect">
            <MapPin size={16} />
            Platz
            <select
              value={selectedCourt}
              onChange={(event) => setSelectedCourt(event.target.value)}
            >
              <option value="Alle">Alle Plätze</option>
              <option value="1">Platz 1</option>
              <option value="2">Platz 2</option>
              <option value="3">Platz 3</option>
              <option value="4">Platz 4</option>
              <option value="5">Platz 5</option>
              <option value="6">Platz 6 Reserve</option>
            </select>
          </label>

          <label className="adminCourtSelect">
            Status
            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as StatusFilter)
              }
            >
              <option value="Alle">Alle Status</option>
              <option value="planned">Geplant</option>
              <option value="live">Live</option>
              <option value="done">Beendet</option>
            </select>
          </label>
        </div>
      </section>

      <section className="adminSection" style={{ width: "100%", margin: 0 }}>
        <div
          className="adminSectionHeader"
          style={{
            alignItems: "end",
            marginBottom: 14,
          }}
        >
          <div>
            <p>🎾 LIVE & ERGEBNISSE</p>
            <h2>Spielsteuerung</h2>
          </div>

          <span style={{ color: "#aeb7c5", fontWeight: 850 }}>
            {filteredMatches.length} Spiele angezeigt
          </span>
        </div>

        {filteredMatches.length === 0 ? (
          <section className="emptyState">
            <b>Keine Spiele gefunden</b>
            <span>Ändere Datum, Platz oder Status im Filter.</span>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 14,
              alignItems: "start",
            }}
          >
            {filteredMatches.map((match) => {
              const matchKey = getMatchKey(match);
              const isEditing = editingMatchId === matchKey;

              return (
                <article
                  className={`adminMatchCard adminMatchCardCompact adminMatchCard-${match.status}`}
                  key={matchKey}
                  style={{
                    padding: 16,
                    borderRadius: 20,
                    minWidth: 0,
                  }}
                >
                  <div className="adminMatchTop">
                    <div>
                      <b>{match.time || "Noch nicht terminiert"}</b>
                      <span>Platz {match.court || "offen"}</span>
                    </div>

                    <em>{getStatusLabel(match.status)}</em>
                  </div>

                  <small>{match.competition}</small>

                  <div
                    className="adminPlayers"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <strong>{match.a}</strong>
                    <span>gegen</span>
                    <strong>{match.b}</strong>
                  </div>

                  {match.status === "live" && (
                    <p className="adminInfo">läuft seit {match.since} Uhr</p>
                  )}

                  {match.result && (
                    <p className="adminResult">Ergebnis: {match.result}</p>
                  )}

                  <button
                    type="button"
                    className="adminEditToggle"
                    onClick={() =>
                      setEditingMatchId(isEditing ? null : matchKey)
                    }
                  >
                    <Settings size={16} />
                    Bearbeiten
                  </button>

                  {isEditing && (
                    <div
                      className="adminEditGrid"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 10,
                      }}
                    >
                      <label className="adminCourtSelect">
                        Datum
                        <select
                          value={getDatePart(match.time)}
                          onChange={(event) =>
                            changeDate(match, event.target.value)
                          }
                        >
                          <option value="Ohne Datum">Ohne Datum</option>
                          {TOURNAMENT_DATES.map((date) => (
                            <option key={date} value={date}>
                              {date}2026
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="adminCourtSelect">
                        Uhrzeit
                        <input
                          type="time"
                          value={getTimePart(match.time)}
                          onChange={(event) => {
                            const date = getDatePart(match.time);
                            const nextTime =
                              date === "Ohne Datum"
                                ? event.target.value
                                : `${date} ${event.target.value}`;

                            changeTime(match, nextTime);
                          }}
                        />
                      </label>

                      <label className="adminCourtSelect">
                        Platz
                        <select
                          value={match.court}
                          onChange={(event) =>
                            changeCourt(match, Number(event.target.value))
                          }
                        >
                          <option value={1}>Platz 1</option>
                          <option value={2}>Platz 2</option>
                          <option value={3}>Platz 3</option>
                          <option value={4}>Platz 4</option>
                          <option value={5}>Platz 5</option>
                          <option value={6}>Platz 6 Reserve</option>
                        </select>
                      </label>
                    </div>
                  )}

                  <div
                    className="adminActions"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {match.status === "planned" && (
                      <button type="button" onClick={() => startMatch(match)}>
                        <Play size={18} />
                        Spiel starten
                      </button>
                    )}

                    {match.status === "live" && (
                      <button
                        type="button"
                        onClick={() => undoStartMatch(match)}
                      >
                        <Square size={18} />
                        Start rückgängig
                      </button>
                    )}

                    {match.status === "done" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateMatch({
                            ...match,
                            status: "planned",
                            result: "",
                          })
                        }
                      >
                        <RotateCcw size={18} />
                        Zurücksetzen
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedMatch(match)}
                    >
                      <Trophy size={18} />
                      Ergebnis
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedMatch && (
        <ResultDialog
          playerA={selectedMatch.a}
          playerB={selectedMatch.b}
          onSave={saveResult}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

export default Admin;