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
        type="button"
        onClick={() => onChangeTab("start")}
        className={activeTab === "start" ? "active" : ""}
      >
        <Home />
        <span>Start</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab("courts")}
        className={activeTab === "courts" ? "active" : ""}
      >
        <MapPin />
        <span>Plätze</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab("plan")}
        className={activeTab === "plan" ? "active" : ""}
      >
        <CalendarDays />
        <span>Plan</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab("draws")}
        className={activeTab === "draws" ? "active" : ""}
      >
        <GitBranch />
        <span>Baum</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab("teilnehmer")}
        className={activeTab === "teilnehmer" ? "active" : ""}
      >
        <Users />
        <span>Spieler</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab("statistik")}
        className={activeTab === "statistik" ? "active" : ""}
      >
        <BarChart3 />
        <span>Statistik</span>
      </button>
    </nav>
  );
}

export default Navigation;