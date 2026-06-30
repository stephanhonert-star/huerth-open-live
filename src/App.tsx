import { useState } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import { matches } from "./data/matches";
import { players } from "./data/players";
import Courts from "./pages/Courts";
import Gastro from "./pages/Gastro";
import Home from "./pages/Home";
import PdfImport from "./pages/PdfImport";
import Players from "./pages/Players";
import Schedule from "./pages/Schedule";
import type { Tab } from "./types";

import "./styles/app.css";
import "./styles/header.css";
import "./styles/home.css";
import "./styles/cards.css";
import "./styles/navigation.css";
import "./styles/players.css";
import "./styles/gastro.css";
import "./styles/schedule.css";
import "./styles/courts.css";
import "./styles/pdf-import.css";
import "./styles/audio-player.css";

function App() {
  const [tab, setTab] = useState<Tab>("start");
  const [club, setClub] = useState("Alle");

  const live = matches.filter((match) => match.status === "live");
  const planned = matches.filter((match) => match.status === "planned");
  const done = matches.filter((match) => match.status === "done");

  const clubs = ["Alle", ...Array.from(new Set(players.map((player) => player.club)))];
  const shownPlayers = club === "Alle" ? players : players.filter((player) => player.club === club);

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
            onChangeTab={setTab}
          />
        )}

        {tab === "courts" && <Courts matches={matches} />}

        {tab === "plan" && <Schedule matches={matches} />}

        {tab === "teilnehmer" && (
          <Players players={shownPlayers} clubs={clubs} selectedClub={club} onSelectClub={setClub} />
        )}

        {tab === "gastro" && <Gastro />}

        {tab === "import" && <PdfImport />}
      </main>

      <Navigation activeTab={tab} onChangeTab={setTab} />
    </div>
  );
}

export default App;