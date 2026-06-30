import { useEffect, useState } from "react";

const tournamentStart = new Date("2026-07-18T10:00:00+02:00").getTime();
const tournamentEnd = new Date("2026-08-02T23:59:59+02:00").getTime();

function getRemaining() {
  const now = Date.now();
  const diff = tournamentStart - now;

  if (now >= tournamentEnd) return null;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, running: true };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    running: false,
  };
}

function Countdown() {
  const [time, setTime] = useState(getRemaining());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(getRemaining());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (time === null) {
    return (
      <section className="countdownBox">
        <p>🏆 HÜRTH OPEN 2026</p>
        <h2>Danke für ein großartiges Turnier</h2>
        <span>Wir sehen uns bei den nächsten Hürth Open.</span>
      </section>
    );
  }

  if (time.running) {
    return (
      <section className="countdownBox countdownLive">
        <p>🔴 TURNIER LÄUFT</p>
        <h2>Die 9. Hürth Open sind gestartet</h2>
        <span>18.07.2026 – 02.08.2026 · TC Rot-Weiß Hürth-Gleuel</span>
      </section>
    );
  }

  return (
    <section className="countdownBox">
      <p>⏳ NOCH BIS ZUM TURNIERSTART</p>
      <h2>18. Juli 2026 · 10:00 Uhr</h2>

      <div className="countdownGrid">
        <div>
          <b>{time.days}</b>
          <small>Tage</small>
        </div>
        <div>
          <b>{String(time.hours).padStart(2, "0")}</b>
          <small>Std.</small>
        </div>
        <div>
          <b>{String(time.minutes).padStart(2, "0")}</b>
          <small>Min.</small>
        </div>
        <div>
          <b>{String(time.seconds).padStart(2, "0")}</b>
          <small>Sek.</small>
        </div>
      </div>
    </section>
  );
}

export default Countdown;