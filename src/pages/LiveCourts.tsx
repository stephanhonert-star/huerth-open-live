import { tournamentStore } from "../store/tournamentStore";

type MatchLike = {
  court: number;
  status: string;
  time?: string;
  competition?: string;
  a?: string;
  b?: string;
  playerA?: string;
  playerB?: string;
  player1?: string;
  player2?: string;
};

function playerA(match: MatchLike) {
  return match.a ?? match.playerA ?? match.player1 ?? "Spieler 1";
}

function playerB(match: MatchLike) {
  return match.b ?? match.playerB ?? match.player2 ?? "Spieler 2";
}

function getTime(match: MatchLike) {
  return match.time ?? "";
}

export default function LiveCourts() {
  const courts = [1, 2, 3, 4, 5];

  return (
    <main className="page" id="live-courts">
      <h2>Platzbelegung</h2>
      <p>Wer spielt gerade und wer als Nächstes kommt</p>

      <div className="courtGrid">
        {courts.map((court) => {
          const currentMatch = (tournamentStore.matches as MatchLike[]).find(
            (match) => match.court === court && match.status === "live"
          );

          const nextMatch = (tournamentStore.matches as MatchLike[])
            .filter(
              (match) => match.court === court && match.status === "planned"
            )
            .sort((a, b) => getTime(a).localeCompare(getTime(b)))[0];

          return (
            <section className="courtCard" key={court}>
              <div className="courtHeader">
                <h3>Platz {court}</h3>
                {currentMatch ? (
                  <span className="liveBadge">JETZT</span>
                ) : (
                  <span className="liveBadge">FREI</span>
                )}
              </div>

              <div className="courtBlock">
                <small>Jetzt auf dem Platz</small>

                {currentMatch ? (
                  <>
                    <p className="competition">
                      {currentMatch.competition ?? "Konkurrenz"}
                    </p>

                    <div className="players">
                      <strong>{playerA(currentMatch)}</strong>
                      <span>vs.</span>
                      <strong>{playerB(currentMatch)}</strong>
                    </div>
                  </>
                ) : (
                  <p className="emptyCourt">Aktuell kein Spiel</p>
                )}
              </div>

              <div className="courtNext">
                <small>Als Nächstes</small>

                {nextMatch ? (
                  <>
                    <p className="competition">
                      {getTime(nextMatch)} · {nextMatch.competition ?? "Konkurrenz"}
                    </p>

                    <div className="players compact">
                      <strong>{playerA(nextMatch)}</strong>
                      <span>vs.</span>
                      <strong>{playerB(nextMatch)}</strong>
                    </div>
                  </>
                ) : (
                  <p className="emptyCourt">Kein weiteres Spiel geplant</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}