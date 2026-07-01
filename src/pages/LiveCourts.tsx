import { tournamentStore } from "../store/tournamentStore";

export default function LiveCourts() {
  const courts = [1, 2, 3, 4, 5];

  return (
    <main className="page" id="live-courts">
      <h2>Live-Courts</h2>
      <p>Aktuelle Spiele auf den Plätzen</p>

      <div className="courtGrid">
        {courts.map((court) => {
          const match: any = tournamentStore.matches.find(
            (match: any) => match.court === court && match.status === "live"
          );

          return (
            <section className="courtCard" key={court}>
              <div className="courtHeader">
                <h3>Platz {court}</h3>
                {match && <span className="liveBadge">LIVE</span>}
              </div>

              {match ? (
                <>
                  <p className="competition">
                    {match.competition ?? "Konkurrenz"}
                  </p>

                  <div className="players">
                    <strong>{match.player1 ?? match.playerA ?? "Spieler 1"}</strong>
                    <span>vs.</span>
                    <strong>{match.player2 ?? match.playerB ?? "Spieler 2"}</strong>
                  </div>

                  <div className="scoreBox">
                    <span>{match.score ?? "läuft"}</span>
                  </div>
                </>
              ) : (
                <p className="emptyCourt">Aktuell kein Live-Match</p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}