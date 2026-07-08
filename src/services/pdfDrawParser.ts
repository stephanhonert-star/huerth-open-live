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
  const fullText = lines.join(" ");
  const match = fullText.match(/Bewerb:\s*(.+?)(?:\s+Hauptfeld|\s+Nebenrunde|$)/i);

  if (!match) return "Unbekannte Konkurrenz";

  return clean(match[1].replace(/^Nebenrunde\s+/i, ""));
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

  return bracket === "nebenrunde" ? `NR ${code}` : code;
}

function isClubLine(line: string) {
  return (
    line.includes("TC ") ||
    line.includes("TVM") ||
    line.includes("Tennis") ||
    line.includes("Club") ||
    line.includes("Verein")
  );
}

function normalizePlayerLine(line: string, nextLine?: string, nextNextLine?: string) {
  let value = clean(line);

  if (/^\d+$/.test(value) && nextLine && nextNextLine) {
    value = `${value} ${clean(nextLine)} ${clean(nextNextLine)}`;
  }

  if (/^\d+\s+[A-ZÄÖÜ][^()]+$/.test(value) && nextLine?.startsWith("(")) {
    value = `${value} ${nextLine}`;
  }

  if (/^[A-ZÄÖÜ][^()]+$/.test(value) && nextLine?.startsWith("(")) {
    value = `${value} ${nextLine}`;
  }

  return value;
}

function parsePlayerLine(line: string, club?: string): DrawPlayer | null {
  const value = clean(line).replace(/\s+\d{2}\.\d{2}\.\s+\d{2}:\d{2}$/, "");

  const match = value.match(
    /^(?:(\d+)\s+)?([^,]+),\s*([^()]+?)\s*\((\d+)(?:\/LK\s*([0-9]{1,2}[,.][0-9]))?\)$/i
  );

  if (!match) return null;

  return {
    name: `${clean(match[2])} ${clean(match[3])}`,
    seed: match[1] ? Number(match[1]) : undefined,
    lk: match[5] ? match[5].replace(".", ",") : undefined,
    club: club && isClubLine(club) ? clean(club) : undefined,
  };
}

function getPlayerEntries(lines: string[]) {
  const entries: PlayerEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const merged = normalizePlayerLine(lines[i], lines[i + 1], lines[i + 2]);
    const player = parsePlayerLine(merged, lines[i + 1]);

    if (!player) continue;

    if (!entries.some((entry) => entry.player.name === player.name)) {
      entries.push({
        player,
        lineIndex: i,
      });
    }
  }

  return entries;
}

function getScheduleTimes(lines: string[]) {
  const fullText = lines.join(" ");
  const useTestMapping = fullText.includes("07.07.2021 bis 18.07.2021");
  const times: string[] = [];

  const matches = [...fullText.matchAll(/(\d{2}\.\d{2}\.)\s+(\d{2}:\d{2})/g)];

  matches.forEach((match) => {
    times.push(`${mapTestDate(match[1], useTestMapping)} ${match[2]}`);
  });

  return times;
}

function getRoundNamesFromPdf(lines: string[]): DrawRoundName[] {
  const fullText = lines.join(" ");

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

  const found = possibleRounds.filter((roundName) => fullText.includes(roundName));

  if (found.includes("Achtelfinale") && found.includes("Viertelfinale")) {
    return found;
  }

  return [];
}

function nextPowerOfTwo(value: number) {
  let size = 2;

  while (size < value) {
    size *= 2;
  }

  return size;
}

function getFallbackRoundNames(fieldSize: number): DrawRoundName[] {
  if (fieldSize <= 4) return ["Halbfinale", "Finale", "Sieger"];
  if (fieldSize <= 8) return ["Viertelfinale", "Halbfinale", "Finale", "Sieger"];

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
  if (roundName === "Halbfinale") return `Sieger Halbfinale ${index}`;
  if (roundName === "Viertelfinale") return `Sieger Viertelfinale ${index}`;
  if (roundName === "Achtelfinale") return `Sieger Achtelfinale ${index}`;
  if (roundName === "Runde 2") return `Sieger Runde 2 ${index}`;
  if (roundName === "Runde 1") return `Sieger Runde 1 ${index}`;

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

function createEmptyPlayer(name: string): DrawPlayer {
  return { name };
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
  const roundNames =
    pdfRoundNames.length > 0 ? pdfRoundNames : getFallbackRoundNames(fieldSize);

  const baseId = `${slug(competition)}-${bracket}`;
  const rounds: DrawRound[] = [];

  let previousRoundMatchCount = 0;
  let scheduleIndex = 0;

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
            playerA: createEmptyPlayer("Turniersieger"),
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

    const remainingNormalRounds = roundNames
      .slice(roundIndex)
      .filter((name) => name !== "Sieger" && name !== "Spiel um Platz 3").length;

    let matchCount = Math.pow(2, remainingNormalRounds - 1);

    if (roundIndex > 0 && previousRoundMatchCount > 0) {
      matchCount = Math.max(1, Math.ceil(previousRoundMatchCount / 2));
    }

    if (roundName === "Finale") {
      matchCount = 1;
    }

    if (roundName === "Spiel um Platz 3") {
      matchCount = 1;
    }

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
      const nr = getMatchNr(roundIndex + 1, matchIndex + 1);
      const id = `${baseId}-nr${nr}`;
      const nextRoundName = roundNames[roundIndex + 1];
      const nextMatchIndex = Math.floor(matchIndex / 2) + 1;

      let nextMatchId = `${baseId}-nr${getMatchNr(roundIndex + 2, nextMatchIndex)}`;

      if (nextRoundName === "Sieger") {
        nextMatchId = `${baseId}-winner`;
      }

      const playerA =
        roundIndex === 0
          ? players[matchIndex * 2] || createEmptyPlayer("offen")
          : createEmptyPlayer(placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 1));

      const playerB =
        roundIndex === 0
          ? players[matchIndex * 2 + 1] || createEmptyPlayer("offen")
          : createEmptyPlayer(placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 2));

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

    previousRoundMatchCount = matchCount;
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

  const rounds = createRounds(
    competition,
    competitionCode,
    bracket,
    players,
    scheduleTimes,
    pdfRoundNames
  );

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