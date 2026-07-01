import { draws as defaultDraws } from "../data/draws";
import type { Draw, DrawMatch } from "../models/Draw";

export const DRAW_STORAGE_KEY = "huerthOpenDraws";

export function loadDraws(): Draw[] {
  const saved = localStorage.getItem(DRAW_STORAGE_KEY);

  if (!saved) return defaultDraws;

  try {
    return JSON.parse(saved) as Draw[];
  } catch {
    return defaultDraws;
  }
}

export function saveDraws(draws: Draw[]) {
  localStorage.setItem(DRAW_STORAGE_KEY, JSON.stringify(draws));
  window.dispatchEvent(new Event("huerthOpenDrawsUpdated"));
}

function findMatch(draws: Draw[], matchId: string): DrawMatch | undefined {
  for (const draw of draws) {
    for (const round of draw.rounds) {
      const match = round.matches.find((item) => item.id === matchId);
      if (match) return match;
    }
  }

  return undefined;
}

export function updateDrawAfterResult(
  drawMatchId: string,
  winnerName: string,
  result: string
): Draw[] {
  const draws = loadDraws();

  const currentMatch = findMatch(draws, drawMatchId);

  if (!currentMatch) return draws;

  currentMatch.status = "done";
  currentMatch.result = result;
  currentMatch.winner = winnerName;

  if (currentMatch.nextMatchId && currentMatch.nextSlot) {
    const nextMatch = findMatch(draws, currentMatch.nextMatchId);

    if (nextMatch) {
      if (currentMatch.nextSlot === "playerA") {
        nextMatch.playerA = { name: winnerName };
      }

      if (currentMatch.nextSlot === "playerB") {
        nextMatch.playerB = { name: winnerName };
      }
    }
  }

  saveDraws(draws);
  return draws;
}

export function resetDraws() {
  localStorage.removeItem(DRAW_STORAGE_KEY);
  window.dispatchEvent(new Event("huerthOpenDrawsUpdated"));
}