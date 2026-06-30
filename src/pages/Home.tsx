import MatchCard from "../components/MatchCard";
import StatsCards from "../components/StatsCards";
import type { Match, Player, Tab } from "../types";

type HomeProps = {
  live: Match[];
  planned: Match[];
  allMatches: Match[];
  done: Match[];
  players: Player[];
  onChangeTab: (tab: Tab) => void;
};

function Home({ live, planned, allMatches, done, players, onChangeTab }: HomeProps) {
  const nextMatch = planned[0];

  return (
    <>
      <section className="liveCenter premiumHero">
        <div>
          <p>🟢 LIVE-CENTER</p>
          <h2>Heute bei den Hürth Open</h2>
          <span>Sonntag, 13.07.2025 · TC Rot-Weiß Hürth-Gleuel</span>
        </div>

        {nextMatch && (
          <aside>
            <small>Nächstes Match</small>
            <strong>{nextMatch.time} Uhr</strong>
            <span>
              Platz {nextMatch.court} · {nextMatch.competition}
            </span>
          </aside>
        )}
      </section>

      <StatsCards
        liveCount={live.length}
        matchCount={allMatches.length}
        resultCount={done.length}
        playerCount={players.length}
        onChangeTab={onChangeTab}
      />

      <section className="sectionTitle">
        <p>JETZT AUF DER ANLAGE</p>
        <h2>🟢 Live-Spiele</h2>
      </section>

      <section className="liveGrid">
        {live.map((match) => (
          <MatchCard key={`${match.time}-${match.court}-${match.a}`} match={match} />
        ))}
      </section>

      <section className="sectionTitle">
        <p>GLEICH GEHT ES WEITER</p>
        <h2>⏭️ Als Nächstes</h2>
      </section>

      <section className="cards">
        {planned.map((match) => (
          <MatchCard key={`${match.time}-${match.court}-${match.a}`} match={match} />
        ))}
      </section>

      <section className="sectionTitle">
        <p>BEREITS BEENDET</p>
        <h2>🏆 Letzte Ergebnisse</h2>
      </section>

      <section className="cards">
        {done.map((match) => (
          <MatchCard key={`${match.time}-${match.court}-${match.a}`} match={match} />
        ))}
      </section>
    </>
  );
}

export default Home;