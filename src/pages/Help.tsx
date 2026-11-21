import type { Content } from "../types";

export function Help({ content }: { content: Content }) {
  const modules = content.topics.length;
  const areas = content.categories.length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Jak to funguje</h2>
          <p>
            Tohle je funkční proof of concept nad reálnými podklady Vema. Cílem je ověřit, že
            z jedné knihovny obsahu dokážeme sestavit prezentaci i namluvené video a že se to dá
            provozovat bez složité instalace u obchodníka.
          </p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 18 }}>
        <Metric value={String(modules)} label="modulů v knihovně" />
        <Metric value={String(areas)} label="oblastí na kole" />
        <Metric value="4" label="segmenty a reference" />
        <Metric value="2" label="výstupy: PPTX + MP4" />
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="s-eyebrow" style={{ fontSize: 10 }}>Co je hotové</div>
          <h3 style={{ margin: "8px 0 10px" }}>Funkce, které si můžete vyzkoušet</h3>
          <ul className="small" style={{ lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
            <li>Kolo oblastí – kliknutím vyberete celou skupinu modulů.</li>
            <li>Knihovna {modules} modulů včetně ODZ a JMHZ, s texty a komentáři pro voice-over.</li>
            <li>Souhrnná obrazovka s rozsahem nabídky.</li>
            <li>Přihlášení se dvěma rolemi: obchodník (sestavení a export) a administrátor (úpravy obsahu).</li>
            <li>Pevné bloky Vema: titul, o společnosti, reference, kontakt, další kroky.</li>
            <li>Reference jako originální slidy s logy zákazníků podle segmentu.</li>
            <li>Označení „Neveřejné“ na každém slidu.</li>
            <li>Export plně editovatelného PPTX (16:9) přes PptxGenJS.</li>
            <li>Export MP4 s českým namluveným komentářem (Edge TTS + LibreOffice + FFmpeg).</li>
            <li>Přidání nového modulu je jen nový záznam v knihovně – kolo i prezentace se přizpůsobí.</li>
          </ul>
        </div>

        <div className="card card-pad">
          <div className="s-eyebrow" style={{ fontSize: 10 }}>Technologie</div>
          <h3 style={{ margin: "8px 0 10px" }}>Co je pod kapotou</h3>
          <div className="stack" style={{ gap: 8 }}>
            <TechRow k="Frontend" v="React + TypeScript + Vite" />
            <TechRow k="Backend" v="Node.js + Express" />
            <TechRow k="PPTX" v="PptxGenJS (stejná data jako náhled)" />
            <TechRow k="Kolo" v="SVG generované sdílenou funkcí (náhled = export)" />
            <TechRow k="Voice-over" v="Microsoft Edge TTS – cs-CZ-VlastaNeural / Antonín" />
            <TechRow k="Video" v="LibreOffice headless → PDF → PNG → FFmpeg" />
            <TechRow k="Data" v="JSON soubor; volitelně perzistentní disk" />
          </div>
          <div className="tip" style={{ marginTop: 14 }}>
            <b>Proč ne AI na obsah:</b> obchodní nabídka musí obsahovat schválené informace.
            AI používáme jen na převod hotového textu na hlas, ne na vymýšlení obsahu.
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="s-eyebrow" style={{ fontSize: 10 }}>Ceny a nabídka</div>
        <h3 style={{ margin: "8px 0 10px" }}>Cena není součástí prezentace</h3>
        <p className="small muted" style={{ lineHeight: 1.65, margin: 0 }}>
          Moduly cenu nemají a souhrnný slide žádnou cenu neuvádí. Cena vzniká v samostatné
          cenové kalkulaci podle počtu uživatelů, varianty provozu (lokálně/cloud) a rozsahu
          implementace a posílá se zákazníkovi zvlášť.
        </p>
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Hosting a sdílení</h3>
          <p className="small muted" style={{ lineHeight: 1.6 }}>
            <b>Netlify nestačí.</b> Aplikace potřebuje Node.js backend, LibreOffice a FFmpeg kvůli
            generování PPTX a videa. Na Netlify by fungoval jen statický náhled.
          </p>
          <p className="small muted" style={{ lineHeight: 1.6 }}>
            Připravený Dockerfile zvládne provoz na Renderu, Railway, Fly.io nebo firemním serveru.
            Data se ukládají do JSON souboru na perzistentním disku – změny vidí všichni uživatelé
            stejné aplikace. Přihlášení řídí proměnné <code>USER_PASSWORD</code> (obchodník) a{" "}
            <code>ADMIN_PASSWORD</code> (administrátor).
          </p>
          <pre style={{ background: "#0b2432", color: "#d8e9f3", padding: 12, borderRadius: 9, fontSize: 11, lineHeight: 1.55, overflow: "auto" }}>{`docker build -t vema-presenter .
docker run -p 8080:8080 \\
  -e USER_PASSWORD=heslo-obchodnika \\
  -e ADMIN_PASSWORD=heslo-admina \\
  -v vema-data:/data vema-presenter`}</pre>
        </div>
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Co je potřeba doladit</h3>
          <ul className="small muted" style={{ lineHeight: 1.7, paddingLeft: 18, marginBottom: 0 }}>
            <li>Potvrdit, jestli Microsoft Edge TTS vyhovuje firemním AI pravidlům.</li>
            <li>Doplnit konkrétního obchodníka a jeho kontakt.</li>
            <li>Doplnit odkaz na skutečný XLSX a vzor cenové nabídky.</li>
            <li>Doplnit modul TRO, až budou k dispozici podklady.</li>
            <li>Doladit finální firemní fonty a případné grafické prvky.</li>
          </ul>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Aktuální obsah knihovny</h3>
        <div className="stat-grid" style={{ marginTop: 12 }}>
          <Metric value={String(content.topics.length)} label="modulů" />
          <Metric value={String(content.references.length)} label="textových referencí" />
          <Metric value={String(Object.keys(content.referenceImages || {}).length)} label="obrázků referencí" />
          <Metric value={String(content.sectors.length)} label="segmentů" />
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function TechRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="row" style={{ fontSize: 12 }}>
      <span className="muted" style={{ width: 100, flex: "none" }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}
