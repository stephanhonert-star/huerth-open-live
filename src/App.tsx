import { useEffect, useState } from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import { players as defaultPlayers } from "./data/players";
import Admin from "./pages/Admin";
import Courts from "./pages/Courts";
import Draws from "./pages/Draws";
import Home from "./pages/Home";
import Players from "./pages/Players";
import Schedule from "./pages/Schedule";
import { db } from "./services/firebase";
import { DRAW_STORAGE_KEY } from "./services/drawProgression";
import type { Match, Player, Tab } from "./types";

import "./styles/app.css";
import "./styles/header.css";
import "./styles/home.css";
import "./styles/countdown.css";
import "./styles/cards.css";
import "./styles/navigation.css";
import "./styles/players.css";
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
  const [visitorStats, setVisitorStats] = useState({
    today: 0,
    total: 0,
  });

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

      if (Array.isArray(data.draws)) {
        localStorage.setItem(DRAW_STORAGE_KEY, JSON.stringify(data.draws));
        window.dispatchEvent(new Event("huerthOpenDrawsUpdated"));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const localKey = `huerthOpenVisitor-${today}`;
    const statsRef = doc(db, "huerthOpen", "visitors");

    async function countVisit() {
      if (localStorage.getItem(localKey)) return;

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(statsRef);
        const data = snapshot.data();

        const currentTodayDate = data?.todayDate;
        const currentToday =
          currentTodayDate === today ? Number(data?.todayCount || 0) : 0;
        const currentTotal = Number(data?.totalCount || 0);

        transaction.set(
          statsRef,
          {
            todayDate: today,
            todayCount: currentToday + 1,
            totalCount: currentTotal + 1,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      });

      localStorage.setItem(localKey, "true");
    }

    countVisit();

    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      const data = snapshot.data();

      if (!data) return;

      setVisitorStats({
        today: Number(data.todayCount || 0),
        total: Number(data.totalCount || 0),
      });
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
            visitorStats={visitorStats}
            onChangeTab={changeTab}
          />
        )}

        {tab === "courts" && <Courts matches={matches} />}

        {tab === "plan" && <Schedule matches={matches} players={players} />}

        {tab === "draws" && <Draws />}

        {tab === "teilnehmer" && (
          <Players
            players={shownPlayers}
            matches={matches}
            clubs={clubs}
            selectedClub={club}
            onSelectClub={setClub}
          />
        )}

        {tab === "admin" && <Admin />}
      </main>

      {tab !== "admin" && (
        <Navigation activeTab={tab} onChangeTab={changeTab} />
      )}
    </div>
  );
}

export default App;