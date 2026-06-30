export type Tab = "start" | "courts" | "plan" | "teilnehmer" | "gastro" | "import";

export type MatchStatus = "live" | "planned" | "done";

export interface Match {
  time: string;
  court: number;
  competition: string;
  a: string;
  b: string;
  status: MatchStatus;
  since: string;
  result: string;
}

export interface Player {
  name: string;
  club: string;
  lk: string;
  year: string;
  competition: string;
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  category: string;
}