import type { Player } from "../types";

type PlayerCardProps = {
  player: Player;
  onClubClick: (club: string) => void;
};

function PlayerCard({ player, onClubClick }: PlayerCardProps) {
  return (
    <article className="player">
      <b>{player.name}</b>
      <span>{player.competition}</span>
      <button onClick={() => onClubClick(player.club)}>{player.club}</button>
      <small>
        LK {player.lk} · Jahrgang {player.year}
      </small>
    </article>
  );
}

export default PlayerCard;