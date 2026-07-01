type DrawScrollbarProps = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

function DrawScrollbar({ scrollRef }: DrawScrollbarProps) {
  function scrollByRounds(direction: "left" | "right") {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  }

  return (
    <div className="drawFixedScroll">
      <button type="button" onClick={() => scrollByRounds("left")}>
        ◀
      </button>

      <div className="drawScrollHint">
        <span>Turnierbaum seitlich bewegen</span>
      </div>

      <button type="button" onClick={() => scrollByRounds("right")}>
        ▶
      </button>
    </div>
  );
}

export default DrawScrollbar;