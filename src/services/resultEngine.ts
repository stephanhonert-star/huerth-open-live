export type SetScore = {
  a: number;
  b: number;
};

export type MatchResult = {
  sets: SetScore[];
  winner: "A" | "B" | null;
  scoreText: string;
};

function isPlayed(set: SetScore) {
  return set.a > 0 || set.b > 0;
}

function getSetWinner(set: SetScore, index: number): "A" | "B" | null {
  const { a, b } = set;

  if (!isPlayed(set)) return null;

  // Satz 1 + 2: normale Tennissätze
  if (index < 2) {
    if (a === 6 && b <= 4) return "A";
    if (b === 6 && a <= 4) return "B";

    if (a === 7 && (b === 5 || b === 6)) return "A";
    if (b === 7 && (a === 5 || a === 6)) return "B";

    return null;
  }

  // 3. Satz / Match-Tiebreak
  if (a >= 10 && a - b >= 2) return "A";
  if (b >= 10 && b - a >= 2) return "B";

  return null;
}

export function calculateWinner(sets: SetScore[]): MatchResult {
  let setsA = 0;
  let setsB = 0;

  sets.forEach((set, index) => {
    const winner = getSetWinner(set, index);

    if (winner === "A") setsA++;
    if (winner === "B") setsB++;
  });

  const scoreText = sets
    .filter(isPlayed)
    .map((set) => `${set.a}:${set.b}`)
    .join(" ");

  return {
    sets,
    scoreText,
    winner: setsA >= 2 ? "A" : setsB >= 2 ? "B" : null,
  };
}