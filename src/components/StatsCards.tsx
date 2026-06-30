import { CalendarDays, Radio, Trophy, Users } from "lucide-react";
import type { Tab } from "../types";

type StatsCardsProps = {
  liveCount: number;
  matchCount: number;
  resultCount: number;
  playerCount: number;
  onChangeTab: (tab: Tab) => void;
};

function StatsCards({ liveCount, matchCount, resultCount, playerCount, onChangeTab }: StatsCardsProps) {
  return (
    <section className="stats">
      <div onClick={() => onChangeTab("start")}>
        <Radio />
        <b>{liveCount}</b>
        <small>Live</small>
      </div>

      <div onClick={() => onChangeTab("plan")}>
        <CalendarDays />
        <b>{matchCount}</b>
        <small>Spiele</small>
      </div>

      <div onClick={() => onChangeTab("ergebnisse")}>
        <Trophy />
        <b>{resultCount}</b>
        <small>Ergebnisse</small>
      </div>

      <div onClick={() => onChangeTab("teilnehmer")}>
        <Users />
        <b>{playerCount}</b>
        <small>Teilnehmer</small>
      </div>
    </section>
  );
}

export default StatsCards;