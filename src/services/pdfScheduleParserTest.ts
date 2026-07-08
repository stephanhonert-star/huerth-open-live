import { parseScheduleFromPdf } from "./pdfScheduleParser";
import type { Match } from "../types";

export async function testScheduleImport(file: File, matches: Match[]) {
  const updatedMatches = await parseScheduleFromPdf(file, matches);

  console.table(
    updatedMatches.map((match) => ({
      competition: match.competition,
      court: match.court,
      time: match.time,
      a: match.a,
      b: match.b,
    }))
  );

  return updatedMatches;
}