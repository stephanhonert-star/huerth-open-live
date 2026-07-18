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
  undoDrawResult,
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
type AdminMatchView = "open" | "done";

type DrawImportResult = Awaited<ReturnType<typeof parseDrawFromPdf>>;
type TournamentDraw = DrawImportResult["draws"][number];
type TournamentDrawMatch = TournamentDraw["rounds"][number]["matches"][number];

type ImportSummary = {
  newMatches: number;
  updatedMatches: number;
  unchangedMatches: number;
};

function normalizeMatchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function getStableMatchKey(match: Match) {
  if (match.drawMatchId) {
    return `draw:${match.drawMatchId}`;
  }

  const players = [normalizeMatchText(match.a), normalizeMatchText(match.b)]
    .sort()
    .join("|");

  return `fallback:${normalizeMatchText(match.competition)}:${players}`;
}

function mergeImportedMatch(existing: Match, imported: Match): Match {
  const importedAIsPlaceholder = isPlaceholderName(imported.a);
  const importedBIsPlaceholder = isPlaceholderName(imported.b);
  const existingAIsReal = !isPlaceholderName(existing.a);
  const existingBIsReal = !isPlaceholderName(existing.b);

  return {
    ...existing,
    ...imported,

    // Fortschreibung aus bereits gespielten Matches nicht wieder
    // durch Platzhalter aus einer neu importierten PDF überschreiben.
    a:
      importedAIsPlaceholder && existingAIsReal
        ? existing.a
        : imported.a,
    b:
      importedBIsPlaceholder && existingBIsReal
        ? existing.b
        : imported.b,

    // Alles, was während des Turniers manuell geändert oder erfasst wurde,
    // bleibt bei einem erneuten Import erhalten.
    time: existing.time,
    court: existing.court,
    status: existing.status,
    since: existing.since,
    result: existing.result,
    drawMatchId: imported.drawMatchId || existing.drawMatchId,
  };
}

function mergeMatches(
  existingMatches: Match[],
  importedMatches: Match[],
): { matches: Match[]; summary: ImportSummary } {
  const nextMatches = [...existingMatches];
  const indexByKey = new Map<string, number>();

  nextMatches.forEach((match, index) => {
    indexByKey.set(getStableMatchKey(match), index);
  });

  let newMatches = 0;
  let updatedMatches = 0;
  let unchangedMatches = 0;

  importedMatches.forEach((importedMatch) => {
    const key = getStableMatchKey(importedMatch);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, nextMatches.length);
      nextMatches.push(importedMatch);
      newMatches += 1;
      return;
    }

    const existingMatch = nextMatches[existingIndex];
    const mergedMatch = mergeImportedMatch(existingMatch, importedMatch);

    if (JSON.stringify(existingMatch) === JSON.stringify(mergedMatch)) {
      unchangedMatches += 1;
    } else {
      updatedMatches += 1;
    }

    nextMatches[existingIndex] = mergedMatch;
  });

  return {
    matches: nextMatches,
    summary: {
      newMatches,
      updatedMatches,
      unchangedMatches,
    },
  };
}

function mergePlayers(
  existingPlayers: Player[],
  importedPlayers: Player[],
): Player[] {
  const nextPlayers = [...existingPlayers];
  const indexByKey = new Map<string, number>();

  nextPlayers.forEach((player, index) => {
    const key = `${normalizeMatchText(player.name)}|${normalizeMatchText(
      player.competition,
    )}`;

    indexByKey.set(key, index);
  });

  importedPlayers.forEach((importedPlayer) => {
    const key = `${normalizeMatchText(
      importedPlayer.name,
    )}|${normalizeMatchText(importedPlayer.competition)}`;

    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, nextPlayers.length);
      nextPlayers.push(importedPlayer);
      return;
    }

    const existingPlayer = nextPlayers[existingIndex];

    nextPlayers[existingIndex] = {
      ...existingPlayer,
      ...importedPlayer,
      club:
        importedPlayer.club &&
        importedPlayer.club !== "Unbekannter Verein"
          ? importedPlayer.club
          : existingPlayer.club,
      lk:
        importedPlayer.lk && importedPlayer.lk !== "-"
          ? importedPlayer.lk
          : existingPlayer.lk,
      year:
        importedPlayer.year && importedPlayer.year !== "-"
          ? importedPlayer.year
          : existingPlayer.year,
    };
  });

  return nextPlayers;
}

function preserveDrawMatchFields(
  importedMatch: TournamentDrawMatch,
  existingMatch: TournamentDrawMatch,
): TournamentDrawMatch {
  const importedRecord = importedMatch as unknown as Record<string, unknown>;
  const existingRecord = existingMatch as unknown as Record<string, unknown>;

  const mergedRecord: Record<string, unknown> = {
    ...existingRecord,
    ...importedRecord,
  };

  [
    "time",
    "court",
    "result",
    "winner",
    "status",
    "since",
    "completed",
  ].forEach((key) => {
    const existingValue = existingRecord[key];

    if (
      existingValue !== undefined &&
      existingValue !== null &&
      existingValue !== ""
    ) {
      mergedRecord[key] = existingValue;
    }
  });

  const importedPlayerA = importedRecord.playerA as
    | { name?: string }
    | undefined;
  const importedPlayerB = importedRecord.playerB as
    | { name?: string }
    | undefined;
  const existingPlayerA = existingRecord.playerA as
    | { name?: string }
    | undefined;
  const existingPlayerB = existingRecord.playerB as
    | { name?: string }
    | undefined;

  if (
    importedPlayerA?.name &&
    isPlaceholderName(importedPlayerA.name) &&
    existingPlayerA?.name &&
    !isPlaceholderName(existingPlayerA.name)
  ) {
    mergedRecord.playerA = existingRecord.playerA;
  }

  if (
    importedPlayerB?.name &&
    isPlaceholderName(importedPlayerB.name) &&
    existingPlayerB?.name &&
    !isPlaceholderName(existingPlayerB.name)
  ) {
    mergedRecord.playerB = existingRecord.playerB;
  }

  return mergedRecord as unknown as TournamentDrawMatch;
}

function mergeDraws(
  existingDraws: TournamentDraw[],
  importedDraws: TournamentDraw[],
): TournamentDraw[] {
  const nextDraws = [...existingDraws];
  const drawIndexById = new Map<string, number>();

  nextDraws.forEach((draw, index) => {
    drawIndexById.set(draw.id, index);
  });

  importedDraws.forEach((importedDraw) => {
    const existingIndex = drawIndexById.get(importedDraw.id);

    if (existingIndex === undefined) {
      drawIndexById.set(importedDraw.id, nextDraws.length);
      nextDraws.push(importedDraw);
      return;
    }

    const existingDraw = nextDraws[existingIndex];
    const existingMatchesById = new Map<string, TournamentDrawMatch>();

    existingDraw.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        existingMatchesById.set(match.id, match);
      });
    });

    nextDraws[existingIndex] = {
      ...existingDraw,
      ...importedDraw,
      rounds: importedDraw.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((importedMatch) => {
          const existingMatch = existingMatchesById.get(importedMatch.id);

          return existingMatch
            ? preserveDrawMatchFields(importedMatch, existingMatch)
            : importedMatch;
        }),
      })),
    };
  });

  return nextDraws;
}

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
    }),
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
  result: Awaited<ReturnType<typeof parseDrawFromPdf>>,
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
              player.competition === draw.competition,
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
    () => sessionStorage.getItem("huerth-open-admin") === "true",
  );
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Match[]>(loadMatches);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedDate, setSelectedDate] = useState("Alle");
  const [selectedCourt, setSelectedCourt] = useState("Alle");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("Alle");
  const [adminMatchView, setAdminMatchView] = useState<AdminMatchView>("open");
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
      getMatchKey(match) === updatedKey ? updatedMatch : match,
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
      date === "Ohne Datum" ? clock : `${date}${clock ? ` ${clock}` : ""}`;

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
    setImportMessage("Auslosung wird importiert und zusammengeführt...");

    try {
      const result = await parseDrawFromPdf(file);
      const importedPlayers = createPlayersFromDraw(result);

      const currentDraws = loadDraws();
      const currentPlayers = loadPlayers();

      const mergedDraws = mergeDraws(currentDraws, result.draws);
      const mergedMatchResult = mergeMatches(matches, result.matches);
      const mergedPlayers = mergePlayers(currentPlayers, importedPlayers);

      saveDraws(mergedDraws);
      setMatches(mergedMatchResult.matches);
      saveMatches(mergedMatchResult.matches);
      savePlayers(mergedPlayers);

      await publishLiveData(mergedMatchResult.matches, mergedPlayers);

      const { newMatches, updatedMatches, unchangedMatches } =
        mergedMatchResult.summary;

      setImportMessage(
        `${result.draws.length} Konkurrenzen geprüft · ` +
          `${newMatches} Spiele neu · ` +
          `${updatedMatches} aktualisiert · ` +
          `${unchangedMatches} unverändert · ` +
          `Ergebnisse, Status, Platz und Spielzeit wurden beibehalten`,
      );
    } catch (importError) {
      console.error(importError);
      setImportMessage("Fehler beim Zusammenführen der Auslosung");
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

  async function resetResult(matchToReset: Match) {
    const nextInfo = getNextMatchInfo(matchToReset.drawMatchId);

    if (matchToReset.drawMatchId) {
      undoDrawResult(matchToReset.drawMatchId);
    }

    const nextMatches = matches.map((match) => {
      if (getMatchKey(match) === getMatchKey(matchToReset)) {
        return {
          ...match,
          status: "planned" as const,
          result: "",
          since: "",
        };
      }

      if (nextInfo && match.drawMatchId === nextInfo.nextMatchId) {
        return {
          ...match,
          a: nextInfo.nextSlot === "playerA" ? "offen" : match.a,
          b: nextInfo.nextSlot === "playerB" ? "offen" : match.b,
        };
      }

      return match;
    });

    setMatches(nextMatches);
    saveMatches(nextMatches);
    await publishLiveData(nextMatches, loadPlayers());
  }

  async function resetMatches() {
    localStorage.removeItem(MATCH_STORAGE_KEY);
    resetDraws();
    setMatches(defaultMatches);
    setSelectedDate("Alle");
    setSelectedCourt("Alle");
    setSelectedStatus("Alle");
    setAdminMatchView("open");
    window.dispatchEvent(new Event("huerthOpenMatchesUpdated"));
    await publishLiveData(defaultMatches, loadPlayers());
  }

  async function resetEverything() {
    const confirmed = window.confirm(
      "Wirklich alle importierten Spieler und gespeicherten Ergebnisse löschen?",
    );

    if (!confirmed) return;

    localStorage.removeItem(MATCH_STORAGE_KEY);
    localStorage.removeItem(PLAYER_STORAGE_KEY);

    resetDraws();
    setMatches(defaultMatches);
    setSelectedDate("Alle");
    setSelectedCourt("Alle");
    setSelectedStatus("Alle");
    setAdminMatchView("open");

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
    new Set(matches.map((match) => getDatePart(match.time))),
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

      const matchesView =
        adminMatchView === "done"
          ? match.status === "done"
          : match.status !== "done";

      const matchesStatus =
        selectedStatus === "Alle" || match.status === selectedStatus;

      return (
        hasRealPlayers(match) &&
        matchesDate &&
        matchesCourt &&
        matchesView &&
        matchesStatus
      );
    }),
  );

  const visibleTimeSlots = Array.from(
    new Set(filteredMatches.map((match) => match.time || "Noch nicht terminiert")),
  ).sort((a, b) => timeSortValue(a) - timeSortValue(b));

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
              {adminMatchView === "open" ? (
                <>
                  <option value="Alle">Geplant &amp; live</option>
                  <option value="planned">Nur geplant</option>
                  <option value="live">Nur live</option>
                </>
              ) : (
                <option value="Alle">Beendete Spiele</option>
              )}
            </select>
          </label>
        </div>
      </section>

      <section
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setAdminMatchView("open");
            setSelectedStatus("Alle");
          }}
          style={{
            border:
              adminMatchView === "open"
                ? "1px solid #d50b3d"
                : "1px solid #333",
            borderRadius: 999,
            padding: "11px 18px",
            background: adminMatchView === "open" ? "#d50b3d" : "#151515",
            color: "white",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          Offen &amp; live ({plannedMatches.length + liveMatches.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setAdminMatchView("done");
            setSelectedStatus("Alle");
          }}
          style={{
            border:
              adminMatchView === "done"
                ? "1px solid #d50b3d"
                : "1px solid #333",
            borderRadius: 999,
            padding: "11px 18px",
            background: adminMatchView === "done" ? "#d50b3d" : "#151515",
            color: "white",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          Beendet ({doneMatches.length})
        </button>
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
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              gap: 8,
              alignItems: "start",
              width: "100%",
              overflow: "visible",
              paddingBottom: 14,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((court) => {
              const courtMatches = filteredMatches.filter(
                (match) => match.court === court,
              );

              return (
                <section
                  key={court}
                  style={{
                    minWidth: 0,
                    background: "rgba(15, 15, 15, 0.94)",
                    border: "1px solid #2b2b2b",
                    borderRadius: 18,
                    padding: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      padding: "3px 2px 9px",
                      borderBottom: "1px solid #2b2b2b",
                      marginBottom: 9,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: "block",
                          color: court === 6 ? "#ffbf69" : "#80ffad",
                          fontSize: 10,
                          fontWeight: 950,
                          letterSpacing: 1.2,
                          textTransform: "uppercase",
                        }}
                      >
                        {court === 6 ? "Reserve" : "Matchplatz"}
                      </span>
                      <strong style={{ color: "white", fontSize: 18 }}>
                        Platz {court}
                      </strong>
                    </div>

                    <span
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#252525",
                        color: "white",
                        fontWeight: 950,
                      }}
                    >
                      {courtMatches.length}
                    </span>
                  </div>

                  {courtMatches.length === 0 ? (
                    <div
                      style={{
                        padding: "24px 10px",
                        textAlign: "center",
                        color: "#7f8794",
                        fontWeight: 850,
                      }}
                    >
                      Keine Spiele
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        rowGap: 18,
                        gridTemplateRows: `repeat(${visibleTimeSlots.length}, 390px)`,
                      }}
                    >
                      {courtMatches.map((match) => {
                        const matchKey = getMatchKey(match);
                        const isEditing = editingMatchId === matchKey;

                        return (
                          <article
                            className={`adminMatchCard adminMatchCardCompact adminMatchCard-${match.status}`}
                            key={matchKey}
                            style={{
                              padding: 10,
                              borderRadius: 15,
                              minWidth: 0,
                              gridRow:
                                visibleTimeSlots.indexOf(
                                  match.time || "Noch nicht terminiert",
                                ) + 1,
                            }}
                          >
                            <div className="adminMatchTop">
                              <div>
                                <b style={{ fontSize: 13 }}>
                                  {match.time || "Noch nicht terminiert"}
                                </b>
                                <span style={{ fontSize: 10 }}>
                                  Platz {match.court || "offen"}
                                </span>
                              </div>

                              <em>{getStatusLabel(match.status)}</em>
                            </div>

                            <small style={{ fontSize: 10 }}>
                              {match.competition}
                            </small>

                            <div
                              className="adminPlayers"
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(0, 1fr) auto minmax(0, 1fr)",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <strong
                                style={{
                                  fontSize: 13,
                                  lineHeight: 1.12,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {match.a}
                              </strong>
                              <span style={{ fontSize: 9 }}>gegen</span>
                              <strong
                                style={{
                                  fontSize: 13,
                                  lineHeight: 1.12,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {match.b}
                              </strong>
                            </div>

                            {match.status === "live" && (
                              <p className="adminInfo">
                                läuft seit {match.since} Uhr
                              </p>
                            )}

                            {match.result && (
                              <p className="adminResult">
                                Ergebnis: {match.result}
                              </p>
                            )}

                            <button
                              type="button"
                              className="adminEditToggle"
                              style={{ padding: "6px 8px", fontSize: 10 }}
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
                                  gridTemplateColumns: "1fr",
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
                                    <option value="Ohne Datum">
                                      Ohne Datum
                                    </option>
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
                                      changeCourt(
                                        match,
                                        Number(event.target.value),
                                      )
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
                                gridTemplateColumns: "1fr",
                                gap: 6,
                              }}
                            >
                              {match.status === "planned" && (
                                <button
                                  type="button"
                                  style={{ padding: "8px 6px", fontSize: 11 }}
                                  onClick={() => startMatch(match)}
                                >
                                  <Play size={14} />
                                  Spiel starten
                                </button>
                              )}

                              {match.status === "live" && (
                                <button
                                  type="button"
                                  style={{ padding: "8px 6px", fontSize: 11 }}
                                  onClick={() => undoStartMatch(match)}
                                >
                                  <Square size={14} />
                                  Start rückgängig
                                </button>
                              )}

                              {match.status === "done" && (
                                <button
                                  type="button"
                                  style={{ padding: "8px 6px", fontSize: 11 }}
                                  onClick={() => resetResult(match)}
                                >
                                  <RotateCcw size={14} />
                                  Zurücksetzen
                                </button>
                              )}

                              <button
                                type="button"
                                style={{ padding: "8px 6px", fontSize: 11 }}
                                onClick={() => setSelectedMatch(match)}
                              >
                                <Trophy size={14} />
                                Ergebnis
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
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