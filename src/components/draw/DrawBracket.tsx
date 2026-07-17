import { useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { Draw, DrawRound } from "../../models/Draw";
import DrawMatchCard from "./DrawMatchCard";
import DrawScrollbar from "./DrawScrollbar";
import { FinalCard, ThirdPlaceCard, WinnerCard } from "./DrawSpecialCards";

type DrawBracketProps = {
  draw: Draw;
};

type RoundStyle = CSSProperties & {
  "--round-count": number;
  "--round-index": number;
  "--max-round-count": number;
};

function getRoundClass(round: DrawRound) {
  if (round.name === "Finale") return "drawColumn drawFinalColumn";
  if (round.name === "Spiel um Platz 3") return "drawColumn drawThirdColumn";
  if (round.name === "Sieger") return "drawColumn drawWinnerColumn";

  return "drawColumn";
}

function getRoundLabel(round: DrawRound) {
  if (round.name === "Finale") return "🏆 Finale";
  if (round.name === "Spiel um Platz 3") return "🥉 Spiel um Platz 3";
  if (round.name === "Sieger") return "🏆 Sieger";

  return round.name;
}

function renderMatch(
  round: DrawRound,
  match: DrawRound["matches"][number],
  isLastRound: boolean,
) {
  if (round.name === "Sieger") {
    return <WinnerCard key={match.id} match={match} />;
  }

  if (round.name === "Finale") {
    return <FinalCard key={match.id} match={match} />;
  }

  if (round.name === "Spiel um Platz 3") {
    return <ThirdPlaceCard key={match.id} match={match} />;
  }

  return (
    <DrawMatchCard
      key={match.id}
      match={match}
      showConnector={!isLastRound}
    />
  );
}

function DrawBracket({ draw }: DrawBracketProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const maxRoundCount = useMemo(
    () =>
      Math.max(
        1,
        ...draw.rounds
          .filter(
            (round) =>
              round.name !== "Sieger" && round.name !== "Spiel um Platz 3",
          )
          .map((round) => round.matches.length),
      ),
    [draw.rounds],
  );

  return (
    <>
      <section className="drawStage" ref={scrollRef}>
        <div
          className="drawRail"
          style={
            {
              "--max-round-count": maxRoundCount,
            } as CSSProperties
          }
        >
          {draw.rounds.map((round, index) => {
            const isLastRound = index === draw.rounds.length - 1;

            const roundStyle: RoundStyle = {
              "--round-count": Math.max(1, round.matches.length),
              "--round-index": index,
              "--max-round-count": maxRoundCount,
            };

            return (
              <section
                className={getRoundClass(round)}
                key={`${round.name}-${index}`}
                style={roundStyle}
              >
                <div className="drawColumnHead">
                  <b>{getRoundLabel(round)}</b>
                  <span>
                    {round.matches.length} Spiel
                    {round.matches.length === 1 ? "" : "e"}
                  </span>
                </div>

                <div className="drawColumnBody">
                  {round.matches.map((match) =>
                    renderMatch(round, match, isLastRound),
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <DrawScrollbar scrollRef={scrollRef} />
    </>
  );
}

export default DrawBracket;