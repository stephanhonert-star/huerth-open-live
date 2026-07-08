import * as pdfjsLib from "pdfjs-dist";
import type { Match } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.mjs";

type TextItem = {
  text: string;
  x: number;
  y: number;
};

type CourtHeader = {
  court: number;
  x: number;
};

type TimeMarker = {
  time: string;
  y: number;
};

type MatchWithMeta = Match & {
  nr?: string;
  competitionCode?: string;
};

export type ParsedScheduleMatch = {
  nr: string;
  competitionCode: string;
  playerA: string;
  playerB: string;
  date: string;
  time: string;
  court: number;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalize(value: string) {
  return clean(value)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/^\[[0-9]+\]\s*/, "")
    .replace(/^o\s+/, "");
}

function normalizeCode(value: string) {
  return clean(value)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/^NR\s+NR\s+/, "NR ")
    .trim();
}

function codeVariants(value: string) {
  const normalized = normalizeCode(value);

  if (normalized.startsWith("NR ")) {
    return [normalized, normalized.replace(/^NR\s+/, "")];
  }

  return [normalized, `NR ${normalized}`];
}

function sameCompetitionCode(a?: string, b?: string) {
  if (!a || !b) return false;

  const aVariants = codeVariants(a);
  const bVariants = codeVariants(b);

  return aVariants.some((variant) => bVariants.includes(variant));
}

function convertShortName(value: string) {
  const cleaned = clean(value)
    .replace(/^o\s+/, "")
    .replace(/^\[[0-9]+\]\s*/, "")
    .replace(/\.$/, "");

  const parts = cleaned.split(" ");

  if (parts.length < 2) {
    return cleaned;
  }

  return `${parts.slice(1).join(" ")} ${parts[0]}`;
}

function mapTestDate(date: string) {
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

function getDateFromItems(items: TextItem[]) {
  const dateLine = items.find((item) => item.text.includes("Zeitplan -"))?.text || "";
  const match = dateLine.match(/(\d{2})\.(\d{2})\.(\d{4})/);

  if (!match) return "";

  return mapTestDate(`${match[1]}.${match[2]}.`);
}

function isTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function isMatchHeader(value: string) {
  return /^(NR|HF|AF|VF|SF|F)\s*\d+\s+/i.test(value);
}

function getCourtHeaders(items: TextItem[]) {
  const headers = items
    .map((item) => {
      const match = item.text.match(/^Platz\s+(\d+)$/i);

      if (!match) return null;

      return {
        court: Number(match[1]),
        x: item.x,
      };
    })
    .filter(Boolean) as CourtHeader[];

  return headers.sort((a, b) => a.x - b.x);
}

function getTimeMarkers(items: TextItem[]) {
  return items
    .filter((item) => isTime(item.text))
    .map((item) => ({
      time: item.text,
      y: item.y,
    }))
    .sort((a, b) => b.y - a.y);
}

function getCourtForMatch(matchHeader: TextItem, courtHeaders: CourtHeader[]) {
  if (courtHeaders.length === 0) return 1;

  let best = courtHeaders[0];
  let bestDistance = Math.abs(matchHeader.x - best.x);

  courtHeaders.forEach((courtHeader) => {
    const distance = Math.abs(matchHeader.x - courtHeader.x);

    if (distance < bestDistance) {
      best = courtHeader;
      bestDistance = distance;
    }
  });

  return best.court;
}

function getTimeForMatch(matchHeader: TextItem, timeMarkers: TimeMarker[]) {
  if (timeMarkers.length === 0) return "";

  let best = timeMarkers[0];
  let bestDistance = Math.abs(matchHeader.y - best.y);

  timeMarkers.forEach((timeMarker) => {
    const distance = Math.abs(matchHeader.y - timeMarker.y);

    if (distance < bestDistance) {
      best = timeMarker;
      bestDistance = distance;
    }
  });

  return best.time;
}

function splitName(value: string) {
  const parts = normalize(value).split(" ").filter(Boolean);

  if (parts.length === 0) {
    return {
      first: "",
      last: "",
    };
  }

  return {
    first: parts.slice(0, -1).join(" "),
    last: parts[parts.length - 1],
  };
}

function samePlayer(shortName: string, fullName: string) {
  const short = splitName(shortName);
  const full = splitName(fullName);

  if (!short.last || !full.last) return false;
  if (short.last !== full.last) return false;

  if (!short.first || !full.first) return true;

  return (
    full.first.startsWith(short.first) ||
    short.first.startsWith(full.first) ||
    full.first.slice(0, 4) === short.first.slice(0, 4)
  );
}

function sameMatchByPlayers(parsedMatch: ParsedScheduleMatch, match: Match) {
  const direct =
    samePlayer(parsedMatch.playerA, match.a) && samePlayer(parsedMatch.playerB, match.b);

  const reverse =
    samePlayer(parsedMatch.playerA, match.b) && samePlayer(parsedMatch.playerB, match.a);

  return direct || reverse;
}

function sameMatchByNumberAndCompetition(parsedMatch: ParsedScheduleMatch, match: MatchWithMeta) {
  return (
    match.nr === parsedMatch.nr &&
    sameCompetitionCode(match.competitionCode, parsedMatch.competitionCode)
  );
}

function findMatchingMatch(parsedMatch: ParsedScheduleMatch, matches: MatchWithMeta[]) {
  const byNumberAndCompetition = matches.find((match) =>
    sameMatchByNumberAndCompetition(parsedMatch, match)
  );

  if (byNumberAndCompetition) {
    return byNumberAndCompetition;
  }

  return matches.find((match) => sameMatchByPlayers(parsedMatch, match));
}

function getPlayerLinesForMatch(items: TextItem[], matchHeader: TextItem) {
  const sameBoxItems = items
    .filter((item) => {
      const xDistance = Math.abs(item.x - matchHeader.x);
      const belowHeader = item.y < matchHeader.y;
      const notTooFarBelow = matchHeader.y - item.y < 65;

      return xDistance < 75 && belowHeader && notTooFarBelow && item.text.startsWith("o ");
    })
    .sort((a, b) => b.y - a.y);

  if (sameBoxItems.length >= 2) {
    return [sameBoxItems[0], sameBoxItems[1]];
  }

  const fallbackItems = items
    .filter((item) => item.text.startsWith("o ") && item.y < matchHeader.y && matchHeader.y - item.y < 75)
    .sort((a, b) => {
      const aDistance = Math.abs(a.x - matchHeader.x) + Math.abs(a.y - matchHeader.y);
      const bDistance = Math.abs(b.x - matchHeader.x) + Math.abs(b.y - matchHeader.y);

      return aDistance - bDistance;
    });

  return fallbackItems.slice(0, 2).sort((a, b) => b.y - a.y);
}

export async function parseScheduleFromPdf(
  file: File,
  existingMatches: Match[]
): Promise<Match[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const parsedMatches: ParsedScheduleMatch[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const items = textContent.items
      .map((item) => {
        if (!("str" in item)) return null;

        const transform = "transform" in item ? item.transform : [0, 0, 0, 0, 0, 0];

        return {
          text: clean(item.str),
          x: Number(transform[4] || 0),
          y: Number(transform[5] || 0),
        };
      })
      .filter((item): item is TextItem => Boolean(item && item.text));

    const date = getDateFromItems(items);
    const courtHeaders = getCourtHeaders(items);
    const timeMarkers = getTimeMarkers(items);
    const matchHeaders = items.filter((item) => isMatchHeader(item.text));

    matchHeaders.forEach((matchHeader) => {
      const headerMatch = matchHeader.text.match(/^([A-Z]+)\s*(\d+)\s+(.+)$/i);

      if (!headerMatch) return;

      const playerLines = getPlayerLinesForMatch(items, matchHeader);

      if (playerLines.length < 2) return;

      parsedMatches.push({
        nr: headerMatch[2],
        competitionCode: headerMatch[1].toUpperCase() === "NR"
          ? `NR ${headerMatch[3]}`
          : headerMatch[3],
        playerA: convertShortName(playerLines[0].text),
        playerB: convertShortName(playerLines[1].text),
        date,
        time: getTimeForMatch(matchHeader, timeMarkers),
        court: getCourtForMatch(matchHeader, courtHeaders),
      });
    });
  }

  const updatedMatches = existingMatches.map((match) => ({ ...match })) as MatchWithMeta[];

  let updatedCount = 0;

parsedMatches.forEach((parsedMatch) => {
  const foundMatch = findMatchingMatch(parsedMatch, updatedMatches);

  if (!foundMatch) return;
  if (foundMatch.status === "done") return;

  const nextTime = `${parsedMatch.date} ${parsedMatch.time}`;
  const nextCourt = parsedMatch.court;

  if (foundMatch.time !== nextTime || foundMatch.court !== nextCourt) {
    updatedCount++;
  }

  foundMatch.time = nextTime;
  foundMatch.court = nextCourt;
});

console.log(`Spielplan aktualisiert: ${updatedCount} Spiele geändert`);


  return updatedMatches;
}