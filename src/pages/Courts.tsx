import type { Match } from "../types";

type CourtsProps = {
  matches: Match[];
};

const courts = [1, 2, 3, 4, 5, 6];

function Courts({ matches }: CourtsProps) {
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
            .sort((a, b) => a.time.localeCompare(b.time));

          const liveMatch = courtMatches.find((match) => match.status === "live");
          const nextMatch = courtMatches.find((match) => match.status === "planned");

          return (
            <article
              className={`courtCard ${liveMatch ? "courtLive" : ""} ${court === 6 ? "courtReserve" : ""}`}
              key={court}
            >
              <div className="courtTop">
                <b>Platz {court}</b>
                {court === 6 ? <span>Reserve</span> : liveMatch ? <span>LIVE</span> : <span>Matchplatz</span>}
              </div>

              {liveMatch && (
                <div className="courtMain">
                  <small>{liveMatch.competition}</small>
                  <h3>{liveMatch.a}</h3>
                  <p>gegen</p>
                  <h3>{liveMatch.b}</h3>
                  <em>läuft seit {liveMatch.since} Uhr</em>
                </div>
              )}

              {!liveMatch && nextMatch && (
                <div className="courtMain">
                  <small>{nextMatch.competition}</small>
                  <strong>{nextMatch.time} Uhr</strong>
                  <h3>{nextMatch.a}</h3>
                  <p>gegen</p>
                  <h3>{nextMatch.b}</h3>
                  <em>nächstes Spiel</em>
                </div>
              )}

              {!liveMatch && !nextMatch && (
                <div className="courtEmpty">
                  <strong>{court === 6 ? "Reserveplatz" : "frei"}</strong>
                  <span>{court === 6 ? "Nur bei Bedarf eingeplant" : "Aktuell kein Spiel angesetzt"}</span>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}

export default Courts;