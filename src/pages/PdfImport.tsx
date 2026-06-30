import { FileUp } from "lucide-react";

function PdfImport() {
  return (
    <>
      <section className="pageHeader">
        <p>📄 PDF-IMPORT</p>
        <h2>nuLiga Import</h2>
        <span>Vorbereitet für Spielplan, Teilnehmer und Turnierbaum</span>
      </section>

      <section className="pdfImportBox">
        <FileUp size={44} />

        <h3>PDF hier ablegen</h3>

        <p>
          Später kannst du hier eine nuLiga-PDF hineinziehen. Die App liest daraus automatisch
          Teilnehmer, Spiele, Konkurrenzen und Ergebnisse.
        </p>

        <label className="pdfButton">
          PDF auswählen
          <input type="file" accept="application/pdf" />
        </label>
      </section>

      <section className="importRoadmap">
        <article>
          <b>1</b>
          <span>PDF hochladen</span>
        </article>

        <article>
          <b>2</b>
          <span>Daten erkennen</span>
        </article>

        <article>
          <b>3</b>
          <span>Spielplan erstellen</span>
        </article>

        <article>
          <b>4</b>
          <span>App aktualisieren</span>
        </article>
      </section>
    </>
  );
}

export default PdfImport;