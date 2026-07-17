import { useState } from "react";
import type { Match } from "../types";

type CourtsProps = {
  matches: Match[];
};

const courts = [1, 2, 3, 4, 5, 6];

function normalizeName(name: string) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function isPlaceholder(name: string) {
  const normalized = normalizeName(name);

  return (
    normalized === "" ||
    normalized === "offen" ||
    normalized === "n.a." ||
    normalized === "n.a" ||
    normalized.includes("sieger") ||
    normalized.includes("finalist") ||
    normalized.includes("verlierer") ||
    normalized.includes("turniersieger") ||
    normalized.includes("halbfinale") ||
    normalized.includes("viertelfinale") ||
    normalized.includes("achtelfinale") ||
    normalized.includes("runde")
  );
}

function isRealMatch(match: Match) {
  return !isPlaceholder(match.a) && !isPlaceholder(match.b);
}

function getDatePart(time: string) {
  return time.includes(".") ? time.split(" ")[0] : "";
}

function getTodayDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${day}.${month}.`;
}

function Courts({ matches }: CourtsProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);

  const todayDate = getTodayDate();

  function playerButton(name: string) {
    return (
      <button
        className="playerNameButton"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setSelectedPlayer(name);
        }}
      >
        {name}
      </button>
    );
  }

  function closeModal() {
    setSelectedPlayer(null);
    setSelectedCourt(null);
  }

  const selectedCourtMatches =
    selectedCourt === null
      ? []
      : matches
          .filter((match) => match.court === selectedCourt)
          .filter(isRealMatch)
          .filter((match) => match.status !== "done")
          .filter((match) => getDatePart(match.time) === todayDate)
          .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      <section className="pageHeader">
        <p>🎾 CENTER COURT</p>
        <h2>Platzübersicht</h2>
        <span>5 Matchplätze · Reserveplatz 6 bei Bedarf</span>
      </section>

      <section className="courtGrid">
        {courts.map((court) => {
          const courtMatches = matches
            .filter((match) => match.court === court)
            .filter(isRealMatch)
            .filter((match) => getDatePart(match.time) === todayDate)
            .sort((a, b) => a.time.localeCompare(b.time));

          const liveMatch = courtMatches.find((match) => match.status === "live");
          const nextMatch = courtMatches.find((match) => match.status === "planned");

          return (
            <article
              className={`courtCard ${liveMatch ? "courtLive" : ""} ${
                court === 6 ? "courtReserve" : ""
              }`}
              key={court}
              onClick={() => setSelectedCourt(court)}
            >
              <div className="courtTop">
                <b>Platz {court}</b>
                {court === 6 ? (
                  <span>Reserve</span>
                ) : liveMatch ? (
                  <span>LIVE</span>
                ) : (
                  <span>Matchplatz</span>
                )}
              </div>

              {liveMatch && (
                <div className="courtMain">
                  <small>{liveMatch.competition}</small>
                  <h3>{playerButton(liveMatch.a)}</h3>
                  <p>gegen</p>
                  <h3>{playerButton(liveMatch.b)}</h3>
                  <em>läuft seit {liveMatch.since} Uhr</em>
                </div>
              )}

              {!liveMatch && nextMatch && (
                <div className="courtMain">
                  <small>{nextMatch.competition}</small>
                  <strong>{nextMatch.time} Uhr</strong>
                  <h3>{playerButton(nextMatch.a)}</h3>
                  <p>gegen</p>
                  <h3>{playerButton(nextMatch.b)}</h3>
                  <em>nächstes Spiel</em>
                </div>
              )}

              {!liveMatch && !nextMatch && (
                <div className="courtEmpty">
                  <strong>{court === 6 ? "Reserveplatz" : "frei"}</strong>
                  <span>
                    {court === 6
                      ? "Nur bei Bedarf eingeplant"
                      : "Heute kein Spiel angesetzt"}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {selectedCourt !== null && (
        <div className="playerOverlay" onClick={closeModal}>
          <article
            className="playerModal"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modalClose" type="button" onClick={closeModal}>
              ×
            </button>

            <small>Platzübersicht · {todayDate}</small>
            <h2>Platz {selectedCourt}</h2>

            <div className="playerFacts">
              {selectedCourtMatches.length > 0 ? (
                selectedCourtMatches.map((match) => (
                  <div key={`${match.time}-${match.a}-${match.b}`}>
                    <span>
                      {match.time} Uhr · {match.competition}
                    </span>
                    <b>
                      {match.a} gegen {match.b}
                    </b>
                  </div>
                ))
              ) : (
                <div>
                  <span>Hinweis</span>
                  <b>Für heute sind keine weiteren Spiele angesetzt.</b>
                </div>
              )}
            </div>
          </article>
        </div>
      )}

      {selectedPlayer && (
        <div className="playerOverlay" onClick={closeModal}>
          <article
            className="playerModal"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modalClose" type="button" onClick={closeModal}>
              ×
            </button>

            <small>Spielerprofil</small>
            <h2>{selectedPlayer}</h2>

            <div className="playerFacts">
              <div>
                <span>Hinweis</span>
                <b>Spielerdetails werden aus der Teilnehmerliste geladen.</b>
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}

export default Courts;