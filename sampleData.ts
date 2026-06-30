* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f4f4f5;
  color: #171717;
  padding-bottom: 92px;
}

.hero {
  background: linear-gradient(180deg, #ffffff 0%, #fff6f6 100%);
  border-bottom: 4px solid #b50000;
  text-align: center;
  padding: 20px 16px 18px;
}

.logo {
  width: min(520px, 94vw);
  max-height: 170px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.live-pill {
  display: inline-flex;
  margin-top: 12px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #b50000;
  color: white;
  font-weight: 800;
  letter-spacing: .04em;
  box-shadow: 0 8px 20px rgba(181,0,0,.22);
}

.page {
  width: min(1040px, 100%);
  margin: 0 auto;
  padding: 18px 14px 28px;
}

.today {
  background: #171717;
  color: white;
  padding: 22px;
  border-radius: 24px;
  box-shadow: 0 18px 45px rgba(0,0,0,.18);
}

.today h1 {
  margin: 0 0 6px;
  font-size: clamp(1.7rem, 6vw, 3rem);
}

.today p {
  margin: 0;
  color: #e5e5e5;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 16px 0 24px;
}

.stat-card {
  background: white;
  border-radius: 22px;
  padding: 18px;
  display: flex;
  gap: 12px;
  align-items: center;
  box-shadow: 0 10px 26px rgba(0,0,0,.08);
}

.stat-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  background: #ffe7e7;
  color: #b50000;
  border-radius: 16px;
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 900;
}

.stat-label {
  color: #71717a;
  font-size: .88rem;
}

.section {
  margin: 24px 0;
}

.section-title {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title h2, .page h1 {
  margin: 0;
}

.section-title span {
  color: #71717a;
  font-size: .92rem;
}

.match-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.match-card {
  background: white;
  border-radius: 24px;
  padding: 18px;
  box-shadow: 0 12px 30px rgba(0,0,0,.08);
  border: 1px solid #ececec;
}

.match-card.live {
  border: 2px solid #1fb45b;
}

.match-card.done {
  opacity: .9;
}

.match-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.badge {
  background: #171717;
  color: white;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: .78rem;
  font-weight: 800;
}

.court {
  color: #b50000;
  font-weight: 900;
}

.match-time {
  font-size: 1.5rem;
  font-weight: 950;
  margin: 14px 0;
}

.players {
  display: grid;
  gap: 5px;
  font-size: 1.1rem;
}

.players span {
  color: #71717a;
  font-size: .86rem;
}

.status {
  margin-top: 14px;
  padding: 10px;
  border-radius: 14px;
  font-weight: 800;
}

.status.live {
  background: #e8f8ef;
  color: #11743a;
}

.status.done {
  background: #f3f3f3;
  color: #171717;
}

.note {
  margin-top: 10px;
  color: #b50000;
  font-size: .9rem;
  font-weight: 800;
}

.searchbar {
  margin: 14px 0 18px;
  background: white;
  color: #71717a;
  border-radius: 18px;
  padding: 14px 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  box-shadow: 0 10px 24px rgba(0,0,0,.07);
}

.player-list {
  display: grid;
  gap: 12px;
}

.player-card, .info-card {
  background: white;
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 10px 24px rgba(0,0,0,.07);
}

.player-card {
  display: grid;
  gap: 4px;
}

.player-card strong {
  font-size: 1.15rem;
}

.player-card span {
  color: #b50000;
  font-weight: 900;
}

.player-card small {
  color: #71717a;
}

.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  width: min(720px, calc(100% - 20px));
  background: rgba(23,23,23,.94);
  backdrop-filter: blur(18px);
  border-radius: 26px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  z-index: 10;
  box-shadow: 0 18px 45px rgba(0,0,0,.32);
}

.bottom-nav button {
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: #d4d4d8;
  font-size: .72rem;
  font-weight: 800;
  padding: 8px 4px;
  display: grid;
  place-items: center;
  gap: 3px;
}

.bottom-nav svg {
  width: 20px;
  height: 20px;
}

.bottom-nav button.active {
  background: #b50000;
  color: white;
}

@media (max-width: 520px) {
  .hero {
    padding-top: 12px;
  }
  .logo {
    max-height: 130px;
  }
  .stats {
    grid-template-columns: 1fr 1fr;
  }
  .stat-card {
    padding: 14px;
  }
}
