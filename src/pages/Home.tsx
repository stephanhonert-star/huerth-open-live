import { useMemo, useState } from "react";
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

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isPlaceholder(name: string) {
  const normalized = normalizeText(name);

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

function parseYear(value: string) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function parseLk(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatLk(value: number | null) {
  if (value === null) return "–";
  return value.toFixed(1).replace(".", ",");
}

function isGermanRankingPlayer(player: Player) {
  const ranking = player.ranking?.trim();

  if (!ranking) return false;

  return ranking !== "0" && ranking !== "-" && ranking.toLowerCase() !== "keine";
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
  const [selectedDate, setSelectedDate] = useState("Alle");
  const [showStatistics, setShowStatistics] = useState(false);

  const realLive = live.filter(isRealMatch);
  const realPlanned = planned.filter(isRealMatch);
  const realDone = done.filter(isRealMatch);
  const realMatches = allMatches.filter(isRealMatch);

  const centerCourtLive = realLive.find((match) => match.court === 1);

  const dates = Array.from(
    new Set(realPlanned.map((match) => getDatePart(match.time)))
  ).sort();

  const visiblePlanned =
    selectedDate === "Alle"
      ? realPlanned
      : realPlanned.filter(
          (match) => getDatePart(match.time) === selectedDate
        );

  const statistics = useMemo(() => {
    const validPlayers = players.filter((player) => player.name.trim() !== "");

    const clubCounts = new Map<string, number>();

    validPlayers.forEach((player) => {
      const club = player.club.trim();

      if (!club) return;

      clubCounts.set(club, (clubCounts.get(club) ?? 0) + 1);
    });

    const clubs = Array.from(clubCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    const topClub = clubs[0] ?? null;

    const years = validPlayers
      .map((player) => parseYear(player.year))
      .filter((year): year is number => year !== null);

    const youngestYear = years.length > 0 ? Math.max(...years) : null;
    const oldestYear = years.length > 0 ? Math.min(...years) : null;
    const currentYear = new Date().getFullYear();

    const lkValues = validPlayers
      .map((player) => parseLk(player.lk))
      .filter((lk): lk is number => lk !== null);

    const bestLk = lkValues.length > 0 ? Math.min(...lkValues) : null;
    const worstLk = lkValues.length > 0 ? Math.max(...lkValues) : null;

    const rankingPlayers = validPlayers.filter(isGermanRankingPlayer).length;

    const farthestPlayer = [...validPlayers]
      .filter(
        (player) =>
          typeof player.distanceKm === "number" &&
          Number.isFinite(player.distanceKm)
      )
      .sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0))[0];

    const competitions = tournamentStore.tournament.competitions;
    const estimatedMatches = Math.max(
      realMatches.length,
      Math.round(Math.max(0, validPlayers.length - competitions) * 1.5)
    );

    return {
      participantCount: validPlayers.length,
      competitionCount: competitions,
      clubCount: clubs.length,
      topClub,
      youngestYear,
      youngestAge:
        youngestYear === null ? null : Math.max(0, currentYear - youngestYear),
      oldestYear,
      oldestAge:
        oldestYear === null ? null : Math.max(0, currentYear - oldestYear),
      bestLk,
      worstLk,
      rankingPlayers,
      farthestClub: farthestPlayer?.club ?? "",
      farthestDistance: farthestPlayer?.distanceKm ?? null,
      estimatedMatches,
    };
  }, [players, realMatches.length]);

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
            <span>läuft seit {centerCourtLive.since || "kurzem"} Uhr</span>
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
        <p>HÜRTH OPEN IN ZAHLEN</p>
        <h2>📊 Turnierstatistik</h2>
      </section>

      <button
        type="button"
        onClick={() => setShowStatistics(true)}
        style={{
          width: "100%",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 26,
          padding: 22,
          background:
            "linear-gradient(135deg, rgba(184, 15, 47, 0.94), rgba(58, 12, 27, 0.96))",
          color: "white",
          textAlign: "left",
          cursor: "pointer",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.35)",
        }}
      >
        <span
          style={{
            display: "block",
            marginBottom: 8,
            color: "#ffd9e1",
            fontSize: 13,
            fontWeight: 950,
            letterSpacing: "0.12em",
          }}
        >
          ALLE ZAHLEN ZUM TURNIER
        </span>

        <strong
          style={{
            display: "block",
            fontSize: 28,
            lineHeight: 1.1,
          }}
        >
          {statistics.participantCount} Teilnehmer ·{" "}
          {statistics.clubCount} Vereine ·{" "}
          {statistics.estimatedMatches} Spiele
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 10,
            color: "#ffd9e1",
            fontWeight: 850,
          }}
        >
          Statistik öffnen →
        </span>
      </button>

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

      {showStatistics && (
        <div
          className="playerOverlay"
          onClick={() => setShowStatistics(false)}
        >
          <article
            className="playerModal"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(920px, calc(100vw - 28px))",
              maxHeight: "88vh",
              overflowY: "auto",
            }}
          >
            <button
              className="modalClose"
              type="button"
              onClick={() => setShowStatistics(false)}
            >
              ×
            </button>

            <small>DIE HÜRTH OPEN IN ZAHLEN</small>
            <h2>Turnierstatistik</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
                marginTop: 20,
              }}
            >
              {[
                ["👥", statistics.participantCount, "Teilnehmer"],
                ["🏆", statistics.competitionCount, "Konkurrenzen"],
                ["🏛️", statistics.clubCount, "Vereine"],
                ["🎾", statistics.estimatedMatches, "Spiele inkl. Nebenrunde"],
                ["🥇", formatLk(statistics.bestLk), "Beste LK"],
                ["🎯", formatLk(statistics.worstLk), "Schlechteste LK"],
                ["⭐", statistics.rankingPlayers, "Deutsche Rangliste"],
                [
                  "👶",
                  statistics.youngestYear === null
                    ? "–"
                    : `${statistics.youngestYear} · ${statistics.youngestAge} Jahre`,
                  "Jüngster Teilnehmer",
                ],
                [
                  "👴",
                  statistics.oldestYear === null
                    ? "–"
                    : `${statistics.oldestYear} · ${statistics.oldestAge} Jahre`,
                  "Ältester Teilnehmer",
                ],
              ].map(([icon, value, label]) => (
                <div
                  key={String(label)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{icon}</span>
                  <b
                    style={{
                      display: "block",
                      marginTop: 10,
                      color: "white",
                      fontSize: 24,
                      lineHeight: 1.15,
                    }}
                  >
                    {value}
                  </b>
                  <small
                    style={{
                      display: "block",
                      marginTop: 6,
                      color: "#a5a5a5",
                      fontWeight: 850,
                    }}
                  >
                    {label}
                  </small>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <span style={{ fontSize: 24 }}>🏅</span>
                <b
                  style={{
                    display: "block",
                    marginTop: 10,
                    color: "white",
                    fontSize: 20,
                  }}
                >
                  {statistics.topClub
                    ? statistics.topClub[0]
                    : "Noch keine Vereinsdaten"}
                </b>
                <small
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#a5a5a5",
                    fontWeight: 850,
                  }}
                >
                  Verein mit den meisten Meldungen
                  {statistics.topClub ? ` · ${statistics.topClub[1]}` : ""}
                </small>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <span style={{ fontSize: 24 }}>📍</span>
                <b
                  style={{
                    display: "block",
                    marginTop: 10,
                    color: "white",
                    fontSize: 20,
                  }}
                >
                  {statistics.farthestDistance === null
                    ? "Wird ergänzt"
                    : `${statistics.farthestClub} · ${Math.round(
                        statistics.farthestDistance
                      )} km`}
                </b>
                <small
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#a5a5a5",
                    fontWeight: 850,
                  }}
                >
                  Weiteste Anreise
                </small>
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}

export default Home;