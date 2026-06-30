import React from 'react';
import { createRoot } from 'react-dom/client';
import { Search, Radio, CalendarDays, Trophy, Users } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { MatchCard } from './components/MatchCard';
import { clubs, matches, players } from './data/sampleData';
import './styles.css';

export type Tab = 'home' | 'plan' | 'players' | 'results' | 'info';

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="statCard">
      <div className="statIcon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function HomePage() {
  const liveMatches = matches.filter(match => match.status === 'live');
  const doneMatches = matches.filter(match => match.status === 'done');

  return (
    <main className="page">
      <section className="introCard">
        <p className="eyebrow">Sonntag, 13.07.2025 · TC Rot-Weiß Hürth-Gleuel</p>
        <h1>Heute auf der Anlage</h1>
        <p>Die schnellste Übersicht für Zuschauer: Live-Spiele, Tagesplan, Ergebnisse und Teilnehmer.</p>
      </section>

      <section className="statsGrid">
        <StatCard label="Live" value={`${liveMatches.length} Spiele`} icon={<Radio />} />
        <StatCard label="Heute geplant" value={`${matches.length} Spiele`} icon={<CalendarDays />} />
        <StatCard label="Beendet" value={`${doneMatches.length} Ergebnisse`} icon={<Trophy />} />
        <StatCard label="Teilnehmer" value={`${players.length} Spieler`} icon={<Users />} />
      </section>

      <section className="searchCard">
        <Search size={22} />
        <span>Spieler oder Verein suchen</span>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>Live</h2>
          <span>{liveMatches.length} Spiele laufen</span>
        </div>
        <div className="cardGrid">
          {liveMatches.map(match => <MatchCard key={match.id} match={match} />)}
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>Als Nächstes</h2>
          <span>geplante Spiele</span>
        </div>
        <div className="cardGrid">
          {matches.filter(match => match.status === 'planned').map(match => <MatchCard key={match.id} match={match} />)}
        </div>
      </section>
    </main>
  );
}

function PlanPage() {
  return (
    <main className="page">
      <div className="pageHeader">
        <h1>Spielplan</h1>
        <p>Ansicht nach Uhrzeit. Die Platzansicht ergänzen wir im nächsten Sprint.</p>
      </div>
      <div className="cardGrid">
        {matches.map(match => <MatchCard key={match.id} match={match} />)}
      </div>
    </main>
  );
}

function PlayersPage() {
  const [selectedClub, setSelectedClub] = React.useState<string | null>(null);
  const shownPlayers = selectedClub ? players.filter(player => player.club === selectedClub) : players;

  return (
    <main className="page">
      <div className="pageHeader">
        <h1>Teilnehmer</h1>
        <p>Klicke auf einen Verein, um alle Spieler dieses Vereins zu sehen.</p>
      </div>

      <div className="clubChips">
        <button className={!selectedClub ? 'active' : ''} onClick={() => setSelectedClub(null)} type="button">
          Alle
        </button>
        {clubs.map(club => (
          <button
            key={club}
            className={selectedClub === club ? 'active' : ''}
            onClick={() => setSelectedClub(club)}
            type="button"
          >
            {club}
          </button>
        ))}
      </div>

      <div className="playerList">
        {shownPlayers.map(player => (
          <article className="playerCard" key={player.id}>
            <strong>{player.name}</strong>
            <span>{player.competition}</span>
            <button type="button" onClick={() => setSelectedClub(player.club)}>{player.club}</button>
            <small>LK {player.lk} · Jahrgang {player.year}</small>
          </article>
        ))}
      </div>
    </main>
  );
}

function ResultsPage() {
  return (
    <main className="page">
      <div className="pageHeader">
        <h1>Ergebnisse</h1>
        <p>Alle beendeten Spiele des Tages.</p>
      </div>
      <div className="cardGrid">
        {matches.filter(match => match.status === 'done').map(match => <MatchCard key={match.id} match={match} />)}
      </div>
    </main>
  );
}

function InfoPage() {
  return (
    <main className="page">
      <div className="pageHeader">
        <h1>Info</h1>
        <p>Alle wichtigen Infos für Zuschauer.</p>
      </div>
      <section className="infoGrid">
        <article className="infoCard">
          <h2>Anlage</h2>
          <p>TC Rot-Weiß Hürth-Gleuel</p>
        </article>
        <article className="infoCard">
          <h2>Version</h2>
          <p>Version 0.1 · Zuschauer-Dashboard und Teilnehmer mit Vereinsfilter.</p>
        </article>
      </section>
    </main>
  );
}

function App() {
  const [activeTab, setActiveTab] = React.useState<Tab>('home');

  return (
    <>
      <Header />
      {activeTab === 'home' && <HomePage />}
      {activeTab === 'plan' && <PlanPage />}
      {activeTab === 'players' && <PlayersPage />}
      {activeTab === 'results' && <ResultsPage />}
      {activeTab === 'info' && <InfoPage />}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
