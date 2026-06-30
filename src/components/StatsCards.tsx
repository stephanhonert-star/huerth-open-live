import { CalendarDays, MapPin, Radio, Users } from "lucide-react";
import type { Tab } from "../types";

type StatsCardsProps = {
  liveCount: number;
  matchCount: number;
  playerCount: number;
  onChangeTab: (tab: Tab) => void;
};

function StatsCards({
  liveCount,
  matchCount,
  playerCount,
  onChangeTab,
}: StatsCardsProps) {
  return (
    <section className="stats">
      <div onClick={() => onChangeTab("courts")}>
        <Radio />
        <b>{liveCount}</b>
        <small>Live</small>
      </div>

      <div onClick={() => onChangeTab("plan")}>
        <CalendarDays />
        <b>{matchCount}</b>
        <small>Spiele</small>
      </div>

      <div onClick={() => onChangeTab("courts")}>
        <MapPin />
        <b>5 + 1</b>
        <small>Plätze</small>
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