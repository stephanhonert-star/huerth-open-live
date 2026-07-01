import { useState } from "react";
import type { Match, Player } from "../types";

type ScheduleProps = {
  matches: Match[];
  players: Player[];
};

function isVisibleMatch(match: Match) {
  return match.a !== "offen" && match.b !== "offen";
}

function getDatePart(time: string) {
  return time.includes(".") ? time.split(" ")[0] : "Ohne Datum";
}

function getTimePart(time: string) {
  return time.includes(".") ? time.split(" ").slice(1).join(" ") : time;
}

function dateSortValue(date: string) {
  if (date === "Ohne Datum") return 999999;

  const parts = date.split(".");
  const day = Number(parts[0]);
  const month = Number(parts[1]);

  return month * 100 + day;
}

function timeSortValue(time: string) {
  const date = getDatePart(time);
  const clock = getTimePart(time).replace("Uhr", "").trim();
  const [hour, minute] = clock.split(":").map(Number);

  return dateSortValue(date) * 10000 + (hour || 0) * 100 + (minute || 0);
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(",", "").replace(/\s+/g, " ").trim();
}

function flipName(name: string) {
  const parts = normalizeName(name).split(" ");
  if (parts.length < 2) return normalizeName(name);
  return `${parts.slice(1).join(" ")} ${parts[0]}`;
}

function Schedule({ matches, players }: ScheduleProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [fallbackName, setFallbackName] = useState("");
  const [selectedDate, setSelectedDate] = useState("Alle");

  const visibleScheduleMatches = matches.filter(isVisibleMatch);

  const dates = Array.from(
    new Set(visibleScheduleMatches.map((match) => getDatePart(match.time)))
  ).sort((a, b) => dateSortValue(a) - dateSortValue(b));

  const filteredMatches =
    selectedDate === "Alle"
      ? visibleScheduleMatches
      : visibleScheduleMatches.filter((match) => getDatePart(match.time) === selectedDate);

  const times = Array.from(new Set(filteredMatches.map((match) => match.time))).sort(
    (a, b) => timeSortValue(a) - timeSortValue(b)
  );

  function openPlayer(name: string) {
    const wanted = normalizeName(name);
    const flipped = flipName(name);

    const player = players.find((item) => {
      const playerName = normalizeName(item.name);
      return playerName === wanted || playerName === flipped;
    });

    if (player) {
      setSelectedPlayer(player);
      setFallbackName("");
    } else {
      setSelectedPlayer(null);
      setFallbackName(name);
    }
  }

  function closeModal() {
    setSelectedPlayer(null);
    setFallbackName("");
  }

  return (
    <>
      <section className="pageHeader">
        <p>📅 SPIELPLAN</p>
        <h2>Spielplan</h2>
        <span>Wähle einen Turniertag aus</span>
      </section>

      <section className="competitionChips">
        <button
          type="button"
          className={selectedDate === "Alle" ? "active" : ""}
          onClick={() => setSelectedDate("Alle")}
        >
          Alle <span>{visibleScheduleMatches.length}</span>
        </button>

        {dates.map((date) => {
          const count = visibleScheduleMatches.filter(
            (match) => getDatePart(match.time) === date
          ).length;

          return (
            <button
              type="button"
              key={date}
              className={selectedDate === date ? "active" : ""}
              onClick={() => setSelectedDate(date)}
            >
              {date} <span>{count}</span>
            </button>
          );
        })}
      </section>

      <section className="scheduleGroups">
        {times.map((time) => {
          const matchesAtTime = filteredMatches
            .filter((match) => match.time === time)
            .sort((a, b) => a.court - b.court);

          return (
            <section className="scheduleGroup" key={time}>
              <div className="scheduleTimeLine">
                <span>{getTimePart(time)} Uhr</span>
              </div>

              <div className="scheduleGrid">
                {matchesAtTime.map((match) => (
                  <article
                    className={`scheduleCard ${
                      match.status === "live" ? "scheduleCardLive" : ""
                    }`}
                    key={`${match.time}-${match.court}-${match.a}-${match.b}`}
                  >
                    <div className="scheduleCardTop">
                      <b>Platz {match.court}</b>
                      <span>{match.competition}</span>
                    </div>

                    <div className="schedulePlayers">
                      <button type="button" onClick={() => openPlayer(match.a)}>
                        {match.a}
                      </button>

                      <small>gegen</small>

                      <button type="button" onClick={() => openPlayer(match.b)}>
                        {match.b}
                      </button>
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

      {(selectedPlayer || fallbackName) && (
        <div className="playerOverlay" onClick={closeModal}>
          <article className="playerModal" onClick={(event) => event.stopPropagation()}>
            <button className="modalClose" onClick={closeModal}>
              ×
            </button>

            <small>Spielerprofil</small>

            {selectedPlayer ? (
              <>
                <h2>{selectedPlayer.name}</h2>

                <div className="playerFacts">
                  <div>
                    <span>Verein</span>
                    <b>{selectedPlayer.club}</b>
                  </div>

                  <div>
                    <span>Konkurrenz</span>
                    <b>{selectedPlayer.competition}</b>
                  </div>

                  <div>
                    <span>LK</span>
                    <b>{selectedPlayer.lk}</b>
                  </div>

                  <div>
                    <span>Jahrgang</span>
                    <b>{selectedPlayer.year}</b>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2>{fallbackName}</h2>

                <div className="playerFacts">
                  <div>
                    <span>Hinweis</span>
                    <b>Dieser Spieler ist noch nicht in der Teilnehmerliste hinterlegt.</b>
                  </div>
                </div>
              </>
            )}
          </article>
        </div>
      )}
    </>
  );
}

export default Schedule;