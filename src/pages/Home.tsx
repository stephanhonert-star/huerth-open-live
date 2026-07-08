import { useState } from "react";
import Countdown from "../components/Countdown";
import CourtOverview from "../components/CourtOverview";
import MatchCard from "../components/MatchCard";
import { tournamentStore } from "../store/tournamentStore";
import type { Match, Player, Tab } from "../types";

type HomeProps = {
  live: Match[];
  planned: Match[];
  allMatches: Match[];
  done: Match[];
  players: Player[];
  visitorStats: {
    today: number;
    total: number;
  };
  onChangeTab: (tab: Tab) => void;
};

function isPlaceholder(name: string) {
  return (
    name.includes("Sieger") ||
    name.includes("Finalist") ||
    name.includes("Verlierer") ||
    name.includes("Turniersieger") ||
    name === "offen"
  );
}

function isRealMatch(match: Match) {
  return !isPlaceholder(match.a) && !isPlaceholder(match.b);
}

function getDatePart(time: string) {
  return time.includes(".") ? time.split(" ")[0] : "Ohne Datum";
}

function getTimePart(time: string) {
  return time.includes(".") ? time.split(" ").slice(1).join(" ") : time;
}

function getNextMatchText(matches: Match[]) {
  if (matches.length === 0) return "Kein Spiel geplant";

  const next = [...matches].sort((a, b) => a.time.localeCompare(b.time))[0];

  return `${getTimePart(next.time)} · Platz ${next.court}`;
}

function Home({
  live,
  planned,
  allMatches,
  done,
  players,
  visitorStats,
  onChangeTab,
}: HomeProps) {
  const realLive = live.filter(isRealMatch);
  const realPlanned = planned.filter(isRealMatch);
  const realDone = done.filter(isRealMatch);
  const realMatches = allMatches.filter(isRealMatch);

  const dates = Array.from(
    new Set(realPlanned.map((match) => getDatePart(match.time)))
  ).sort();

  const [selectedDate, setSelectedDate] = useState("Alle");

  const visiblePlanned =
    selectedDate === "Alle"
      ? realPlanned
      : realPlanned.filter((match) => getDatePart(match.time) === selectedDate);

  return (
    <>
      <Countdown />

      <section className="eventHero">
        <p>TOURNAMENT CENTER</p>

        <h1>{tournamentStore.tournament.name}</h1>

        <span>
          {tournamentStore.tournament.date} · {tournamentStore.tournament.club}
        </span>

        <div className="eventStats">
          <div>
            <b>{players.length}</b>
            <small>Teilnehmer</small>
          </div>

          <div>
            <b>{tournamentStore.tournament.competitions}</b>
            <small>Konkurrenzen</small>
          </div>

          <div>
            <b>5 + 1</b>
            <small>Matchplätze</small>
          </div>

          <div>
            <b>16</b>
            <small>Turniertage</small>
          </div>

          <div>
            <b>{visitorStats.today}</b>
            <small>Besucher heute</small>
          </div>

          <div>
            <b>{visitorStats.total}</b>
            <small>Besuche gesamt</small>
          </div>
        </div>

        <div className="eventStatus">
          <span>🟢 Anlage geöffnet</span>
          <span>🎾 Spielbetrieb</span>
          <span>🍔 Gastro geöffnet</span>
          <span>🎵 Turniersong online</span>
        </div>
      </section>

      <section className="liveTicker">
        <button className="tickerItem" onClick={() => onChangeTab("plan")}>
          <span>🎾</span>
          <div>
            <b>{realPlanned.length}</b>
            <small>Geplante Spiele</small>
          </div>
        </button>

        <button className="tickerItem" onClick={() => onChangeTab("courts")}>
          <span>🟢</span>
          <div>
            <b>{realLive.length}</b>
            <small>Live auf Platz</small>
          </div>
        </button>

        <button className="tickerItem" onClick={() => onChangeTab("start")}>
          <span>🏆</span>
          <div>
            <b>{realDone.length}</b>
            <small>Beendet</small>
          </div>
        </button>

        <button className="tickerItem" onClick={() => onChangeTab("plan")}>
          <span>⏰</span>
          <div>
            <b>{getNextMatchText(realPlanned)}</b>
            <small>Nächstes Match</small>
          </div>
        </button>
      </section>

      <CourtOverview matches={realMatches} />

      <section className="sectionTitle">
        <p>GLEICH GEHT ES WEITER</p>
        <h2>⏭️ Als Nächstes</h2>
      </section>

      <section className="competitionChips">
        <button
          type="button"
          className={selectedDate === "Alle" ? "active" : ""}
          onClick={() => setSelectedDate("Alle")}
        >
          Alle <span>{realPlanned.length}</span>
        </button>

        {dates.map((date) => (
          <button
            type="button"
            key={date}
            className={selectedDate === date ? "active" : ""}
            onClick={() => setSelectedDate(date)}
          >
            {date}{" "}
            <span>
              {realPlanned.filter((match) => getDatePart(match.time) === date).length}
            </span>
          </button>
        ))}
      </section>

      <section className="cards">
        {visiblePlanned.map((match) => (
          <MatchCard key={`${match.time}-${match.court}-${match.a}`} match={match} />
        ))}
      </section>

      <section className="sectionTitle">
        <p>BEREITS BEENDET</p>
        <h2>🏆 Letzte Ergebnisse</h2>
      </section>

      <section className="cards">
        {realDone.map((match) => (
          <MatchCard key={`${match.time}-${match.court}-${match.a}`} match={match} />
        ))}
      </section>
    </>
  );
}

export default Home;