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

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

function clearAdvancedPlayer(
  draws: Draw[],
  currentMatch: DrawMatch,
): void {
  if (!currentMatch.nextMatchId || !currentMatch.nextSlot) {
    return;
  }

  const nextMatch = findMatch(draws, currentMatch.nextMatchId);

  if (!nextMatch) {
    return;
  }

  /*
   * Falls das nachfolgende Spiel bereits beendet wurde, muss dessen
   * Fortschreibung ebenfalls zurückgenommen werden. Andernfalls könnte
   * ein Spieler noch eine weitere Runde im Baum stehen bleiben.
   */
  if (
    nextMatch.status === "done" ||
    Boolean(nextMatch.result) ||
    Boolean(nextMatch.winner)
  ) {
    clearAdvancedPlayer(draws, nextMatch);
    nextMatch.status = "planned";
    nextMatch.result = "";
    nextMatch.winner = "";
  }

  /*
   * Der Slot gehört eindeutig zum aktuellen Spiel. Deshalb wird er beim
   * Zurücksetzen immer geleert – unabhängig davon, ob winner zuvor bereits
   * im Admin-Spiel gelöscht wurde.
   */
  if (currentMatch.nextSlot === "playerA") {
    nextMatch.playerA = undefined;
  }

  if (currentMatch.nextSlot === "playerB") {
    nextMatch.playerB = undefined;
  }
}

export function updateDrawSchedule(
  drawMatchId: string | undefined,
  values: {
    court?: number;
    time?: string;
  },
): Draw[] {
  if (!drawMatchId) {
    return loadDraws();
  }

  const draws = loadDraws();
  const currentMatch = findMatch(draws, drawMatchId);

  if (!currentMatch) {
    return draws;
  }

  if (typeof values.court === "number") {
    currentMatch.court = values.court;
  }

  if (typeof values.time === "string") {
    currentMatch.time = values.time;
  }

  saveDraws(draws);
  return draws;
}

export function updateDrawAfterResult(
  drawMatchId: string,
  winnerName: string,
  result: string,
): Draw[] {
  const draws = loadDraws();
  const currentMatch = findMatch(draws, drawMatchId);

  if (!currentMatch) {
    return draws;
  }

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

export function undoDrawResult(drawMatchId: string): Draw[] {
  const draws = loadDraws();
  const currentMatch = findMatch(draws, drawMatchId);

  if (!currentMatch) {
    return draws;
  }

  clearAdvancedPlayer(draws, currentMatch);

  currentMatch.status = "planned";
  currentMatch.result = "";
  currentMatch.winner = "";

  saveDraws(draws);
  return draws;
}

export function resetDraws() {
  localStorage.removeItem(DRAW_STORAGE_KEY);
  window.dispatchEvent(new Event("huerthOpenDrawsUpdated"));
}