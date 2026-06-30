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
      <section className="eventHero">
        <p>TOURNAMENT CENTER</p>
        <h1>9. Hürth Open</h1>
        <span>18.07.2026 – 02.08.2026 · TC Rot-Weiß Hürth-Gleuel</span>

        <div className="eventStats">
          <div>
            <b>163</b>
            <small>Teilnehmer</small>
          </div>
          <div>
            <b>10</b>
            <small>Konkurrenzen</small>
          </div>
          <div>
            <b>5 + 1</b>
            <small>Matchplätze</small>
          </div>
          <div>
            <b>16</b>
            <small>Turniertage</small>
          </div>
        </div>

        <div className="eventStatus">
          <span>🟢 Anlage geöffnet</span>
          <span>🎾 Livebetrieb</span>
          <span>🍔 Gastro geöffnet</span>
          <span>🎵 Turniersong online</span>
        </div>
      </section>

      <section className="liveCenter">
        <div>
          <p>🟢 LIVE-CENTER</p>
          <h2>{live.length} Spiele laufen gerade</h2>
          <span>Alle aktuellen Matches auf einen Blick</span>
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