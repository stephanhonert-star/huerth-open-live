import * as pdfjsLib from "pdfjs-dist";
import type { Draw, DrawMatch, DrawPlayer, DrawRound, DrawRoundName } from "../models/Draw";
import type { Match } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.mjs";

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

function mapTestDate(date: string, useTestMapping: boolean) {
  if (!useTestMapping) return date;

  const mapping: Record<string, string> = {
    "07.07.": "18.07.",
    "08.07.": "19.07.",
    "09.07.": "20.07.",
    "10.07.": "21.07.",
    "11.07.": "22.07.",
    "12.07.": "23.07.",
    "13.07.": "24.07.",
    "14.07.": "25.07.",
    "15.07.": "26.07.",
    "16.07.": "27.07.",
    "17.07.": "28.07.",
    "18.07.": "29.07.",
  };

  return mapping[date] || date;
}

function getCompetition(lines: string[]) {
  const index = lines.findIndex((line) => line === "Bewerb:" || line.startsWith("Bewerb:"));

  if (index === -1) return "Unbekannte Konkurrenz";

  const sameLine = lines[index].replace(/^Bewerb:\s*/i, "").trim();
  const raw = sameLine || lines[index + 1] || "Unbekannte Konkurrenz";

  return clean(
    raw
      .replace(/\s+Hauptfeld.*$/i, "")
      .replace(/\s+Nebenrunde.*$/i, "")
      .replace(/\s+-\s+.*$/i, "")
  );
}

function getBracket(lines: string[]) {
  const text = lines.join(" ").toLowerCase();

  if (text.includes("nebenrunde")) return "nebenrunde";

  return "hauptfeld";
}

function getCompetitionCode(competition: string, bracket: "hauptfeld" | "nebenrunde") {
  const normalized = competition.toLowerCase();

  let code = "UNK";

  if (normalized.includes("herren 65")) code = "H65/E";
  else if (normalized.includes("herren 55")) code = "H55/E";
  else if (normalized.includes("herren 50")) code = "H50/E";
  else if (normalized.includes("herren 40")) code = "H40/E";
  else if (normalized.includes("herren 30")) code = "H30/E";
  else if (normalized.includes("herren")) code = "H/E";
  else if (normalized.includes("damen 55")) code = "D55/E";
  else if (normalized.includes("damen 50")) code = "D50/E";
  else if (normalized.includes("damen 40")) code = "D40/E";
  else if (normalized.includes("damen")) code = "D/E";

  if (bracket === "nebenrunde") {
    return `NR ${code}`;
  }

  return code;
}

function isPlayerLine(line: string) {
  return /.+?,.+\(\d+(?:\/LK\s*[0-9]{1,2}[,.][0-9])?\)/i.test(line);
}

function stripTime(value: string) {
  return clean(value).replace(/\s+\d{2}\.\d{2}\.\s+\d{2}:\d{2}$/, "");
}

function parsePlayer(line: string, nextLine?: string): DrawPlayer | null {
  const playerLine = stripTime(line);

  const playerMatch = clean(playerLine).match(
    /^(?:(\d+)\s+)?(.+?),\s*(.+?)\s+\((\d+)(?:\/LK\s*([0-9]{1,2}[,.][0-9]))?\)$/i
  );

  if (!playerMatch) return null;

  return {
    name: `${clean(playerMatch[2])} ${clean(playerMatch[3])}`,
    seed: playerMatch[1] ? Number(playerMatch[1]) : undefined,
    lk: playerMatch[5] ? playerMatch[5].replace(".", ",") : undefined,
    club:
      nextLine && !isPlayerLine(nextLine) && !nextLine.startsWith("[Rast]")
        ? clean(nextLine)
        : undefined,
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

function getScheduleTimes(lines: string[]) {
  const useTestMapping = lines.some((line) => line.includes("07.07.2021 bis 18.07.2021"));
  const times: string[] = [];

  lines.forEach((line) => {
    const matches = [...line.matchAll(/(\d{2}\.\d{2}\.)\s+(\d{2}:\d{2})/g)];

    matches.forEach((match) => {
      times.push(`${mapTestDate(match[1], useTestMapping)} ${match[2]}`);
    });
  });

  return times;
}

function getRoundNamesFromPdf(lines: string[]): DrawRoundName[] {
  const possibleRounds: DrawRoundName[] = [
    "Runde 1",
    "Runde 2",
    "Achtelfinale",
    "Viertelfinale",
    "Halbfinale",
    "Spiel um Platz 3",
    "Finale",
    "Sieger",
  ];

  const header = lines.find(
    (line) => possibleRounds.filter((roundName) => line.includes(roundName)).length >= 2
  );

  if (!header) return [];

  return possibleRounds.filter((roundName) => header.includes(roundName));
}

function nextPowerOfTwo(value: number) {
  let size = 2;

  while (size < value) {
    size *= 2;
  }

  return size;
}

function getFallbackRoundNames(fieldSize: number): DrawRoundName[] {
  if (fieldSize <= 8) {
    return ["Viertelfinale", "Halbfinale", "Finale", "Sieger"];
  }

  if (fieldSize <= 16) {
    return ["Achtelfinale", "Viertelfinale", "Halbfinale", "Finale", "Sieger"];
  }

  if (fieldSize <= 32) {
    return ["Runde 1", "Achtelfinale", "Viertelfinale", "Halbfinale", "Finale", "Sieger"];
  }

  return ["Runde 1", "Runde 2", "Achtelfinale", "Viertelfinale", "Halbfinale", "Finale", "Sieger"];
}

function placeholder(roundName: DrawRoundName, index: number) {
  if (roundName === "Finale") return `Finalist ${index}`;
  if (roundName === "Halbfinale") return `Sieger Viertelfinale ${index}`;
  if (roundName === "Viertelfinale") return `Sieger Achtelfinale ${index}`;
  if (roundName === "Achtelfinale") return `Sieger Runde 1 ${index}`;
  if (roundName === "Runde 2") return `Sieger Runde 1 ${index}`;

  return `Sieger Match ${index}`;
}

function addExtra<T>(value: T, extra: Record<string, unknown>): T {
  return {
    ...(value as Record<string, unknown>),
    ...extra,
  } as T;
}

function getMatchNr(roundIndex: number, matchIndex: number) {
  return String(roundIndex * 100 + matchIndex);
}

function createRounds(
  competition: string,
  competitionCode: string,
  bracket: "hauptfeld" | "nebenrunde",
  players: DrawPlayer[],
  scheduleTimes: string[],
  pdfRoundNames: DrawRoundName[]
): DrawRound[] {
  const fieldSize = nextPowerOfTwo(players.length);
  const byes = fieldSize - players.length;
  const roundNames = pdfRoundNames.length > 0 ? pdfRoundNames : getFallbackRoundNames(fieldSize);
  const baseId = `${slug(competition)}-${bracket}`;
  const rounds: DrawRound[] = [];

  let currentMatchCount = fieldSize / 2;
  let firstRoundPlayerCount = players.length;
  let scheduleIndex = 0;

  if (byes > 0 && fieldSize >= 16) {
    firstRoundPlayerCount = players.length - byes;
    currentMatchCount = Math.max(1, firstRoundPlayerCount / 2);
  }

  const byePlayers = players.slice(firstRoundPlayerCount);

  for (let roundIndex = 0; roundIndex < roundNames.length; roundIndex++) {
    const roundName = roundNames[roundIndex];
    const matches: DrawMatch[] = [];

    if (roundName === "Sieger") {
      matches.push(
        addExtra(
          {
            id: `${baseId}-winner`,
            competition,
            bracket,
            round: "Sieger",
            roundIndex: roundIndex + 1,
            matchIndex: 1,
            playerA: { name: "Turniersieger" },
            status: "planned",
          },
          {
            nr: getMatchNr(roundIndex + 1, 1),
            competitionCode,
          }
        )
      );

      rounds.push({
        name: roundName,
        roundIndex: roundIndex + 1,
        matches,
      });

      continue;
    }

    if (roundName === "Spiel um Platz 3") {
      matches.push(
        addExtra(
          {
            id: `${baseId}-place3`,
            competition,
            bracket,
            round: "Spiel um Platz 3",
            roundIndex: roundIndex + 1,
            matchIndex: 1,
            playerA: { name: "Verlierer Halbfinale 1" },
            playerB: { name: "Verlierer Halbfinale 2" },
            status: "planned",
            court: 1,
            time: scheduleTimes[scheduleIndex] || "",
          },
          {
            nr: getMatchNr(roundIndex + 1, 1),
            competitionCode,
          }
        )
      );

      scheduleIndex++;

      rounds.push({
        name: roundName,
        roundIndex: roundIndex + 1,
        matches,
      });

      continue;
    }

    for (let matchIndex = 0; matchIndex < currentMatchCount; matchIndex++) {
      const nr = getMatchNr(roundIndex + 1, matchIndex + 1);
      const id = `${baseId}-nr${nr}`;
      const nextRoundName = roundNames[roundIndex + 1];
      const nextMatchIndex = Math.floor(matchIndex / 2) + 1;

      let nextMatchId = `${baseId}-nr${getMatchNr(roundIndex + 2, nextMatchIndex)}`;

      if (nextRoundName === "Spiel um Platz 3") {
        nextMatchId = `${baseId}-nr${getMatchNr(roundIndex + 3, nextMatchIndex)}`;
      }

      if (nextRoundName === "Sieger") {
        nextMatchId = `${baseId}-winner`;
      }

      const playerA =
        roundIndex === 0
          ? players[matchIndex * 2]
          : roundIndex === 1 && byes > 0 && fieldSize >= 16
          ? { name: placeholder(roundNames[roundIndex - 1], matchIndex + 1) }
          : { name: placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 1) };

      const playerB =
        roundIndex === 0
          ? players[matchIndex * 2 + 1]
          : roundIndex === 1 && byes > 0 && fieldSize >= 16
          ? byePlayers[matchIndex] || { name: placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 2) }
          : { name: placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 2) };

      matches.push(
        addExtra(
          {
            id,
            competition,
            bracket,
            round: roundName,
            roundIndex: roundIndex + 1,
            matchIndex: matchIndex + 1,
            playerA,
            playerB,
            status: "planned",
            court: 1,
            time: scheduleTimes[scheduleIndex] || "",
            nextMatchId,
            nextSlot: matchIndex % 2 === 0 ? "playerA" : "playerB",
          },
          {
            nr,
            competitionCode,
          }
        )
      );

      scheduleIndex++;
    }

    rounds.push({
      name: roundName,
      roundIndex: roundIndex + 1,
      matches,
    });

    currentMatchCount = currentMatchCount / 2;

    if (roundIndex === 0 && byes > 0 && fieldSize >= 16) {
      currentMatchCount = fieldSize / 4;
    }
  }

  return rounds;
}

function createMatchesFromDraw(draw: Draw): Match[] {
  return draw.rounds
    .flatMap((round) => round.matches)
    .filter((match) => match.round !== "Sieger")
    .map((match) =>
      addExtra(
        {
          drawMatchId: match.id,
          time: match.time || "",
          court: match.court || 1,
          competition: match.competition,
          a: match.playerA?.name || "offen",
          b: match.playerB?.name || "offen",
          status: "planned",
          since: "",
          result: "",
        },
        {
          nr: (match as unknown as { nr?: string }).nr,
          competitionCode: (match as unknown as { competitionCode?: string }).competitionCode,
        }
      )
    );
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
  const bracket = getBracket(allLines);
  const competitionCode = getCompetitionCode(competition, bracket);
  const entries = getPlayerEntries(allLines);
  const players = entries.map((entry) => entry.player);
  const scheduleTimes = getScheduleTimes(allLines);
  const pdfRoundNames = getRoundNamesFromPdf(allLines);
  const rounds = createRounds(competition, competitionCode, bracket, players, scheduleTimes, pdfRoundNames);

  const draw: Draw = {
    id: `${slug(competition)}-${bracket}`,
    competition,
    bracket,
    title: `${competition} ${bracket === "nebenrunde" ? "Nebenrunde" : "Hauptfeld"}`,
    rounds,
  };

  return {
    draw,
    matches: createMatchesFromDraw(draw),
    debugText,
    playerCount: players.length,
  };
}
