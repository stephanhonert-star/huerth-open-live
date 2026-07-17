import { useMemo } from "react";
import { tournamentStore } from "../store/tournamentStore";
import type { Match, Player } from "../types";

type StatisticsProps = {
  players: Player[];
  matches: Match[];
};

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

function isRankingPlayer(player: Player) {
  const ranking = player.ranking?.trim().toLowerCase();

  return Boolean(
    ranking &&
      ranking !== "0" &&
      ranking !== "-" &&
      ranking !== "keine"
  );
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function isPlaceholder(name: string) {
  const normalized = normalizeName(name);

  return (
    normalized === "" ||
    normalized === "offen" ||
    normalized.includes("sieger") ||
    normalized.includes("verlierer") ||
    normalized.includes("finalist") ||
    normalized.includes("turniersieger")
  );
}

function isRealMatch(match: Match) {
  return !isPlaceholder(match.a) && !isPlaceholder(match.b);
}

function Statistics({ players, matches }: StatisticsProps) {
  const statistics = useMemo(() => {
    const validPlayers = players.filter((player) => player.name.trim() !== "");

    const clubCounts = new Map<string, number>();

    validPlayers.forEach((player) => {
      const club = player.club.trim();

      if (!club) return;

      clubCounts.set(club, (clubCounts.get(club) ?? 0) + 1);
    });

    const sortedClubs = Array.from(clubCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    const topClub = sortedClubs[0] ?? null;

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

    const rankingPlayers = validPlayers.filter(isRankingPlayer).length;

    const farthestPlayer = [...validPlayers]
      .filter(
        (player) =>
          typeof player.distanceKm === "number" &&
          Number.isFinite(player.distanceKm)
      )
      .sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0))[0];

    const realImportedMatches = matches.filter(isRealMatch).length;
    const competitionCount = tournamentStore.tournament.competitions;

    const estimatedMatches = Math.max(
      realImportedMatches,
      Math.round(Math.max(0, validPlayers.length - competitionCount) * 1.5)
    );

    return {
      participants: validPlayers.length,
      competitions: competitionCount,
      clubs: sortedClubs.length,
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
      matches: estimatedMatches,
    };
  }, [players, matches]);

  const mainStats = [
    {
      icon: "👥",
      value: statistics.participants,
      label: "Teilnehmer",
    },
    {
      icon: "🏛️",
      value: statistics.clubs,
      label: "Vereine",
    },
    {
      icon: "🎾",
      value: statistics.matches,
      label: "Spiele",
    },
    {
      icon: "⭐",
      value: statistics.rankingPlayers,
      label: "Deutsche Rangliste",
    },
  ];

  const detailStats = [
    {
      icon: "🏆",
      value: statistics.competitions,
      label: "Konkurrenzen",
    },
    {
      icon: "🥇",
      value: formatLk(statistics.bestLk),
      label: "Beste LK",
    },
    {
      icon: "🎯",
      value: formatLk(statistics.worstLk),
      label: "Schlechteste LK",
    },
    {
      icon: "👶",
      value:
        statistics.youngestYear === null
          ? "–"
          : `${statistics.youngestYear} · ${statistics.youngestAge} Jahre`,
      label: "Jüngster Teilnehmer",
    },
    {
      icon: "👴",
      value:
        statistics.oldestYear === null
          ? "–"
          : `${statistics.oldestYear} · ${statistics.oldestAge} Jahre`,
      label: "Ältester Teilnehmer",
    },
  ];

  return (
    <>
      <section className="pageHeader">
        <p>📊 HÜRTH OPEN IN ZAHLEN</p>
        <h2>Turnierstatistik</h2>
        <span>Zahlen und Fakten zum Teilnehmerfeld</span>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {mainStats.map((stat) => (
          <article
            key={stat.label}
            style={{
              background:
                "linear-gradient(135deg, rgba(184, 15, 47, 0.94), rgba(55, 13, 26, 0.96))",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 18px 42px rgba(0, 0, 0, 0.35)",
            }}
          >
            <span style={{ fontSize: 28 }}>{stat.icon}</span>

            <b
              style={{
                display: "block",
                marginTop: 12,
                color: "white",
                fontSize: 36,
                lineHeight: 1,
              }}
            >
              {stat.value}
            </b>

            <small
              style={{
                display: "block",
                marginTop: 8,
                color: "#ffd9e1",
                fontWeight: 900,
              }}
            >
              {stat.label}
            </small>
          </article>
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {detailStats.map((stat) => (
          <article
            key={stat.label}
            style={{
              background: "rgba(20, 20, 20, 0.96)",
              border: "1px solid #2b2b2b",
              borderRadius: 22,
              padding: 18,
              boxShadow: "0 14px 36px rgba(0, 0, 0, 0.35)",
            }}
          >
            <span style={{ fontSize: 25 }}>{stat.icon}</span>

            <b
              style={{
                display: "block",
                marginTop: 10,
                color: "white",
                fontSize: 24,
                lineHeight: 1.15,
              }}
            >
              {stat.value}
            </b>

            <small
              style={{
                display: "block",
                marginTop: 7,
                color: "#a5a5a5",
                fontWeight: 900,
              }}
            >
              {stat.label}
            </small>
          </article>
        ))}

        <article
          style={{
            background: "rgba(20, 20, 20, 0.96)",
            border: "1px solid #2b2b2b",
            borderRadius: 22,
            padding: 18,
            boxShadow: "0 14px 36px rgba(0, 0, 0, 0.35)",
          }}
        >
          <span style={{ fontSize: 25 }}>🏅</span>

          <b
            style={{
              display: "block",
              marginTop: 10,
              color: "white",
              fontSize: 21,
              lineHeight: 1.2,
            }}
          >
            {statistics.topClub
              ? statistics.topClub[0]
              : "Noch keine Vereinsdaten"}
          </b>

          <small
            style={{
              display: "block",
              marginTop: 7,
              color: "#a5a5a5",
              fontWeight: 900,
            }}
          >
            Verein mit den meisten Meldungen
            {statistics.topClub ? ` · ${statistics.topClub[1]}` : ""}
          </small>
        </article>

        <article
          style={{
            background: "rgba(20, 20, 20, 0.96)",
            border: "1px solid #2b2b2b",
            borderRadius: 22,
            padding: 18,
            boxShadow: "0 14px 36px rgba(0, 0, 0, 0.35)",
          }}
        >
          <span style={{ fontSize: 25 }}>📍</span>

          <b
            style={{
              display: "block",
              marginTop: 10,
              color: "white",
              fontSize: 21,
              lineHeight: 1.2,
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
              marginTop: 7,
              color: "#a5a5a5",
              fontWeight: 900,
            }}
          >
            Weiteste Anreise
          </small>
        </article>
      </section>
    </>
  );
}

export default Statistics;