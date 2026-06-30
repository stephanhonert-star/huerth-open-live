import { useState } from "react";
import PdfImport from "./PdfImport";

const ADMIN_PASSWORD = "huerth2026";

function Admin() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      setUnlocked(true);
      setError("");
      return;
    }

    setError("Falsches Passwort");
  }

  if (!unlocked) {
    return (
      <>
        <section className="pageHeader">
          <p>⚙️ ADMIN</p>
          <h2>Turnierleitung</h2>
          <span>Geschützter Bereich für Import und Verwaltung</span>
        </section>

        <form className="adminLogin" onSubmit={login}>
          <b>Admin-Zugang</b>
          <span>Bitte Passwort eingeben.</span>

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && <em>{error}</em>}

          <button type="submit">Einloggen</button>
        </form>
      </>
    );
  }

  return (
    <>
      <section className="pageHeader">
        <p>⚙️ ADMIN</p>
        <h2>Turnierverwaltung</h2>
        <span>PDF-Import, Ergebnisse und Live-Steuerung</span>
      </section>

      <section className="adminGrid">
        <article>
          <b>PDF-Import</b>
          <span>nuLiga-Dateien vorbereiten</span>
        </article>

        <article>
          <b>Live-Ergebnisse</b>
          <span>kommt als nächstes</span>
        </article>

        <article>
          <b>News</b>
          <span>Hinweise für Besucher</span>
        </article>
      </section>

      <PdfImport />
    </>
  );
}

export default Admin;