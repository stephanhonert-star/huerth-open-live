import type { Draw, DrawMatch } from "../models/Draw";

export function cloneDraw(draw: Draw): Draw {
  return structuredClone(draw);
}

export function findMatch(draw: Draw, matchId: string): DrawMatch | undefined {
  for (const round of draw.rounds) {
    const match = round.matches.find((m) => m.id === matchId);
    if (match) return match;
  }

  return undefined;
}

export function determineWinner(match: DrawMatch): string | null {
  if (!match.result) return null;

  let playerASets = 0;
  let playerBSets = 0;

  const sets = match.result.trim().split(/\s+/);

  for (const set of sets) {
    const [a, b] = set.split(":").map(Number);

    if (Number.isNaN(a) || Number.isNaN(b)) continue;

    if (a > b) {
      playerASets++;
    } else if (b > a) {
      playerBSets++;
    }
  }

  if (playerASets === playerBSets) {
    return null;
  }

  return playerASets > playerBSets
    ? match.playerA?.name || null
    : match.playerB?.name || null;
}

export function applyResult(
  draw: Draw,
  matchId: string,
  result: string
): Draw {

  const newDraw = cloneDraw(draw);

  const match = findMatch(newDraw, matchId);

  if (!match) {
    return newDraw;
  }

  match.result = result;

  const winner = determineWinner(match);

  if (!winner) {
    return newDraw;
  }

  match.winner = winner;

  if (!match.nextMatchId) {
    return newDraw;
  }

  const nextMatch = findMatch(newDraw, match.nextMatchId);

  if (!nextMatch) {
    return newDraw;
  }

  if (match.nextSlot === "playerA") {
    nextMatch.playerA = {
      name: winner,
    };
  } else {
    nextMatch.playerB = {
      name: winner,
    };
  }

  return newDraw;
}