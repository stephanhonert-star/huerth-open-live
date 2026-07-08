import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.mjs";

export type PdfDrawAnalyzerMatch = {
  matchIndex: number;
  playerA: string;
  playerB: string;
  time?: string;
};

export type PdfDrawAnalyzerResult = {
  competition: string;
  rounds: string[];
  matches: PdfDrawAnalyzerMatch[];
  rawText: string;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getCompetition(lines: string[]) {
  const line = lines.find((item) => item.startsWith("Bewerb:"));

  if (!line) return "Unbekannte Konkurrenz";

  return clean(
    line
      .replace(/^Bewerb:\s*/i, "")
      .replace(/\s+Hauptfeld.*$/i, "")
      .replace(/\s+Nebenrunde.*$/i, "")
  );
}

function isRoundLine(line: string) {
  return (
    line.includes("Runde 1") ||
    line.includes("Achtelfinale") ||
    line.includes("Viertelfinale") ||
    line.includes("Halbfinale") ||
    line.includes("Finale") ||
    line.includes("Sieger")
  );
}

function getRounds(lines: string[]) {
  const roundNames = [
    "Runde 1",
    "Achtelfinale",
    "Viertelfinale",
    "Halbfinale",
    "Finale",
    "Sieger",
  ];

  const header = lines.find(isRoundLine) || "";

  return roundNames.filter((round) => header.includes(round));
}

function isPlayerLine(line: string) {
  return /.+?,.+\(\d+\/LK\s*[0-9]{1,2}[,.][0-9]\)/i.test(line);
}

function parsePlayerName(line: string) {
  const match = clean(line).match(
    /^(?:(\d+)\s+)?(.+?),\s*(.+?)\s+\((\d+)\/LK\s*([0-9]{1,2}[,.][0-9])\)/i
  );

  if (!match) return "";

  return `${clean(match[3])} ${clean(match[2])}`;
}

function isTimeLine(line: string) {
  return /^\d{2}\.\d{2}\.\s+\d{2}:\d{2}$/.test(line);
}

export async function analyzeDrawPdf(file: File): Promise<PdfDrawAnalyzerResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const lines: string[] = [];
  let rawText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageLines = textContent.items
      .map((item) => ("str" in item ? clean(item.str) : ""))
      .filter(Boolean);

    lines.push(...pageLines);
    rawText += `\n\n--- SEITE ${pageNumber} ---\n${pageLines.join("\n")}`;
  }

  const players: { name: string; time?: string }[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (!isPlayerLine(line)) continue;

    const name = parsePlayerName(line);
    if (!name) continue;

    let time: string | undefined;

    for (let lookAhead = index + 1; lookAhead <= index + 4; lookAhead++) {
      if (lines[lookAhead] && isTimeLine(lines[lookAhead])) {
        time = lines[lookAhead];
        break;
      }
    }

    players.push({ name, time });
  }

  const matches: PdfDrawAnalyzerMatch[] = [];

  for (let index = 0; index < players.length; index += 2) {
    const playerA = players[index];
    const playerB = players[index + 1];

    if (!playerA || !playerB) continue;

    matches.push({
      matchIndex: matches.length + 1,
      playerA: playerA.name,
      playerB: playerB.name,
      time: playerB.time || playerA.time,
    });
  }

  return {
    competition: getCompetition(lines),
    rounds: getRounds(lines),
    matches,
    rawText,
  };
}