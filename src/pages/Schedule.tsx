import type { Match } from "../types";

type ScheduleProps = {
  matches: Match[];
};

function Schedule({ matches }: ScheduleProps) {
  const times = Array.from(new Set(matches.map((match) => match.time))).sort();

  return (
    <>
      <section className="pageHeader">
        <p>📅 SPIELPLAN</p>
        <h2>Heute angesetzt</h2>
        <span>Alle Spiele nach Uhrzeit und Platz sortiert</span>
      </section>

      <section className="scheduleGroups">
        {times.map((time) => {
          const matchesAtTime = matches
            .filter((match) => match.time === time)
            .sort((a, b) => a.court - b.court);

          return (
            <section className="scheduleGroup" key={time}>
              <div className="scheduleTimeLine">
                <span>{time} Uhr</span>
              </div>

              <div className="scheduleGrid">
                {matchesAtTime.map((match) => (
                  <article
                    className={`scheduleCard ${match.status === "live" ? "scheduleCardLive" : ""}`}
                    key={`${match.time}-${match.court}-${match.a}`}
                  >
                    <div className="scheduleCardTop">
                      <b>Platz {match.court}</b>
                      <span>{match.competition}</span>
                    </div>

                    <div className="schedulePlayers">
                      <strong>{match.a}</strong>
                      <small>gegen</small>
                      <strong>{match.b}</strong>
                    </div>

                    <div className="scheduleStatus">
                      {match.status === "live" && <em>🟢 läuft seit {match.since} Uhr</em>}
                      {match.status === "planned" && <em>⏭️ angesetzt</em>}
                      {match.status === "done" && <em>🏆 {match.result}</em>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </>
  );
}

export default Schedule;