import { useState } from "react";
import type { Match } from "../types";
import ResultScore from "./ResultScore";

type CourtOverviewProps = {
  matches: Match[];
};

const courts = [1, 2, 3, 4, 5, 6];

function formatMatchDate(time: string) {
  if (!time.includes(".")) {
    return `${time} Uhr`;
  }

  const [datePart, clockPart] = time.split(" ");
  const [day, month] = datePart.split(".").map(Number);

  const date = new Date(2026, month - 1, day);

  const weekdays = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];

  return `${weekdays[date.getDay()]}, ${datePart}.2026 · ${clockPart} Uhr`;
}

function getTimeOnly(time: string) {
  if (!time.includes(".")) {
    return time;
  }

  return time.split(" ").slice(1).join(" ");
}

function CourtOverview({ matches }: CourtOverviewProps) {
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);

  const centerCourtMatch =
    matches.find((match) => match.court === 1 && match.status === "live") ||
    matches.find((match) => match.court === 1 && match.status === "planned") ||
    matches.find((match) => match.court === 1);

  const selectedCourtMatches = selectedCourt
    ? matches
        .filter((match) => match.court === selectedCourt)
        .sort((a, b) => a.time.localeCompare(b.time))
    : [];

  function getCourtStatus(court: number) {
    const courtMatches = matches.filter((match) => match.court === court);
    const liveMatch = courtMatches.find((match) => match.status === "live");
    const nextMatch = courtMatches.find((match) => match.status === "planned");
    const latestDone = [...courtMatches].reverse().find((match) => match.status === "done");

    return {
      liveMatch,
      nextMatch,
      latestDone,
      shownMatch: liveMatch || nextMatch || latestDone,
    };
  }

  return (
    <>
      {centerCourtMatch && (
        <section className={`centerCourtHero ${centerCourtMatch.status === "live" ? "isLive" : ""}`}>
          <p>🎾 CENTER COURT</p>
          <h2>Platz 1</h2>
          <span>{centerCourtMatch.competition}</span>

          {centerCourtMatch.status === "done" && centerCourtMatch.result ? (
            <ResultScore playerA={centerCourtMatch.a} playerB={centerCourtMatch.b} result={centerCourtMatch.result} />
          ) : (
            <div className="centerCourtPlayers">
              <strong>{centerCourtMatch.a}</strong>
              <small>gegen</small>
              <strong>{centerCourtMatch.b}</strong>
            </div>
          )}

          <em>
            {centerCourtMatch.status === "live" && `🟢 läuft seit ${centerCourtMatch.since} Uhr`}
            {centerCourtMatch.status === "planned" && `📅 ${formatMatchDate(centerCourtMatch.time)}`}
            {centerCourtMatch.status === "done" && "🏆 beendet"}
          </em>
        </section>
      )}

      <section className="sectionTitle">
        <p>HEUTE AUF DER ANLAGE</p>
        <h2>🎾 Platzübersicht</h2>
      </section>

      <section className="courtOverviewGrid">
        {courts.map((court) => {
          const { liveMatch, nextMatch, shownMatch } = getCourtStatus(court);

          return (
            <button
              type="button"
              className={`courtMiniCard ${liveMatch ? "miniLive" : ""} ${court === 6 ? "miniReserve" : ""}`}
              key={court}
              onClick={() => setSelectedCourt(court)}
            >
              <div className="courtMiniTop">
                <b>Platz {court}</b>
                {court === 6 && <span>Reserve</span>}
                {court !== 6 && liveMatch && <span>LIVE</span>}
                {court !== 6 && !liveMatch && nextMatch && <span>{getTimeOnly(nextMatch.time)}</span>}
                {court !== 6 && !liveMatch && !nextMatch && <span>frei</span>}
              </div>

              {shownMatch ? (
                <>
                  <small>{shownMatch.competition}</small>
                  <strong>{shownMatch.a}</strong>
                  <p>vs</p>
                  <strong>{shownMatch.b}</strong>
                </>
              ) : (
                <div className="courtMiniEmpty">
                  <strong>{court === 6 ? "Reserveplatz" : "Aktuell frei"}</strong>
                  <small>{court === 6 ? "nur bei Bedarf" : "kein Spiel angesetzt"}</small>
                </div>
              )}
            </button>
          );
        })}
      </section>

      {selectedCourt && (
        <div className="courtOverlay" onClick={() => setSelectedCourt(null)}>
          <article className="courtModal" onClick={(event) => event.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedCourt(null)}>
              ×
            </button>

            <small>Tagesablauf</small>
            <h2>Platz {selectedCourt}</h2>

            <div className="courtModalStats">
              <span>{selectedCourtMatches.filter((match) => match.status === "done").length} beendet</span>
              <span>{selectedCourtMatches.filter((match) => match.status === "live").length} live</span>
              <span>{selectedCourtMatches.filter((match) => match.status === "planned").length} folgt</span>
            </div>

            <div className="courtTimeline">
              {selectedCourtMatches.length > 0 ? (
                selectedCourtMatches.map((match) => (
                  <article className={`courtTimelineItem ${match.status}`} key={`${match.time}-${match.court}-${match.a}`}>
                    <div className="courtTimelineTime">
                      <b>{formatMatchDate(match.time)}</b>
                      {match.status === "done" && <span>✅ beendet</span>}
                      {match.status === "live" && <span>🔴 live</span>}
                      {match.status === "planned" && <span>🟡 folgt</span>}
                    </div>

                    <div className="courtTimelineMatch">
                      <small>{match.competition}</small>

                      {match.status === "done" && match.result ? (
                        <ResultScore playerA={match.a} playerB={match.b} result={match.result} />
                      ) : (
                        <>
                          <strong>{match.a}</strong>
                          <p>gegen</p>
                          <strong>{match.b}</strong>
                        </>
                      )}

                      {match.status === "live" && <em>läuft seit {match.since} Uhr</em>}
                    </div>
                  </article>
                ))
              ) : (
                <div className="courtNoMatches">
                  <b>{selectedCourt === 6 ? "Reserveplatz" : "Keine Spiele"}</b>
                  <span>{selectedCourt === 6 ? "Dieser Platz wird nur bei Bedarf genutzt." : "Für diesen Platz sind aktuell keine Spiele hinterlegt."}</span>
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </>
  );
}

export default CourtOverview;