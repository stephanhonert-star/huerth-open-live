import {
  BarChart3,
  CalendarDays,
  GitBranch,
  Home,
  MapPin,
  Users,
} from "lucide-react";
import type { Tab } from "../types";

type NavigationProps = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
};

function Navigation({ activeTab, onChangeTab }: NavigationProps) {
  return (
    <nav className="nav">
      <button
        onClick={() => onChangeTab("start")}
        className={activeTab === "start" ? "active" : ""}
      >
        <Home />
        Start
      </button>

      <button
        onClick={() => onChangeTab("courts")}
        className={activeTab === "courts" ? "active" : ""}
      >
        <MapPin />
        Plätze
      </button>

      <button
        onClick={() => onChangeTab("plan")}
        className={activeTab === "plan" ? "active" : ""}
      >
        <CalendarDays />
        Plan
      </button>

      <button
        onClick={() => onChangeTab("draws")}
        className={activeTab === "draws" ? "active" : ""}
      >
        <GitBranch />
        Baum
      </button>

      <button
        onClick={() => onChangeTab("teilnehmer")}
        className={activeTab === "teilnehmer" ? "active" : ""}
      >
        <Users />
        Spieler
      </button>

      <button
        onClick={() => onChangeTab("statistik")}
        className={activeTab === "statistik" ? "active" : ""}
      >
        <BarChart3 />
        Statistik
      </button>
    </nav>
  );
}

export default Navigation;