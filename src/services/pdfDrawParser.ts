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

type ImportedResult = {
  result: string;
  winnerName: string;
  winnerLineIndex?: number;
  scoreLineIndex?: number;
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

function isScoreLine(line: string) {
  return (
    /^(\d{1,2}:\d{1,2})(\s+\d{1,2}:\d{1,2}){0,2}(\s+Aufg\.)?$/i.test(line) ||
    /^n\.a\.$/i.test(line)
  );
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

function shortName(name: string) {
  const parts = name.split(" ");
  const last = parts[0];
  const first = parts.slice(1).join(" ");

  return `${last},${first.charAt(0)}.`;
}

function findWinnerName(candidate: string, playerA?: DrawPlayer, playerB?: DrawPlayer) {
  if (!playerA || !playerB) return "";

  const cleaned = clean(candidate);

  if (cleaned === shortName(playerA.name)) return playerA.name;
  if (cleaned === shortName(playerB.name)) return playerB.name;

  return "";
}

function getLoserName(match: DrawMatch, winnerName: string) {
  if (match.playerA?.name === winnerName) return match.playerB?.name || "";
  if (match.playerB?.name === winnerName) return match.playerA?.name || "";

  return "";
}

function extractFirstRoundResults(lines: string[], entries: PlayerEntry[]) {
  const results = new Map<number, ImportedResult>();

  for (let index = 0; index < entries.length; index += 2) {
    const playerA = entries[index]?.player;
    const playerB = entries[index + 1]?.player;
    const start = entries[index]?.lineIndex ?? 0;
    const end = entries[index + 1]?.lineIndex ?? start + 1;

    if (!playerA || !playerB) continue;

    const between = lines.slice(start + 1, end);
    const afterB = lines.slice(end + 1, end + 8);

    const winnerOffset = between.findIndex((line) => findWinnerName(line, playerA, playerB));
    const scoreOffset = afterB.findIndex(isScoreLine);

    if (winnerOffset === -1 || scoreOffset === -1) continue;

    const winnerLine = between[winnerOffset];
    const scoreLine = afterB[scoreOffset];
    const winnerName = findWinnerName(winnerLine, playerA, playerB);

    if (winnerName) {
      results.set(index / 2, {
        result: clean(scoreLine),
        winnerName,
        winnerLineIndex: start + 1 + winnerOffset,
        scoreLineIndex: end + 1 + scoreOffset,
      });
    }
  }

  return results;
}

function nextPowerOfTwo(value: number) {
  let size = 2;
  while (size < value) size *= 2;
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

function findMatch(rounds: DrawRound[], id?: string) {
  if (!id) return undefined;

  for (const round of rounds) {
    const match = round.matches.find((item) => item.id === id);
    if (match) return match;
  }

  return undefined;
}

function findPlace3Match(rounds: DrawRound[]) {
  return rounds
    .find((round) => round.name === "Spiel um Platz 3")
    ?.matches[0];
}

function findResultForMatch(
  lines: string[],
  match: DrawMatch,
  usedLineIndexes: Set<number>
): ImportedResult | null {
  if (!match.playerA || !match.playerB) return null;

  for (let i = 0; i < lines.length; i++) {
    if (usedLineIndexes.has(i)) continue;

    const winnerName = findWinnerName(lines[i], match.playerA, match.playerB);
    if (!winnerName) continue;

    for (let j = i + 1; j <= i + 8 && j < lines.length; j++) {
      if (usedLineIndexes.has(j)) continue;

      if (isScoreLine(lines[j])) {
        return {
          winnerName,
          result: clean(lines[j]),
          winnerLineIndex: i,
          scoreLineIndex: j,
        };
      }
    }
  }

  return null;
}

function applyResultToMatch(rounds: DrawRound[], match: DrawMatch, imported: ImportedResult) {
  match.status = "done";
  match.result = imported.result;
  match.winner = imported.winnerName;

  const nextMatch = findMatch(rounds, match.nextMatchId);

  if (nextMatch && match.nextSlot === "playerA") {
    nextMatch.playerA = { name: imported.winnerName };
  }

  if (nextMatch && match.nextSlot === "playerB") {
    nextMatch.playerB = { name: imported.winnerName };
  }

  if (match.round === "Halbfinale") {
    const place3Match = findPlace3Match(rounds);
    const loserName = getLoserName(match, imported.winnerName);

    if (place3Match && loserName) {
      if (match.matchIndex === 1) {
        place3Match.playerA = { name: loserName };
      }

      if (match.matchIndex === 2) {
        place3Match.playerB = { name: loserName };
      }
    }
  }
}

function applyImportedResults(
  lines: string[],
  rounds: DrawRound[],
  firstRoundResults: Map<number, ImportedResult>
) {
  const usedLineIndexes = new Set<number>();
  const firstRound = rounds[0];

  firstRound.matches.forEach((match, index) => {
    const imported = firstRoundResults.get(index);
    if (!imported) return;

    applyResultToMatch(rounds, match, imported);

    if (typeof imported.winnerLineIndex === "number") usedLineIndexes.add(imported.winnerLineIndex);
    if (typeof imported.scoreLineIndex === "number") usedLineIndexes.add(imported.scoreLineIndex);
  });

  let changed = true;

  while (changed) {
    changed = false;

    for (const round of rounds) {
      if (round.name === "Sieger") continue;

      for (const match of round.matches) {
        if (match.status === "done") continue;
        if (!match.playerA || !match.playerB) continue;
        if (match.playerA.name.includes("Sieger")) continue;
        if (match.playerB.name.includes("Sieger")) continue;
        if (match.playerA.name.includes("Finalist")) continue;
        if (match.playerB.name.includes("Finalist")) continue;
        if (match.playerA.name.includes("Verlierer")) continue;
        if (match.playerB.name.includes("Verlierer")) continue;

        const imported = findResultForMatch(lines, match, usedLineIndexes);
        if (!imported) continue;

        applyResultToMatch(rounds, match, imported);

        if (typeof imported.winnerLineIndex === "number") usedLineIndexes.add(imported.winnerLineIndex);
        if (typeof imported.scoreLineIndex === "number") usedLineIndexes.add(imported.scoreLineIndex);

        changed = true;
      }
    }
  }
}

function createRounds(
  competition: string,
  players: DrawPlayer[],
  firstRoundResults: Map<number, ImportedResult>,
  lines: string[]
): DrawRound[] {
  const fieldSize = nextPowerOfTwo(players.length);
  const byes = fieldSize - players.length;
  const roundNames = getRoundNames(fieldSize);
  const baseId = slug(competition);

  const rounds: DrawRound[] = [];

  let currentMatchCount = fieldSize / 2;
  let firstRoundPlayerCount = players.length;

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
        time: "",
      });

      rounds.push({ name: roundName, roundIndex: roundIndex + 1, matches });
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

      rounds.push({ name: roundName, roundIndex: roundIndex + 1, matches });
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
        court: (matchIndex % 5) + 1,
        time: "",
        nextMatchId,
        nextSlot: matchIndex % 2 === 0 ? "playerA" : "playerB",
      });
    }

    rounds.push({ name: roundName, roundIndex: roundIndex + 1, matches });

    currentMatchCount = currentMatchCount / 2;

    if (roundIndex === 0 && byes > 0 && fieldSize === 32) {
      currentMatchCount = fieldSize / 4;
    }
  }

  applyImportedResults(lines, rounds, firstRoundResults);

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
      status: match.status,
      since: "",
      result: match.result || "",
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
  const firstRoundResults = extractFirstRoundResults(allLines, entries);
  const rounds = createRounds(competition, players, firstRoundResults, allLines);

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