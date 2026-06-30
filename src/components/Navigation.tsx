import { CalendarDays, Home, Trophy, Utensils, Users } from "lucide-react";
import type { Tab } from "../types";

type NavigationProps = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
};

function Navigation({ activeTab, onChangeTab }: NavigationProps) {
  return (
    <nav className="nav">
      <button onClick={() => onChangeTab("start")} className={activeTab === "start" ? "active" : ""}>
        <Home />
        Start
      </button>

      <button onClick={() => onChangeTab("plan")} className={activeTab === "plan" ? "active" : ""}>
        <CalendarDays />
        Plan
      </button>

      <button onClick={() => onChangeTab("teilnehmer")} className={activeTab === "teilnehmer" ? "active" : ""}>
        <Users />
        Teilnehmer
      </button>

      <button onClick={() => onChangeTab("ergebnisse")} className={activeTab === "ergebnisse" ? "active" : ""}>
        <Trophy />
        Ergebnisse
      </button>

      <button onClick={() => onChangeTab("gastro")} className={activeTab === "gastro" ? "active" : ""}>
        <Utensils />
        Gastro
      </button>
    </nav>
  );
}

export default Navigation;