import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import { players as defaultPlayers } from "./data/players";
import Admin from "./pages/Admin";
import Courts from "./pages/Courts";
import Draws from "./pages/Draws";
import Gastro from "./pages/Gastro";
import Home from "./pages/Home";
import Players from "./pages/Players";
import Schedule from "./pages/Schedule";
import { db } from "./services/firebase";
import type { Match, Player, Tab } from "./types";

import "./styles/app.css";
import "./styles/header.css";
import "./styles/home.css";
import "./styles/countdown.css";
import "./styles/cards.css";
import "./styles/navigation.css";
import "./styles/players.css";
import "./styles/gastro.css";
import "./styles/schedule.css";
import "./styles/courts.css";
import "./styles/court-overview.css";
import "./styles/draws.css";
import "./styles/draw/draw.css";
import "./styles/pdf-import.css";
import "./styles/admin.css";
import "./styles/audio-player.css";

const PLAYER_STORAGE_KEY = "huerthOpenPlayers";
const MATCH_STORAGE_KEY = "huerthOpenMatches";

function getInitialTab(): Tab {
  return window.location.hash === "#admin" ? "admin" : "start";
}

function loadPlayers(): Player[] {
  const savedPlayers = localStorage.getItem(PLAYER_STORAGE_KEY);

  if (!savedPlayers) {
    return defaultPlayers;
  }

  try {
    return JSON.parse(savedPlayers) as Player[];
  } catch {
    return defaultPlayers;
  }
}

function loadMatches(): Match[] {
  const savedMatches = localStorage.getItem(MATCH_STORAGE_KEY);

  if (!savedMatches) {
    return [];
  }

  try {
    return JSON.parse(savedMatches) as Match[];
  } catch {
    return [];
  }
}

function App() {
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const [club, setClub] = useState("Alle");
  const [players, setPlayers] = useState<Player[]>(loadPlayers);
  const [matches, setMatches] = useState<Match[]>(loadMatches);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "huerthOpen", "live"), (snapshot) => {
      const data = snapshot.data();

      if (!data) return;

      if (Array.isArray(data.players)) {
        setPlayers(data.players as Player[]);
        localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(data.players));
      }

      if (Array.isArray(data.matches)) {
        setMatches(data.matches as Match[]);
        localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(data.matches));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleHashChange() {
      if (window.location.hash === "#admin") {
        setTab("admin");
      }
    }

    function handlePlayersUpdated() {
      setPlayers(loadPlayers());
      setClub("Alle");
    }

    function handleMatchesUpdated() {
      setMatches(loadMatches());
    }

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("huerthOpenPlayersUpdated", handlePlayersUpdated);
    window.addEventListener("huerthOpenMatchesUpdated", handleMatchesUpdated);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("huerthOpenPlayersUpdated", handlePlayersUpdated);
      window.removeEventListener("huerthOpenMatchesUpdated", handleMatchesUpdated);
    };
  }, []);

  function changeTab(nextTab: Tab) {
    setTab(nextTab);

    if (nextTab === "admin") {
      window.location.hash = "admin";
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  const live = matches.filter((match) => match.status === "live");
  const planned = matches.filter((match) => match.status === "planned");
  const done = matches.filter((match) => match.status === "done");

  const clubs = [
    "Alle",
    ...Array.from(new Set(players.map((player) => player.club))).sort((a, b) =>
      a.localeCompare(b, "de")
    ),
  ];

  const shownPlayers =
    club === "Alle" ? players : players.filter((player) => player.club === club);

  return (
    <div className="app">
      <Header />

      <main>
        {tab === "start" && (
          <Home
            live={live}
            planned={planned}
            allMatches={matches}
            done={done}
            players={players}
            onChangeTab={changeTab}
          />
        )}

        {tab === "courts" && <Courts matches={matches} />}

        {tab === "plan" && <Schedule matches={matches} players={players} />}

        {tab === "draws" && <Draws />}

        {tab === "teilnehmer" && (
          <Players
            players={shownPlayers}
            clubs={clubs}
            selectedClub={club}
            onSelectClub={setClub}
          />
        )}

        {tab === "gastro" && <Gastro />}

        {tab === "admin" && <Admin />}
      </main>

      {tab !== "admin" && <Navigation activeTab={tab} onChangeTab={changeTab} />}
    </div>
  );
}

export default App;