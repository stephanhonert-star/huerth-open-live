export type SetScore = {
  a: number;
  b: number;
};

export type MatchResult = {
  sets: SetScore[];
  winner: "A" | "B" | null;
  scoreText: string;
};

export function calculateWinner(sets: SetScore[]): MatchResult {
  let setsA = 0;
  let setsB = 0;

  for (const set of sets) {
    if (set.a > set.b) {
      setsA++;
    } else if (set.b > set.a) {
      setsB++;
    }
  }

  const scoreText = sets
    .filter((set) => set.a || set.b)
    .map((set) => `${set.a}:${set.b}`)
    .join(" ");

  return {
    sets,
    scoreText,
    winner:
      setsA > setsB
        ? "A"
        : setsB > setsA
        ? "B"
        : null,
  };
}