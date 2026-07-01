import Countdown from "../components/Countdown";
import CourtOverview from "../components/CourtOverview";
import MatchCard from "../components/MatchCard";
import StatsCards from "../components/StatsCards";
import { tournamentStore } from "../store/tournamentStore";
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
  return (
    <>
      <Countdown />

      <section className="eventHero">
        <p>TOURNAMENT CENTER</p>
        <h1>{tournamentStore.tournament.name}</h1>
        <span>
          {tournamentStore.tournament.date} · {tournamentStore.tournament.club}
        </span>

        <div className="eventStats">
          <div>
            <b>{players.length}</b>
            <small>Teilnehmer</small>
          </div>
          <div>
            <b>{tournamentStore.tournament.competitions}</b>
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
          <span>🎾 Spielbetrieb</span>
          <span>🍔 Gastro geöffnet</span>
          <span>🎵 Turniersong online</span>
        </div>
      </section>

      <StatsCards
        liveCount={live.length}
        matchCount={allMatches.length}
        playerCount={players.length}
        onChangeTab={onChangeTab}
      />

      <CourtOverview matches={allMatches} />

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