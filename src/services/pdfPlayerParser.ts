import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { Player } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export type PdfImportResult = {
  players: Player[];
  debugText: string;
  pages: number;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCompetition(value: string) {
  let competition = clean(value.replace(/^Bewerb:\s*/i, ""));

  if (competition === "Damen Einzel - Damen/Damen 30 zusammen") {
    competition = "Damen Einzel";
  }

  return competition;
}

function normalizeName(lastName: string, firstName: string) {
  return `${clean(lastName)} ${clean(firstName)}`;
}

function cleanClub(value: string) {
  return clean(
    value
      .replace(/\s+\d+(?:\s*-\s*\d+)*\s*-?\s*$/g, "")
      .replace(/\s+nu\s+\.Dokument.*$/i, "")
  );
}

function parsePlayerLine(line: string, competition: string): Player | null {
  const cleaned = clean(line);

  if (!cleaned) return null;
  if (cleaned.includes("Setz.")) return null;
  if (cleaned.startsWith("nu .Dokument")) return null;
  if (/^\d+\s+-/.test(cleaned)) return null;

  const match = cleaned.match(
    /^\d+\s+(?:\d+\s+)?(.+?),\s+(.+?)\s+((?:19|20)\d{2})\s+LK\s*([0-9]{1,2}[,.][0-9])\s+.*?\b\d{8}\b\s+(.+)$/u
  );

  if (!match) return null;

  return {
    name: normalizeName(match[1], match[2]),
    year: match[3],
    lk: match[4].replace(".", ","),
    club: cleanClub(match[5]),
    competition,
  };
}

export async function parsePlayersFromPdf(file: File): Promise<PdfImportResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let debugText = "";
  const players: Player[] = [];
  let currentCompetition = "Unbekannt";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => ("str" in item ? clean(item.str) : ""))
      .filter(Boolean)
      .join(" ");

    const lines = pageText
      .replace(/(Bewerb:)/g, "\n$1")
      .replace(/(Zulassungsliste)/g, "\n$1")
      .replace(/(Hauptfeld)/g, "\n$1")
      .replace(/(Nachrücker)/g, "\n$1")
      .replace(/(Setz\.)/g, "\n$1")
      .replace(/\s+(?=\d+\s*$)/g, "\n")
      .replace(
        /\s+(?=\d+\s+(?:\d+\s+)?[\p{L}][\p{L}\-'. ]+,)/gu,
        "\n"
      )
      .replace(/\s+(?=nu\s+\.Dokument)/g, "\n")
      .split("\n")
      .map(clean)
      .filter(Boolean);

    debugText += `\n\n--- SEITE ${pageNumber} ---\n${lines.join("\n")}`;

    for (const line of lines) {
      if (line.startsWith("Bewerb:")) {
        currentCompetition = normalizeCompetition(line);
        continue;
      }

      const player = parsePlayerLine(line, currentCompetition);

      if (player) {
        const exists = players.some(
          (existing) =>
            existing.name === player.name &&
            existing.competition === player.competition
        );

        if (!exists) {
          players.push(player);
        }
      }
    }
  }

  return {
    players,
    debugText,
    pages: pdf.numPages,
  };
}