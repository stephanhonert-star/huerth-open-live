export type DrawBracketType = "hauptfeld" | "nebenrunde";

export type DrawRoundName =
  | "Runde 1"
  | "Runde 2"
  | "Achtelfinale"
  | "Viertelfinale"
  | "Halbfinale"
  | "Spiel um Platz 3"
  | "Finale"
  | "Sieger";

export type DrawPlayer = {
  name: string;
  seed?: number;
  club?: string;
  lk?: string;
};

export type DrawMatchStatus =
  | "planned"
  | "live"
  | "done";

export type NextSlot =
  | "playerA"
  | "playerB";

export type DrawMatch = {
  id: string;

  competition: string;

  bracket: DrawBracketType;

  round: DrawRoundName;

  roundIndex: number;

  matchIndex: number;

  playerA?: DrawPlayer;

  playerB?: DrawPlayer;

  result?: string;

  winner?: string;

  status: DrawMatchStatus;

  court?: number;

  time?: string;

  nextMatchId?: string;

  nextSlot?: NextSlot;
};

export type DrawRound = {
  name: DrawRoundName;

  roundIndex: number;

  matches: DrawMatch[];
};

export type Draw = {
  id: string;

  competition: string;

  bracket: DrawBracketType;

  title: string;

  rounds: DrawRound[];
};