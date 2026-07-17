import { useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { Draw, DrawRound } from "../../models/Draw";
import DrawMatchCard from "./DrawMatchCard";
import DrawScrollbar from "./DrawScrollbar";
import { FinalCard, ThirdPlaceCard, WinnerCard } from "./DrawSpecialCards";

type DrawBracketProps = {
  draw: Draw;
};

type RailStyle = CSSProperties & {
  "--max-round-count": number;
};

type MatchSlotStyle = CSSProperties & {
  "--match-position": string;
};

function getRoundClass(round: DrawRound) {
  if (round.name === "Finale") return "drawColumn drawFinalColumn";
  if (round.name === "Spiel um Platz 3") {
    return "drawColumn drawThirdColumn";
  }
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
  showConnector: boolean,
) {
  if (round.name === "Sieger") {
    return <WinnerCard match={match} />;
  }

  if (round.name === "Finale") {
    return <FinalCard match={match} />;
  }

  if (round.name === "Spiel um Platz 3") {
    return <ThirdPlaceCard match={match} />;
  }

  return <DrawMatchCard match={match} showConnector={showConnector} />;
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
              round.name !== "Sieger" &&
              round.name !== "Spiel um Platz 3",
          )
          .map((round) => round.matches.length),
      ),
    [draw.rounds],
  );

  const railStyle: RailStyle = {
    "--max-round-count": maxRoundCount,
  };

  return (
    <>
      <section className="drawStage" ref={scrollRef}>
        <div className="drawRail" style={railStyle}>
          {draw.rounds.map((round, roundIndex) => {
            const roundCount = Math.max(1, round.matches.length);
            const showConnector = round.name !== "Sieger";

            return (
              <section
                className={getRoundClass(round)}
                key={`${round.name}-${roundIndex}`}
              >
                <div className="drawColumnHead">
                  <b>{getRoundLabel(round)}</b>
                  <span>
                    {round.matches.length} Spiel
                    {round.matches.length === 1 ? "" : "e"}
                  </span>
                </div>

                <div className="drawColumnBody">
                  {round.matches.map((match, matchIndex) => {
                    const position =
                      ((matchIndex + 0.5) / roundCount) * 100;

                    const slotStyle: MatchSlotStyle = {
                      "--match-position": `${position}%`,
                    };

                    return (
                      <div
                        className="drawMatchSlot"
                        key={match.id}
                        style={slotStyle}
                      >
                        {renderMatch(round, match, showConnector)}
                      </div>
                    );
                  })}
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