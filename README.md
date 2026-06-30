import type { Match } from '../types';

type Props = {
  match: Match;
};

export function MatchCard({ match }: Props) {
  return (
    <article className={`matchCard matchCard--${match.status}`}>
      <div className="matchHeader">
        <span className="competition">{match.competition}</span>
        <span className="court">Platz {match.court}</span>
      </div>

      <div className="matchMeta">
        <strong>{match.time}</strong>
        <span>{match.round}</span>
      </div>

      <div className="versus">
        <strong>{match.playerA}</strong>
        <span>gegen</span>
        <strong>{match.playerB}</strong>
      </div>

      {match.status === 'live' && (
        <div className="status statusLive">● Live seit {match.startedAt} Uhr</div>
      )}

      {match.status === 'done' && match.result && (
        <div className="status statusDone">Ergebnis: {match.result}</div>
      )}

      {match.note && <p className="note">{match.note}</p>}
    </article>
  );
}
