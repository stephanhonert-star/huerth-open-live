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

function getCourtStatus(matches: Match[], court: number) {
  const courtMatches = matches
    .filter((match) => match.court === court)
    .sort((a, b) => a.time.localeCompare(b.time));

  const liveMatch = courtMatches.find((match) => match.status === "live");
  const nextMatch = courtMatches.find((match) => match.status === "planned");
  const latestDone = [...courtMatches]
    .reverse()
    .find((match) => match.status === "done");

  return {
    courtMatches,
    liveMatch,
    nextMatch,
    latestDone,
    shownMatch: liveMatch || nextMatch || latestDone,
  };
}

function CourtOverview({ matches }: CourtOverviewProps) {
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);

  const selectedCourtMatches = selectedCourt
    ? matches
        .filter((match) => match.court === selectedCourt)
        .sort((a, b) => a.time.localeCompare(b.time))
    : [];

  return (
    <>
      <section className="sectionTitle courtBroadcastTitle">
        <p>HEUTE AUF DER ANLAGE</p>
        <h2>🎾 Matchplätze</h2>
      </section>

      <section className="courtBroadcastGrid">
        {courts.map((court) => {
          const { liveMatch, nextMatch, shownMatch } = getCourtStatus(
            matches,
            court
          );

          return (
            <button
              type="button"
              className={`courtBroadcastCard ${
                liveMatch ? "isLive" : "isFree"
              } ${court === 6 ? "isReserve" : ""}`}
              key={court}
              onClick={() => setSelectedCourt(court)}
            >
              <div className="courtBroadcastTop">
                <div>
                  <b>Platz {court}</b>

                  {court === 6 && <small>Reserveplatz</small>}

                  {court !== 6 && liveMatch && (
                    <small>Match läuft gerade</small>
                  )}

                  {court !== 6 && !liveMatch && nextMatch && (
                    <small>
                      nächstes Match um {getTimeOnly(nextMatch.time)} Uhr
                    </small>
                  )}

                  {court !== 6 && !liveMatch && !nextMatch && (
                    <small>aktuell verfügbar</small>
                  )}
                </div>

                {liveMatch && (
                  <span className="courtPill live">
                    <i className="courtLivePulse" />
                    LIVE
                  </span>
                )}

                {!liveMatch && nextMatch && (
                  <span className="courtPill next">NÄCHSTES</span>
                )}

                {!liveMatch && !nextMatch && (
                  <span className="courtPill free">
                    <i className="courtFreeDot" />
                    FREI
                  </span>
                )}
              </div>

              {shownMatch ? (
                <div className="courtBroadcastMatch">
                  <small>{shownMatch.competition}</small>

                  {shownMatch.status === "done" && shownMatch.result ? (
                    <ResultScore
                      playerA={shownMatch.a}
                      playerB={shownMatch.b}
                      result={shownMatch.result}
                    />
                  ) : (
                    <>
                      <strong>{shownMatch.a}</strong>
                      <span>gegen</span>
                      <strong>{shownMatch.b}</strong>
                    </>
                  )}

                  <em>
                    {shownMatch.status === "live" &&
                      `läuft seit ${shownMatch.since} Uhr`}

                    {shownMatch.status === "planned" &&
                      formatMatchDate(shownMatch.time)}

                    {shownMatch.status === "done" && "beendet"}
                  </em>
                </div>
              ) : (
                <div className="courtBroadcastEmpty">
                  <strong>
                    {court === 6 ? "Reserveplatz" : "🟢 Frei"}
                  </strong>

                  <span>
                    {court === 6
                      ? "nur bei Bedarf"
                      : "Heute kein Match geplant"}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </section>

      {selectedCourt && (
        <div className="courtOverlay" onClick={() => setSelectedCourt(null)}>
          <article
            className="courtModal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modalClose"
              onClick={() => setSelectedCourt(null)}
            >
              ×
            </button>

            <small>Tagesablauf</small>
            <h2>Platz {selectedCourt}</h2>

            <div className="courtModalStats">
              <span>
                {
                  selectedCourtMatches.filter(
                    (match) => match.status === "done"
                  ).length
                }{" "}
                beendet
              </span>

              <span>
                {
                  selectedCourtMatches.filter(
                    (match) => match.status === "live"
                  ).length
                }{" "}
                live
              </span>

              <span>
                {
                  selectedCourtMatches.filter(
                    (match) => match.status === "planned"
                  ).length
                }{" "}
                folgt
              </span>
            </div>

            <div className="courtTimeline">
              {selectedCourtMatches.length > 0 ? (
                selectedCourtMatches.map((match) => (
                  <article
                    className={`courtTimelineItem ${match.status}`}
                    key={`${match.time}-${match.court}-${match.a}`}
                  >
                    <div className="courtTimelineTime">
                      <b>{formatMatchDate(match.time)}</b>

                      {match.status === "done" && <span>✅ beendet</span>}
                      {match.status === "live" && <span>🔴 live</span>}
                      {match.status === "planned" && <span>🟡 folgt</span>}
                    </div>

                    <div className="courtTimelineMatch">
                      <small>{match.competition}</small>

                      {match.status === "done" && match.result ? (
                        <ResultScore
                          playerA={match.a}
                          playerB={match.b}
                          result={match.result}
                        />
                      ) : (
                        <>
                          <strong>{match.a}</strong>
                          <p>gegen</p>
                          <strong>{match.b}</strong>
                        </>
                      )}

                      {match.status === "live" && (
                        <em>läuft seit {match.since} Uhr</em>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="courtNoMatches">
                  <b>
                    {selectedCourt === 6
                      ? "Reserveplatz"
                      : "Aktuell keine Spiele"}
                  </b>

                  <span>
                    {selectedCourt === 6
                      ? "Dieser Platz wird nur bei Bedarf genutzt."
                      : "Für diesen Platz ist heute noch kein Match geplant."}
                  </span>
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