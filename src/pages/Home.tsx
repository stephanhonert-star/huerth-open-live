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

function getSortValue(time: string) {
  if (!time.includes(".")) return 99999999;

  const [datePart, clockPart = "00:00"] = time.split(" ");
  const [day = 0, month = 0] = datePart.split(".").map(Number);
  const [hour = 0, minute = 0] = clockPart.split(":").map(Number);

  return month * 1000000 + day * 10000 + hour * 100 + minute;
}

function getNextMatchText(matches: Match[]) {
  if (matches.length === 0) {
    return "Spielplan folgt nach Auslosung";
  }

  const next = [...matches].sort(
    (a, b) => getSortValue(a.time) - getSortValue(b.time)
  )[0];

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

  const centerCourtLive = realLive.find((match) => match.court === 1);

  const dates = Array.from(
    new Set(realPlanned.map((match) => getDatePart(match.time)))
  ).sort();

  const [selectedDate, setSelectedDate] = useState("Alle");

  const visiblePlanned =
    selectedDate === "Alle"
      ? realPlanned
      : realPlanned.filter(
          (match) => getDatePart(match.time) === selectedDate
        );

  return (
    <>
      <Countdown />

      <section className="eventHero">
        <div className="eventHeroTop">
          <div className="eventHeroText">
            <p>TOURNAMENT CENTER</p>

            <h1>{tournamentStore.tournament.name}</h1>

            <span>
              {tournamentStore.tournament.date} ·{" "}
              {tournamentStore.tournament.club}
            </span>
          </div>

          <div
            className={`eventHeroHighlight ${
              realLive.length > 0 ? "hasLiveMatches" : ""
            }`}
          >
            <b>{realLive.length}</b>

            <span>
              <i className={realLive.length > 0 ? "livePulse" : "offlineDot"} />
              aktuell live
            </span>
          </div>
        </div>

        <div className="eventStats">
          <div>
            <b>
              <span className="eventStatIcon">👥</span>
              {players.length}
            </b>
            <small>Teilnehmer</small>
          </div>

          <div>
            <b>
              <span className="eventStatIcon">🏆</span>
              {tournamentStore.tournament.competitions}
            </b>
            <small>Konkurrenzen</small>
          </div>

          <div>
            <b>
              <span className="eventStatIcon">🎾</span>5 + 1
            </b>
            <small>Plätze</small>
          </div>

          <div>
            <b>
              <span className="eventStatIcon">📅</span>
              16
            </b>
            <small>Turniertage</small>
          </div>

          <div className="visitorStat">
            <b>
              <span className="eventStatIcon">👁️</span>
              {visitorStats.today}
            </b>
            <small>Besucher heute</small>
          </div>

          <div className="visitorStat">
            <b>
              <span className="eventStatIcon">🌍</span>
              {visitorStats.total}
            </b>
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

      {centerCourtLive && (
        <section
          className="homeCenterCourt"
          onClick={() => onChangeTab("courts")}
        >
          <div className="homeCenterCourtTop">
            <div>
              <p>
                <i className="livePulse" />
                CENTER COURT LIVE
              </p>

              <h2>Platz 1</h2>
            </div>

            <span>LIVE</span>
          </div>

          <small>{centerCourtLive.competition}</small>

          <div className="homeCenterCourtPlayers">
            <strong>{centerCourtLive.a}</strong>
            <em>gegen</em>
            <strong>{centerCourtLive.b}</strong>
          </div>

          <div className="homeCenterCourtBottom">
            <span>
              läuft seit {centerCourtLive.since || "kurzem"} Uhr
            </span>

            <b>Platz ansehen →</b>
          </div>
        </section>
      )}

      <section className="liveTicker">
        <button
          type="button"
          className="tickerItem"
          onClick={() => onChangeTab("plan")}
        >
          <span>🎾</span>

          <div>
            <b>{realPlanned.length}</b>
            <small>Geplante Spiele</small>
          </div>
        </button>

        <button
          type="button"
          className={`tickerItem ${realLive.length > 0 ? "tickerLive" : ""}`}
          onClick={() => onChangeTab("courts")}
        >
          <span className="tickerLiveIcon">
            <i className={realLive.length > 0 ? "livePulse" : "offlineDot"} />
          </span>

          <div>
            <b>{realLive.length}</b>
            <small>Aktuell live</small>
          </div>
        </button>

        <button
          type="button"
          className="tickerItem"
          onClick={() => onChangeTab("start")}
        >
          <span>🏆</span>

          <div>
            <b>{realDone.length}</b>
            <small>Beendet</small>
          </div>
        </button>

        <button
          type="button"
          className="tickerItem tickerNext"
          onClick={() => onChangeTab("plan")}
        >
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

      {realPlanned.length > 0 ? (
        <>
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
                  {
                    realPlanned.filter(
                      (match) => getDatePart(match.time) === date
                    ).length
                  }
                </span>
              </button>
            ))}
          </section>

          <section className="cards">
            {visiblePlanned.map((match) => (
              <MatchCard
                key={`${match.time}-${match.court}-${match.a}`}
                match={match}
              />
            ))}
          </section>
        </>
      ) : (
        <section className="homeWaitingCard">
          <span>📅</span>

          <div>
            <b>Spielplan folgt nach der Auslosung</b>
            <small>
              Die aktuellen Spielzeiten werden am 16.07.2026 veröffentlicht.
            </small>
          </div>
        </section>
      )}

      <section className="sectionTitle">
        <p>BEREITS BEENDET</p>
        <h2>🏆 Letzte Ergebnisse</h2>
      </section>

      {realDone.length > 0 ? (
        <section className="cards">
          {realDone.map((match) => (
            <MatchCard
              key={`${match.time}-${match.court}-${match.a}`}
              match={match}
            />
          ))}
        </section>
      ) : (
        <section className="homeWaitingCard compact">
          <span>🏆</span>

          <div>
            <b>Noch keine Ergebnisse</b>
            <small>
              Die ersten Resultate erscheinen hier direkt nach Spielende.
            </small>
          </div>
        </section>
      )}
    </>
  );
}

export default Home;