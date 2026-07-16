import * as pdfjsLib from "pdfjs-dist";
import type { Draw, DrawMatch, DrawPlayer, DrawRound, DrawRoundName } from "../models/Draw";
import type { Match } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.mjs";

export type PdfDrawImportResult = {
  draw: Draw;
  draws: Draw[];
  matches: Match[];
  debugText: string;
  playerCount: number;
};

type PositionedText = {
  text: string;
  x: number;
  y: number;
};

type Slot = {
  player: DrawPlayer | null;
  y: number;
};

const ROUND_NAMES: DrawRoundName[] = [
  "Runde 1",
  "Runde 2",
  "Achtelfinale",
  "Viertelfinale",
  "Halbfinale",
  "Finale",
  "Sieger",
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

function getCompetition(items: PositionedText[]) {
  const fullText = items.map((item) => item.text).join(" ");
  const match = fullText.match(
    /Bewerb:\s*(.+?)(?:\s+Hauptfeld|\s+Nebenrunde|$)/i
  );

  if (!match) return "Unbekannte Konkurrenz";

  return clean(match[1].replace(/^Nebenrunde\s+/i, ""));
}

function getBracket(items: PositionedText[]) {
  const text = items.map((item) => item.text).join(" ").toLowerCase();
  return text.includes("nebenrunde") ? "nebenrunde" : "hauptfeld";
}

function getCompetitionCode(
  competition: string,
  bracket: "hauptfeld" | "nebenrunde"
) {
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

function parseFullPlayer(text: string): DrawPlayer | null {
  const value = clean(text);
  const match = value.match(
    /^(?:(\d+)\s+)?([^,]+),\s*([^()]+?)\s*\((\d+)(?:\/(?:LK\s*)?([0-9]{1,2}[,.][0-9]|\d+))?\)$/i
  );

  if (!match) return null;

  return {
    name: `${clean(match[2])} ${clean(match[3])}`,
    seed: match[1] ? Number(match[1]) : undefined,
    lk:
      match[5] && match[5].includes(",")
        ? match[5].replace(".", ",")
        : undefined,
  };
}

function createEmptyPlayer(name: string): DrawPlayer {
  return { name };
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

function isRoundHeader(text: string): text is DrawRoundName {
  return ROUND_NAMES.includes(text as DrawRoundName);
}

function getRoundHeaders(items: PositionedText[]) {
  return items
    .filter((item) => isRoundHeader(item.text))
    .sort((a, b) => a.x - b.x);
}

function getFirstRoundSlots(
  items: PositionedText[],
  firstColumnMaxX: number,
  headerY: number
): Slot[] {
  return items
    .filter(
      (item) =>
        item.y < headerY - 5 &&
        item.x < firstColumnMaxX &&
        (parseFullPlayer(item.text) !== null || item.text === "[Rast]")
    )
    .sort((a, b) => b.y - a.y)
    .map((item) => ({
      player: item.text === "[Rast]" ? null : parseFullPlayer(item.text),
      y: item.y,
    }));
}

function nextPowerOfTwo(value: number) {
  let result = 2;
  while (result < value) result *= 2;
  return result;
}

function padSlots(slots: Slot[]) {
  const fieldSize = nextPowerOfTwo(slots.length);
  while (slots.length < fieldSize) {
    slots.push({ player: null, y: slots.at(-1)?.y ?? 0 });
  }
  return slots;
}

function getRoundNames(fieldSize: number, headers: PositionedText[]) {
  const names = headers
    .map((header) => header.text as DrawRoundName)
    .filter((name) => name !== "Sieger");

  if (names.length > 0) return names;

  if (fieldSize <= 4) return ["Halbfinale", "Finale"] as DrawRoundName[];
  if (fieldSize <= 8)
    return ["Viertelfinale", "Halbfinale", "Finale"] as DrawRoundName[];
  if (fieldSize <= 16)
    return [
      "Achtelfinale",
      "Viertelfinale",
      "Halbfinale",
      "Finale",
    ] as DrawRoundName[];

  return [
    "Runde 1",
    "Achtelfinale",
    "Viertelfinale",
    "Halbfinale",
    "Finale",
  ] as DrawRoundName[];
}

function getTimesByRound(
  items: PositionedText[],
  headers: PositionedText[],
  roundNames: DrawRoundName[],
  headerY: number
) {
  const result = new Map<number, PositionedText[]>();
  const timeItems = items.filter(
    (item) =>
      item.y < headerY - 5 &&
      /^\d{2}\.\d{2}\.\s+\d{2}:\d{2}$/.test(item.text)
  );

  for (const item of timeItems) {
    let nearestHeaderIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    headers.forEach((header, index) => {
      const distance = Math.abs(item.x - header.x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestHeaderIndex = index;
      }
    });

    const roundIndex = Math.max(0, nearestHeaderIndex - 1);
    if (roundIndex >= roundNames.length) continue;

    const current = result.get(roundIndex) || [];
    current.push(item);
    result.set(roundIndex, current);
  }

  result.forEach((times) => times.sort((a, b) => b.y - a.y));
  return result;
}

function placeholder(previousRound: DrawRoundName, index: number) {
  if (previousRound === "Halbfinale") return `Sieger Halbfinale ${index}`;
  if (previousRound === "Viertelfinale") return `Sieger Viertelfinale ${index}`;
  if (previousRound === "Achtelfinale") return `Sieger Achtelfinale ${index}`;
  if (previousRound === "Runde 2") return `Sieger Runde 2 ${index}`;
  if (previousRound === "Runde 1") return `Sieger Runde 1 ${index}`;
  return `Sieger Match ${index}`;
}

function resolveAutoAdvance(match: DrawMatch | undefined) {
  if (!match) return undefined;

  const a = match.playerA?.name || "offen";
  const b = match.playerB?.name || "offen";

  if (a !== "offen" && b === "offen") return match.playerA;
  if (a === "offen" && b !== "offen") return match.playerB;
  return undefined;
}

function createRounds(
  competition: string,
  competitionCode: string,
  bracket: "hauptfeld" | "nebenrunde",
  slots: Slot[],
  roundNames: DrawRoundName[],
  timesByRound: Map<number, PositionedText[]>
): DrawRound[] {
  const baseId = `${slug(competition)}-${bracket}`;
  const rounds: DrawRound[] = [];
  const fieldSize = slots.length;
  let previousMatches: DrawMatch[] = [];

  for (let roundIndex = 0; roundIndex < roundNames.length; roundIndex++) {
    const roundName = roundNames[roundIndex];
    const matchCount = Math.max(1, fieldSize / Math.pow(2, roundIndex + 1));
    const times = timesByRound.get(roundIndex) || [];
    const matches: DrawMatch[] = [];

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
      const nr = getMatchNr(roundIndex + 1, matchIndex + 1);
      const id = `${baseId}-nr${nr}`;

      let playerA: DrawPlayer;
      let playerB: DrawPlayer;

      if (roundIndex === 0) {
        playerA = slots[matchIndex * 2]?.player || createEmptyPlayer("offen");
        playerB =
          slots[matchIndex * 2 + 1]?.player || createEmptyPlayer("offen");
      } else {
        const sourceA = previousMatches[matchIndex * 2];
        const sourceB = previousMatches[matchIndex * 2 + 1];

        playerA =
          resolveAutoAdvance(sourceA) ||
          createEmptyPlayer(
            placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 1)
          );

        playerB =
          resolveAutoAdvance(sourceB) ||
          createEmptyPlayer(
            placeholder(roundNames[roundIndex - 1], matchIndex * 2 + 2)
          );
      }

      const nextMatchIndex = Math.floor(matchIndex / 2) + 1;
      const nextMatchId =
        roundIndex === roundNames.length - 1
          ? `${baseId}-winner`
          : `${baseId}-nr${getMatchNr(roundIndex + 2, nextMatchIndex)}`;

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
            time: times[matchIndex]?.text || "",
            nextMatchId,
            nextSlot: matchIndex % 2 === 0 ? "playerA" : "playerB",
          },
          { nr, competitionCode }
        )
      );
    }

    rounds.push({ name: roundName, roundIndex: roundIndex + 1, matches });
    previousMatches = matches;
  }

  rounds.push({
    name: "Sieger",
    roundIndex: roundNames.length + 1,
    matches: [
      addExtra(
        {
          id: `${baseId}-winner`,
          competition,
          bracket,
          round: "Sieger",
          roundIndex: roundNames.length + 1,
          matchIndex: 1,
          playerA: createEmptyPlayer("Turniersieger"),
          status: "planned",
        },
        {
          nr: getMatchNr(roundNames.length + 1, 1),
          competitionCode,
        }
      ),
    ],
  });

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
          competitionCode: (
            match as unknown as { competitionCode?: string }
          ).competitionCode,
        }
      )
    );
}

async function getPageItems(
  pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>>["promise"],
  pageNumber: number
): Promise<PositionedText[]> {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();

  return textContent.items
    .map((item) => {
      if (!("str" in item) || !("transform" in item)) return null;

      return {
        text: clean(item.str),
        x: item.transform[4],
        y: item.transform[5],
      };
    })
    .filter((item): item is PositionedText => Boolean(item?.text));
}

function parsePage(items: PositionedText[]) {
  const competition = getCompetition(items);
  const bracket = getBracket(items);
  const competitionCode = getCompetitionCode(competition, bracket);
  const headers = getRoundHeaders(items);

  if (headers.length < 2) {
    throw new Error(`${competition}: Rundenspalten konnten nicht erkannt werden.`);
  }

  const headerY = Math.max(...headers.map((header) => header.y));
  const firstColumnMaxX = (headers[0].x + headers[1].x) / 2;
  const slots = padSlots(getFirstRoundSlots(items, firstColumnMaxX, headerY));

  if (slots.length < 2) {
    throw new Error(`${competition}: Spielerpositionen konnten nicht erkannt werden.`);
  }

  const roundNames = getRoundNames(slots.length, headers);
  const timesByRound = getTimesByRound(items, headers, roundNames, headerY);
  const rounds = createRounds(
    competition,
    competitionCode,
    bracket,
    slots,
    roundNames,
    timesByRound
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
    playerCount: slots.filter((slot) => slot.player !== null).length,
  };
}

export async function parseDrawFromPdf(
  file: File
): Promise<PdfDrawImportResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const draws: Draw[] = [];
  const matches: Match[] = [];
  let debugText = "";
  let playerCount = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const items = await getPageItems(pdf, pageNumber);

    debugText += `\n\n--- SEITE ${pageNumber} ---\n`;
    debugText += items
      .map(
        (item) =>
          `${item.text} | x=${item.x.toFixed(1)} | y=${item.y.toFixed(1)}`
      )
      .join("\n");

    try {
      const result = parsePage(items);
      draws.push(result.draw);
      matches.push(...createMatchesFromDraw(result.draw));
      playerCount += result.playerCount;
    } catch (error) {
      console.warn(`Seite ${pageNumber} wurde übersprungen`, error);
    }
  }

  if (draws.length === 0) {
    throw new Error("Keine Auslosung konnte aus der PDF gelesen werden.");
  }

  return {
    draw: draws[0],
    draws,
    matches,
    debugText,
    playerCount,
  };
}