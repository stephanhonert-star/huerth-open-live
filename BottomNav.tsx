* {
  box-sizing: border-box;
}

:root {
  --red: #b80f2f;
  --red-dark: #8f0b23;
  --black: #151515;
  --muted: #70717a;
  --bg: #f5f5f7;
  --card: #ffffff;
  --green: #17a34a;
  --shadow: 0 16px 42px rgba(15, 15, 20, 0.12);
}

body {
  margin: 0;
  min-height: 100vh;
  padding-bottom: 96px;
  background: radial-gradient(circle at top, #ffffff 0%, var(--bg) 45%, #ededf0 100%);
  color: var(--black);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button {
  font: inherit;
}

.hero {
  position: relative;
  padding: 18px 14px 16px;
  text-align: center;
  background: linear-gradient(180deg, #fff 0%, #fff7f9 100%);
  border-bottom: 4px solid var(--red);
}

.heroLogo {
  display: block;
  width: min(560px, 96vw);
  max-height: 180px;
  object-fit: contain;
  margin: 0 auto;
}

.heroBadge {
  display: inline-flex;
  margin-top: 10px;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--red);
  color: #fff;
  font-weight: 950;
  letter-spacing: 0.08em;
  box-shadow: 0 10px 25px rgba(184, 15, 47, 0.25);
}

.page {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 18px 14px 32px;
}

.introCard,
.infoCard {
  border-radius: 28px;
  padding: 24px;
  background: linear-gradient(135deg, #151515, #2b1218);
  color: #fff;
  box-shadow: var(--shadow);
}

.eyebrow {
  margin: 0 0 8px;
  color: #ffd6de;
  font-size: 0.9rem;
  font-weight: 750;
}

.introCard h1,
.pageHeader h1 {
  margin: 0;
  font-size: clamp(2rem, 8vw, 4rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
}

.introCard p:last-child,
.pageHeader p {
  margin: 12px 0 0;
  color: #e8e8ea;
  max-width: 680px;
}

.pageHeader {
  margin-bottom: 18px;
  border-radius: 26px;
  padding: 22px;
  background: #151515;
  color: #fff;
  box-shadow: var(--shadow);
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin: 16px 0;
}

.statCard {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 92px;
  padding: 16px;
  border-radius: 24px;
  background: var(--card);
  box-shadow: var(--shadow);
}

.statIcon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  color: var(--red);
  background: #ffe8ee;
  border-radius: 18px;
}

.statCard strong {
  display: block;
  font-size: 1.15rem;
  font-weight: 950;
}

.statCard span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.searchCard {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 26px;
  padding: 18px 20px;
  border: 1px solid rgba(20,20,25,0.08);
  border-radius: 24px;
  background: #fff;
  color: var(--muted);
  box-shadow: var(--shadow);
  font-weight: 800;
}

.section {
  margin: 26px 0;
}

.sectionTitle {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.sectionTitle h2 {
  margin: 0;
  font-size: 1.7rem;
  letter-spacing: -0.04em;
}

.sectionTitle span {
  color: var(--muted);
  font-weight: 750;
}

.cardGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 14px;
}

.matchCard {
  position: relative;
  overflow: hidden;
  padding: 18px;
  border: 1px solid rgba(20,20,25,0.08);
  border-radius: 26px;
  background: #fff;
  box-shadow: var(--shadow);
}

.matchCard--live {
  border: 2px solid rgba(23, 163, 74, 0.55);
}

.matchCard--live::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: var(--green);
}

.matchCard--done {
  background: #fafafa;
}

.matchHeader,
.matchMeta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.competition {
  display: inline-flex;
  padding: 6px 11px;
  border-radius: 999px;
  background: #151515;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 950;
}

.court {
  color: var(--red);
  font-weight: 950;
}

.matchMeta strong {
  font-size: 1.4rem;
  letter-spacing: -0.04em;
}

.matchMeta span {
  color: var(--muted);
  font-weight: 750;
}

.versus {
  display: grid;
  gap: 4px;
  margin: 14px 0;
  font-size: 1.14rem;
}

.versus span {
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 750;
}

.status {
  margin-top: 14px;
  padding: 11px 13px;
  border-radius: 16px;
  font-weight: 900;
}

.statusLive {
  background: #e8f8ee;
  color: #107438;
}

.statusDone {
  background: #efeff2;
  color: #151515;
}

.note {
  margin: 10px 0 0;
  color: var(--red);
  font-weight: 800;
}

.clubChips {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 2px 14px;
  margin-bottom: 8px;
}

.clubChips button,
.playerCard button {
  border: 0;
  cursor: pointer;
  color: var(--red);
  background: #ffe8ee;
  font-weight: 900;
}

.clubChips button {
  white-space: nowrap;
  padding: 10px 14px;
  border-radius: 999px;
}

.clubChips button.active {
  background: var(--red);
  color: #fff;
}

.playerList {
  display: grid;
  gap: 12px;
}

.playerCard {
  display: grid;
  gap: 5px;
  padding: 18px;
  border-radius: 24px;
  background: #fff;
  box-shadow: var(--shadow);
}

.playerCard strong {
  font-size: 1.16rem;
}

.playerCard span {
  color: var(--red);
  font-weight: 950;
}

.playerCard button {
  width: fit-content;
  padding: 7px 10px;
  border-radius: 999px;
}

.playerCard small {
  color: var(--muted);
  font-weight: 750;
}

.infoGrid {
  display: grid;
  gap: 14px;
}

.infoCard {
  background: #fff;
  color: var(--black);
}

.infoCard h2 {
  margin: 0 0 8px;
}

.infoCard p {
  margin: 0;
  color: var(--muted);
  font-weight: 750;
}

.bottomNav {
  position: fixed;
  left: 50%;
  bottom: 14px;
  z-index: 100;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  width: min(760px, calc(100% - 18px));
  padding: 8px;
  border-radius: 28px;
  background: rgba(21, 21, 21, 0.94);
  box-shadow: 0 24px 55px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
}

.bottomNav button {
  display: grid;
  place-items: center;
  gap: 3px;
  min-height: 58px;
  border: 0;
  border-radius: 20px;
  color: #d8d8dc;
  background: transparent;
  font-size: 0.72rem;
  font-weight: 850;
  cursor: pointer;
}

.bottomNav button.active {
  color: #fff;
  background: var(--red);
}

@media (max-width: 760px) {
  .heroLogo {
    max-height: 142px;
  }

  .statsGrid {
    grid-template-columns: repeat(2, 1fr);
  }

  .statCard {
    min-height: 86px;
    padding: 14px;
  }

  .statIcon {
    width: 42px;
    height: 42px;
  }

  .sectionTitle {
    align-items: start;
    flex-direction: column;
  }
}

@media (max-width: 420px) {
  .page {
    padding-inline: 10px;
  }

  .hero {
    padding-inline: 8px;
  }

  .heroLogo {
    max-height: 126px;
  }

  .introCard,
  .pageHeader {
    padding: 20px;
    border-radius: 24px;
  }
}
