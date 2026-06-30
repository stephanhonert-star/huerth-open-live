import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { Player } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export type PdfImportResult = {
  players: Player[];
  debugText: string;
  pages: number;
};

export async function parsePlayersFromPdf(file: File): Promise<PdfImportResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let debugText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" | ");

    debugText += `\n\n--- SEITE ${pageNumber} ---\n${pageText}`;
  }

  return {
    players: [],
    debugText,
    pages: pdf.numPages,
  };
}