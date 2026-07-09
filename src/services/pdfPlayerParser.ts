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

function getCompetitionFromText(text: string) {
  const match = text.match(/Bewerb:\s*(.+?)\s+Zulassungsliste/i);

  if (!match) return "Unbekannt";

  return normalizeCompetition(match[1]);
}

function normalizeName(lastName: string, firstName: string) {
  return `${clean(lastName)} ${clean(firstName)}`;
}

function cleanClub(value: string) {
  return clean(
    value
      .replace(/\s+\d+\s*-\s*$/g, "")
      .replace(/\s+\d+(?:\s*-\s*\d+)*\s*-?\s*$/g, "")
      .replace(/\s+Nachrücker.*$/i, "")
      .replace(/\s+nu\s+\.Dokument.*$/i, "")
  );
}

function parsePlayersFromPageText(pageText: string, competition: string): Player[] {
  const players: Player[] = [];

  const playerRegex =
    /(?:^|\s)\d+\s+(?:\d+\s+)?([\p{L}][\p{L}\-'. ]+?),\s*([\p{L}][\p{L}\-'. ]+?)\s+((?:19|20)\d{2})\s+LK\s*([0-9]{1,2}[,.][0-9])\s+LK\s*[0-9]{1,2}[,.][0-9]\s+(?:[A-Z]\d{2}\/\d+|-)\s+(\d{8})\s+(.+?)(?=\s+\d+\s+(?:\d+\s+)?[\p{L}][\p{L}\-'. ]+?,\s*[\p{L}]|\s+Nachrücker|\s+nu\s+\.Dokument|$)/gu;

  const matches = [...pageText.matchAll(playerRegex)];

  matches.forEach((match) => {
    const lastName = match[1];
    const firstName = match[2];
    const year = match[3];
    const lk = match[4];
    const club = match[6];

    players.push({
      name: normalizeName(lastName, firstName),
      year,
      lk: lk.replace(".", ","),
      club: cleanClub(club),
      competition,
    });
  });

  return players;
}

export async function parsePlayersFromPdf(file: File): Promise<PdfImportResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let debugText = "";
  const players: Player[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => ("str" in item ? clean(item.str) : ""))
      .filter(Boolean)
      .join(" ");

    const competition = getCompetitionFromText(pageText);
    const pagePlayers = parsePlayersFromPageText(pageText, competition);

    debugText += `\n\n--- SEITE ${pageNumber} ---\n${pageText}`;
    debugText += `\n\n--- GEFUNDENE SPIELER SEITE ${pageNumber} ---\n${pagePlayers
      .map((player) => `${player.name} | ${player.year} | ${player.lk} | ${player.club} | ${player.competition}`)
      .join("\n")}`;

    pagePlayers.forEach((player) => {
      const exists = players.some(
        (existing) =>
          existing.name === player.name &&
          existing.competition === player.competition
      );

      if (!exists) {
        players.push(player);
      }
    });
  }

  console.log(
    "Importierte Spieler:",
    players.map((player) => player.name)
  );

  return {
    players,
    debugText,
    pages: pdf.numPages,
  };
}