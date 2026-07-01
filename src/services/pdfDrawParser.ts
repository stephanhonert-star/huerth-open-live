import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { Draw, DrawMatch, DrawPlayer, DrawRound, DrawRoundName } from "../models/Draw";
import type { Match } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export type PdfDrawImportResult = {
  draw: Draw;
  matches: Match[];
  debugText: string;
  playerCount: number;
};

type PlayerEntry = {
  player: DrawPlayer;
  lineIndex: number;
};

const TEST_SCHEDULE = [
  "18.07. 09:00",
  "18.07. 10:30",
  "18.07. 12:00",
  "18.07. 13:30",
  "18.07. 15:00",
  "19.07. 09:00",
  "19.07. 10:30",
  "19.07. 12:00",
  "19.07. 13:30",
  "19.07. 15:00",
  "20.07. 16:30",
  "20.07. 18:00",
  "21.07. 16:30",
  "21.07. 18:00",
  "22.07. 16:30",
  "22.07. 18:00",
  "23.07. 16:30",
  "23.07. 18:00",
  "24.07. 16:30",
  "24.07. 18:00",
  "25.07. 09:00",
  "25.07. 10:30",
  "25.07. 12:00",
  "25.07. 13:30",
  "26.07. 09:00",
  "26.07. 10:30",
  "26.07. 12:00",
  "26.07. 13:30",
  "27.07. 16:30",
  "27.07. 18:00",
  "02.08. 11:00",
  "02.08. 14:00",
];

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getCompetition(lines: string[]) {
  const index = lines.findIndex((line) => line === "Bewerb:" || line.startsWith("Bewerb:"));

  if (index === -1) return "Unbekannte Konkurrenz";

  const sameLine = lines[index].replace(/^Bewerb:\s*/i, "").trim();
  const raw = sameLine || lines[index + 1] || "Unbekannte Konkurrenz";

  return clean(raw.replace(/\s+Hauptfeld.*$/i, "").replace(/\s+-\s+.*$/i, ""));
}

function isPlayerLine(line: string) {
  return /.+?,.+\(\d+\/LK\s*[0-9]{1,2}[,.][0-9]\)/i.test(line);
}

function parsePlayer(line: string, nextLine?: string): DrawPlayer | null {
  const playerMatch = clean(line).match(
    /^(?:(\d+)\s+)?(.+?),\s*(.+?)\s+\((\d+)\/LK\s*([0-9]{1,2}[,.][0-9])\)$/i
  );

  if (!playerMatch) return null;

  return {
    name: `${clean(playerMatch[2])} ${clean(playerMatch[3])}`,
    seed: playerMatch[1] ? Number(playerMatch[1]) : undefined,
    lk: playerMatch[5].replace(".", ","),
    club: nextLine && !isPlayerLine(nextLine) ? clean(nextLine) : undefined,
  };
}

function getPlayerEntries(lines: string[]) {
  const entries: PlayerEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (/^\d+$/.test(line) && lines[i + 1] && lines[i + 2]) {
      line = `${line} ${lines[i + 1]} ${lines[i + 2]}`;
    }

    if (!isPlayerLine(line)) continue;

    const player = parsePlayer(line, lines[i + 1]);

    if (player && !entries.some((entry) => entry.player.name === player.name)) {
      entries.push({ player, lineIndex: i });
    }
  }

  return entries;
}

function nextPowerOfTwo(value: number) {
  let size = 2;

  while (size < value) {
    size *= 2;
  }

  return size;
}

function getRoundNames(fieldSize: number): DrawRoundName[] {
  if (fieldSize <= 8) {
    return ["Viertelfinale", "Halbfinale", "Spiel um Platz 3", "Finale", "Sieger"];
  }

  if (fieldSize <= 16) {
    return ["Achtelfinale", "Viertelfinale", "Halbfinale", "Spiel um Platz 3", "Finale", "Sieger"];
  }

  return ["Runde 1", "Achtelfinale", "Viertelfinale", "Halbfinale", "Spiel um Platz 3", "Finale", "Sieger"];
}

function placeholder(roundName: DrawRoundName, index: number) {
  if (roundName === "Finale") return `Finalist ${index}`;
  if (roundName === "Halbfinale") return `Sieger Viertelfinale ${index}`;
  if (roundName === "Viertelfinale") return `Sieger Achtelfinale ${index}`;
  if (roundName === "Achtelfinale") return `Sieger Runde 1 ${index}`;

  return `Sieger Match ${index}`;
}

function getSchedule(index: number) {
  return TEST_SCHEDULE[index] || "";
}

function getCourt(index: number) {
  return (index % 5) + 1;
}

function createRounds(competition: string, players: DrawPlayer[]): DrawRound[] {
  const fieldSize = nextPowerOfTwo(players.length);
  const byes = fieldSize - players.length;
  const roundNames = getRoundNames(fieldSize);
  const baseId = slug(competition);
  const rounds: DrawRound[] = [];

  let currentMatchCount = fieldSize / 2;
  let firstRoundPlayerCount = players.length;
  let scheduleIndex = 0;

  if (byes > 0 && fieldSize === 32) {
    firstRoundPlayerCount = players.length - byes;
    currentMatchCount = firstRoundPlayerCount / 2;
  }

  const byePlayers = players.slice(firstRoundPlayerCount);

  for (let roundIndex = 0; roundIndex < roundNames.length; roundIndex++) {
    const roundName = roundNames[roundIndex];
    const matches: DrawMatch[] = [];

    if (roundName === "Spiel um Platz 3") {
      matches.push({
        id: `${baseId}-hauptfeld-place3`,
        competition,
        bracket: "hauptfeld",
        round: "Spiel um Platz 3",
        roundIndex: roundIndex + 1,
        matchIndex: 1,
        playerA: { name: "Verlierer Halbfinale 1" },
        playerB: { name: "Verlierer Halbfinale 2" },
        status: "planned",
        court: 2,
        time: "02.08. 11:00",
      });

      rounds.push({
        name: roundName,
        roundIndex: roundIndex + 1,
        matches,
      });

      continue;
    }

    if (roundName === "Sieger") {
      matches.push({
        id: `${baseId}-hauptfeld-winner`,
        competition,
        bracket: "hauptfeld",
        round: "Sieger",
        roundIndex: roundIndex + 1,
        matchIndex: 1,
        playerA: { name: "Turniersieger" },
        status: "planned",
      });

      rounds.push({
        name: roundName,
        roundIndex: roundIndex + 1,
        matches,
      });

      continue;
    }

    for (let matchIndex = 0; matchIndex < currentMatchCount; matchIndex++) {
      const id = `${baseId}-hauptfeld-r${roundIndex + 1}-m${matchIndex + 1}`;
      const nextRoundName = roundNames[roundIndex + 1];
      const nextMatchIndex = Math.floor(matchIndex / 2) + 1;

      let nextMatchId = `${baseId}-hauptfeld-r${roundIndex + 2}-m${nextMatchIndex}`;

      if (nextRoundName === "Spiel um Platz 3") {
        nextMatchId = `${baseId}-hauptfeld-r${roundIndex + 3}-m${nextMatchIndex}`;
      }

      if (nextRoundName === "Sieger") {
        nextMatchId = `${baseId}-hauptfeld-winner`;
      }

      const playerA =
        roundIndex === 0
          ? players[matchIndex * 2]
          : roundIndex === 1 && byes > 0 && fieldSize === 32
          ? { name: placeholder(roundNames[roundIndex - 1], matchIndex + 1) }
          : { name: placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 1) };

      const playerB =
        roundIndex === 0
          ? players[matchIndex * 2 + 1]
          : roundIndex === 1 && byes > 0 && fieldSize === 32
          ? byePlayers[matchIndex]
          : { name: placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 2) };

      const isFinal = roundName === "Finale";

      matches.push({
        id,
        competition,
        bracket: "hauptfeld",
        round: roundName,
        roundIndex: roundIndex + 1,
        matchIndex: matchIndex + 1,
        playerA,
        playerB,
        status: "planned",
        court: isFinal ? 1 : getCourt(scheduleIndex),
        time: isFinal ? "02.08. 14:00" : getSchedule(scheduleIndex),
        nextMatchId,
        nextSlot: matchIndex % 2 === 0 ? "playerA" : "playerB",
      });

      scheduleIndex++;
    }

    rounds.push({
      name: roundName,
      roundIndex: roundIndex + 1,
      matches,
    });

    currentMatchCount = currentMatchCount / 2;

    if (roundIndex === 0 && byes > 0 && fieldSize === 32) {
      currentMatchCount = fieldSize / 4;
    }
  }

  return rounds;
}

function createMatchesFromDraw(draw: Draw): Match[] {
  return draw.rounds
    .flatMap((round) => round.matches)
    .filter((match) => match.round !== "Sieger")
    .map((match) => ({
      drawMatchId: match.id,
      time: match.time || "",
      court: match.court || 1,
      competition: match.competition,
      a: match.playerA?.name || "offen",
      b: match.playerB?.name || "offen",
      status: "planned",
      since: "",
      result: "",
    }));
}

export async function parseDrawFromPdf(file: File): Promise<PdfDrawImportResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let debugText = "";
  const allLines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const lines = textContent.items
      .map((item) => ("str" in item ? clean(item.str) : ""))
      .filter(Boolean);

    allLines.push(...lines);
    debugText += `\n\n--- SEITE ${pageNumber} ---\n${lines.join("\n")}`;
  }

  const competition = getCompetition(allLines);
  const entries = getPlayerEntries(allLines);
  const players = entries.map((entry) => entry.player);
  const rounds = createRounds(competition, players);

  const draw: Draw = {
    id: `${slug(competition)}-hauptfeld`,
    competition,
    bracket: "hauptfeld",
    title: `${competition} Hauptfeld`,
    rounds,
  };

  return {
    draw,
    matches: createMatchesFromDraw(draw),
    debugText,
    playerCount: players.length,
  };
}