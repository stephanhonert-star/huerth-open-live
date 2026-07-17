import { useMemo } from "react";
import type { Match, Player } from "../types";
import "../styles/statistics.css";

type StatisticsProps = {
  players: Player[];
  matches: Match[];
};

const COMPETITION_COUNT = 10;
const GERMAN_RANKING_PLAYERS = 14;
const FARTHEST_CLUB = "TC Unna 1902 Grün-Weiß";
const FARTHEST_DISTANCE_KM = 110;

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

function normalizeName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isPlaceholder(value: string) {
  const name = normalizeName(value);

  return (
    !name ||
    name === "offen" ||
    name.includes("sieger") ||
    name.includes("verlierer") ||
    name.includes("finalist") ||
    name.includes("turniersieger") ||
    name.includes("freilos")
  );
}

function isRealMatch(match: Match) {
  return !isPlaceholder(match.a) && !isPlaceholder(match.b);
}

function cleanClubName(club: string) {
  return club
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function Statistics({ players, matches }: StatisticsProps) {
  const stats = useMemo(() => {
    const validPlayers = players.filter((player) => player.name.trim());

    const clubCounts = new Map<string, number>();

    validPlayers.forEach((player) => {
      const club = cleanClubName(player.club);

      if (!club) return;

      clubCounts.set(club, (clubCounts.get(club) ?? 0) + 1);
    });

    const sortedClubs = Array.from(clubCounts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], "de");
    });

    const years = validPlayers
      .map((player) => parseYear(player.year))
      .filter((year): year is number => year !== null);

    const lkValues = validPlayers
      .map((player) => parseLk(player.lk))
      .filter((lk): lk is number => lk !== null);

    const currentYear = new Date().getFullYear();
    const youngestYear = years.length ? Math.max(...years) : null;
    const oldestYear = years.length ? Math.min(...years) : null;

    const importedMatchCount = matches.filter(isRealMatch).length;
    const estimatedMatchCount = Math.round(
      Math.max(0, validPlayers.length - COMPETITION_COUNT) * 1.5
    );

    return {
      participants: validPlayers.length,
      clubs: sortedClubs.length,
      matches: Math.max(importedMatchCount, estimatedMatchCount),
      bestLk: lkValues.length ? Math.min(...lkValues) : null,
      worstLk: lkValues.length ? Math.max(...lkValues) : null,
      youngestYear,
      youngestAge:
        youngestYear === null ? null : Math.max(0, currentYear - youngestYear),
      oldestYear,
      oldestAge:
        oldestYear === null ? null : Math.max(0, currentYear - oldestYear),
      topClub: sortedClubs[0] ?? null,
    };
  }, [players, matches]);

  return (
    <section className="statisticsPage">
      <header className="statisticsHeader">
        <p>📊 HÜRTH OPEN IN ZAHLEN</p>
        <h2>Turnierstatistik</h2>
        <span>Zahlen und Fakten zum Teilnehmerfeld</span>
      </header>

      <div className="statisticsHighlights">
        <article className="statisticsHighlight">
          <span className="statisticsIcon">👥</span>
          <strong>{stats.participants}</strong>
          <small>Teilnehmer</small>
        </article>

        <article className="statisticsHighlight">
          <span className="statisticsIcon">🏛️</span>
          <strong>{stats.clubs}</strong>
          <small>Vereine</small>
        </article>

        <article className="statisticsHighlight">
          <span className="statisticsIcon">🎾</span>
          <strong>{stats.matches}</strong>
          <small>Spiele</small>
        </article>

        <article className="statisticsHighlight">
          <span className="statisticsIcon">⭐</span>
          <strong>{GERMAN_RANKING_PLAYERS}</strong>
          <small>DR-Spieler</small>
        </article>
      </div>

      <div className="statisticsGrid">
        <article className="statisticsCard">
          <span className="statisticsIcon">🏆</span>
          <strong>{COMPETITION_COUNT}</strong>
          <small>Konkurrenzen</small>
        </article>

        <article className="statisticsCard">
          <span className="statisticsIcon">🥇</span>
          <strong>{formatLk(stats.bestLk)}</strong>
          <small>Beste LK</small>
        </article>

        <article className="statisticsCard">
          <span className="statisticsIcon">🎯</span>
          <strong>{formatLk(stats.worstLk)}</strong>
          <small>Schlechteste LK</small>
        </article>

        <article className="statisticsCard">
          <span className="statisticsIcon">👶</span>
          <strong>
            {stats.youngestAge === null ? "–" : `${stats.youngestAge} Jahre`}
          </strong>
          <small>
            {stats.youngestYear === null
              ? "Jüngster Teilnehmer"
              : `Jahrgang ${stats.youngestYear}`}
          </small>
        </article>

        <article className="statisticsCard">
          <span className="statisticsIcon">👴</span>
          <strong>
            {stats.oldestAge === null ? "–" : `${stats.oldestAge} Jahre`}
          </strong>
          <small>
            {stats.oldestYear === null
              ? "Ältester Teilnehmer"
              : `Jahrgang ${stats.oldestYear}`}
          </small>
        </article>

        <article className="statisticsCard">
          <span className="statisticsIcon">🏅</span>
          <strong title={stats.topClub?.[0] ?? ""}>
            {stats.topClub?.[0] ?? "–"}
          </strong>
          <small>
            {stats.topClub
              ? `${stats.topClub[1]} Meldungen · stärkster Verein`
              : "Verein mit den meisten Meldungen"}
          </small>
        </article>

        <article className="statisticsCard">
          <span className="statisticsIcon">📍</span>
          <strong>{FARTHEST_DISTANCE_KM} km</strong>
          <small>{FARTHEST_CLUB} · weiteste Anreise</small>
        </article>
      </div>
    </section>
  );
}

export default Statistics;