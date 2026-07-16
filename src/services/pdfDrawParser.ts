import * as pdfjsLib from "pdfjs-dist";
import type {
  Draw,
  DrawMatch,
  DrawPlayer,
  DrawRound,
  DrawRoundName,
} from "../models/Draw";
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

type RawTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
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

function addExtra<T>(value: T, extra: Record<string, unknown>): T {
  return {
    ...(value as Record<string, unknown>),
    ...extra,
  } as T;
}

function createEmptyPlayer(name: string): DrawPlayer {
  return { name };
}

function getMatchNr(roundIndex: number, matchIndex: number) {
  return String(roundIndex * 100 + matchIndex);
}

function nextPowerOfTwo(value: number) {
  let result = 2;

  while (result < value) {
    result *= 2;
  }

  return result;
}

function getCompetition(items: PositionedText[]) {
  const fullText = items.map((item) => item.text).join(" ");

  const match = fullText.match(
    /Bewerb:\s*(.+?)(?:\s+Hauptfeld|\s+Nebenrunde|$)/i
  );

  if (!match) {
    return "Unbekannte Konkurrenz";
  }

  return clean(match[1].replace(/^Nebenrunde\s+/i, ""));
}

function getBracket(items: PositionedText[]) {
  const fullText = items
    .map((item) => item.text)
    .join(" ")
    .toLowerCase();

  return fullText.includes("nebenrunde") ? "nebenrunde" : "hauptfeld";
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

function isRoundHeader(text: string): text is DrawRoundName {
  return ROUND_NAMES.includes(text as DrawRoundName);
}

function getRoundHeaders(items: PositionedText[]) {
  const headers: PositionedText[] = [];

  items.forEach((item) => {
    ROUND_NAMES.forEach((roundName) => {
      if (item.text === roundName) {
        headers.push(item);
      }
    });
  });

  const unique = new Map<string, PositionedText>();

  headers.forEach((header) => {
    const existing = unique.get(header.text);

    if (!existing || header.x < existing.x) {
      unique.set(header.text, header);
    }
  });

  return Array.from(unique.values()).sort((a, b) => a.x - b.x);
}

function parseFullPlayer(text: string): DrawPlayer | null {
  const value = clean(text);

  const match = value.match(
    /^(?:(\d+)\s+)?([^,]+),\s*([^()]+?)\s*\((\d+)(?:\/(?:LK\s*)?([0-9]{1,2}[,.][0-9]|\d+))?\)$/i
  );

  if (!match) {
    return null;
  }

  const rankingOrLk = match[5];

  return {
    name: `${clean(match[2])} ${clean(match[3])}`,
    seed: match[1] ? Number(match[1]) : undefined,
    lk:
      rankingOrLk && /[,.]/.test(rankingOrLk)
        ? rankingOrLk.replace(".", ",")
        : undefined,
  };
}

function mergeTextItems(rawItems: RawTextItem[]): PositionedText[] {
  const yTolerance = 2.2;
  const segmentGap = 18;

  const rows: RawTextItem[][] = [];

  const sorted = [...rawItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) > yTolerance) {
      return b.y - a.y;
    }

    return a.x - b.x;
  });

  for (const item of sorted) {
    let row = rows.find(
      (candidate) =>
        candidate.length > 0 &&
        Math.abs(candidate[0].y - item.y) <= yTolerance
    );

    if (!row) {
      row = [];
      rows.push(row);
    }

    row.push(item);
  }

  const merged: PositionedText[] = [];

  for (const row of rows) {
    const rowItems = [...row].sort((a, b) => a.x - b.x);
    let segment: RawTextItem[] = [];

    function flushSegment() {
      if (segment.length === 0) return;

      const first = segment[0];
      const text = clean(segment.map((item) => item.text).join(" "));

      if (text) {
        merged.push({
          text,
          x: first.x,
          y: first.y,
        });
      }

      segment = [];
    }

    for (const item of rowItems) {
      if (segment.length === 0) {
        segment.push(item);
        continue;
      }

      const previous = segment[segment.length - 1];
      const previousEnd = previous.x + previous.width;
      const gap = item.x - previousEnd;

      if (gap > segmentGap) {
        flushSegment();
      }

      segment.push(item);
    }

    flushSegment();
  }

  return merged.sort((a, b) => {
    if (Math.abs(a.y - b.y) > yTolerance) {
      return b.y - a.y;
    }

    return a.x - b.x;
  });
}

function getFirstRoundSlots(
  items: PositionedText[],
  firstColumnMaxX: number,
  headerY: number
): Slot[] {
  const candidates = items
    .filter(
      (item) =>
        item.y < headerY - 5 &&
        item.x < firstColumnMaxX &&
        (parseFullPlayer(item.text) !== null || item.text === "[Rast]")
    )
    .sort((a, b) => b.y - a.y);

  return candidates.map((item) => ({
    player: item.text === "[Rast]" ? null : parseFullPlayer(item.text),
    y: item.y,
  }));
}

function padSlots(slots: Slot[]) {
  const fieldSize = nextPowerOfTwo(slots.length);

  while (slots.length < fieldSize) {
    slots.push({
      player: null,
      y: slots.length > 0 ? slots[slots.length - 1].y - 20 : 0,
    });
  }

  return slots;
}

function getRoundNames(
  fieldSize: number,
  headers: PositionedText[]
): DrawRoundName[] {
  const found = headers
    .map((header) => header.text as DrawRoundName)
    .filter((name) => name !== "Sieger");

  if (found.length > 0) {
    return found;
  }

  if (fieldSize <= 4) {
    return ["Halbfinale", "Finale"];
  }

  if (fieldSize <= 8) {
    return ["Viertelfinale", "Halbfinale", "Finale"];
  }

  if (fieldSize <= 16) {
    return ["Achtelfinale", "Viertelfinale", "Halbfinale", "Finale"];
  }

  return [
    "Runde 1",
    "Achtelfinale",
    "Viertelfinale",
    "Halbfinale",
    "Finale",
  ];
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

    // In nuLiga steht die Zeit optisch in der Spalte rechts vom Match.
    const roundIndex = Math.max(0, nearestHeaderIndex - 1);

    if (roundIndex >= roundNames.length) {
      continue;
    }

    const current = result.get(roundIndex) || [];
    current.push(item);
    result.set(roundIndex, current);
  }

  result.forEach((times) => {
    times.sort((a, b) => b.y - a.y);
  });

  return result;
}

function placeholder(previousRound: DrawRoundName, index: number) {
  if (previousRound === "Halbfinale") {
    return `Sieger Halbfinale ${index}`;
  }

  if (previousRound === "Viertelfinale") {
    return `Sieger Viertelfinale ${index}`;
  }

  if (previousRound === "Achtelfinale") {
    return `Sieger Achtelfinale ${index}`;
  }

  if (previousRound === "Runde 2") {
    return `Sieger Runde 2 ${index}`;
  }

  if (previousRound === "Runde 1") {
    return `Sieger Runde 1 ${index}`;
  }

  return `Sieger Match ${index}`;
}

function resolveAutoAdvance(match: DrawMatch) {
  const playerA = match.playerA?.name || "offen";
  const playerB = match.playerB?.name || "offen";

  if (playerA !== "offen" && playerB === "offen") {
    return match.playerA;
  }

  if (playerA === "offen" && playerB !== "offen") {
    return match.playerB;
  }

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
    const matchCount = Math.max(
      1,
      fieldSize / Math.pow(2, roundIndex + 1)
    );

    const times = timesByRound.get(roundIndex) || [];
    const matches: DrawMatch[] = [];

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
      const nr = getMatchNr(roundIndex + 1, matchIndex + 1);
      const id = `${baseId}-nr${nr}`;

      let playerA: DrawPlayer;
      let playerB: DrawPlayer;

      if (roundIndex === 0) {
        playerA =
          slots[matchIndex * 2]?.player || createEmptyPlayer("offen");
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
          : `${baseId}-nr${getMatchNr(
              roundIndex + 2,
              nextMatchIndex
            )}`;

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
          {
            nr,
            competitionCode,
          }
        )
      );
    }

    rounds.push({
      name: roundName,
      roundIndex: roundIndex + 1,
      matches,
    });

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
  pdf: any,
  pageNumber: number
): Promise<PositionedText[]> {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();

  const rawItems: RawTextItem[] = textContent.items
    .map((item: any) => {
      if (
        !("str" in item) ||
        !("transform" in item) ||
        !("width" in item)
      ) {
        return null;
      }

      return {
        text: clean(item.str),
        x: item.transform[4],
        y: item.transform[5],
        width: Number(item.width) || 0,
      };
    })
    .filter(
      (item: RawTextItem | null): item is RawTextItem =>
        Boolean(item?.text)
    );

  const mergedItems = mergeTextItems(rawItems);

  const rawPositionedItems: PositionedText[] = rawItems.map((item) => ({
    text: item.text,
    x: item.x,
    y: item.y,
  }));

  const combined = [...mergedItems, ...rawPositionedItems];
  const seen = new Set<string>();

  return combined.filter((item) => {
    const key = `${item.text}|${item.x.toFixed(2)}|${item.y.toFixed(2)}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePage(items: PositionedText[]) {
  const competition = getCompetition(items);
  const bracket = getBracket(items);
  const competitionCode = getCompetitionCode(competition, bracket);
  const headers = getRoundHeaders(items);

  if (headers.length < 2) {
    const pageText = items.map((item) => item.text).join(" ");

    if (pageText.includes("Gruppen") || pageText.includes("Endrunde")) {
      throw new Error(
        `${competition}: Gruppenfeld wird separat verarbeitet.`
      );
    }

    throw new Error(
      `${competition}: Rundenspalten konnten nicht erkannt werden.`
    );
  }

  const headerY = Math.max(...headers.map((header) => header.y));
  const firstColumnMaxX = (headers[0].x + headers[1].x) / 2;

  const rawSlots = getFirstRoundSlots(
    items,
    firstColumnMaxX,
    headerY
  );

  if (rawSlots.length < 2) {
    throw new Error(
      `${competition}: Spielerpositionen konnten nicht erkannt werden.`
    );
  }

  const slots = padSlots(rawSlots);
  const roundNames = getRoundNames(slots.length, headers);
  const timesByRound = getTimesByRound(
    items,
    headers,
    roundNames,
    headerY
  );

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
    title: `${competition} ${
      bracket === "nebenrunde" ? "Nebenrunde" : "Hauptfeld"
    }`,
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
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const draws: Draw[] = [];
  const matches: Match[] = [];
  let debugText = "";
  let playerCount = 0;

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
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
    throw new Error(
      "Keine Auslosung konnte aus der PDF gelesen werden."
    );
  }

  return {
    draw: draws[0],
    draws,
    matches,
    debugText,
    playerCount,
  };
}