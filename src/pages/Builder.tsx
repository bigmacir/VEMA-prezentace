import { useEffect, useMemo, useState } from "react";
import {
  buildDeck,
  deckWarnings,
  getSector,
  modulesLabel,
  selectedTopics,
} from "../../shared/model.js";
import {
  downloadBlob,
  exportPptx,
  fetchVoices,
  getVideo,
  patchTopic,
  startVideo,
  voiceSampleUrl,
  type Voice,
} from "../api";
import { SlideView } from "../components/SlideView";
import { Wheel } from "../components/Wheel";
import type { BuilderCfg, Content, VideoJob } from "../types";

const STEPS = ["Zákazník", "Moduly", "Souhrn", "Náhled a export"];

const FALLBACK_VOICES: Voice[] = [
  { id: "cs-CZ-VlastaNeural", label: "Vlasta – žena (Edge, zdarma)", provider: "edge" },
  { id: "cs-CZ-AntoninNeural", label: "Antonín – muž (Edge, zdarma)", provider: "edge" },
];
const SILENT: Voice = { id: "none", label: "Bez komentáře (tiché video)", provider: "none" };

function slug(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "nabidka"
  );
}

export function Builder({
  content,
  setContent,
  cfg,
  setCfg,
  notify,
  isAdmin,
}: {
  content: Content;
  setContent: (c: Content) => void;
  cfg: BuilderCfg;
  setCfg: (c: BuilderCfg) => void;
  notify: (msg: string, err?: boolean) => void;
  isAdmin: boolean;
}) {
  const [step, setStep] = useState(0);
  const [voices, setVoices] = useState<Voice[]>([...FALLBACK_VOICES, SILENT]);
  const [voice, setVoice] = useState(FALLBACK_VOICES[0].id);

  // Seznam hlasů dává server – ElevenLabs/Google se objeví, jen když mají nastavený klíč.
  useEffect(() => {
    fetchVoices()
      .then((list) => {
        if (!list.length) return;
        setVoices([...list, SILENT]);
        setVoice((cur) => (list.some((v) => v.id === cur) ? cur : list[0].id));
      })
      .catch(() => {});
  }, []);
  const [pptxBusy, setPptxBusy] = useState(false);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const chosen = selectedTopics(content, cfg.topicIds);
  const deck = useMemo(() => buildDeck(content, cfg), [content, cfg]);
  const warnings = deckWarnings(content, cfg);

  const patch = (p: Partial<BuilderCfg>) => setCfg({ ...cfg, ...p });

  const toggleTopic = (id: string) => {
    if (cfg.topicIds.includes(id)) {
      patch({ topicIds: cfg.topicIds.filter((t) => t !== id) });
    } else {
      patch({ topicIds: [...cfg.topicIds, id] });
    }
  };

  const toggleCategory = (categoryId: string) => {
    const ids = content.topics
      .filter((t) => t.enabled !== false && t.categoryId === categoryId)
      .map((t) => t.id);
    const allSelected = ids.length > 0 && ids.every((id) => cfg.topicIds.includes(id));
    if (allSelected) {
      patch({ topicIds: cfg.topicIds.filter((id) => !ids.includes(id)) });
    } else {
      patch({ topicIds: [...cfg.topicIds, ...ids.filter((id) => !cfg.topicIds.includes(id))] });
    }
  };

  useEffect(() => {
    if (!job || job.status === "done" || job.status === "error") return;
    const t = window.setTimeout(async () => {
      try {
        setJob(await getVideo(job.id));
      } catch {
        /* keep polling */
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [job]);

  async function handlePptx() {
    setPptxBusy(true);
    try {
      const blob = await exportPptx(cfg);
      downloadBlob(blob, `VEMA-nabidka-${slug(cfg.customer)}.pptx`);
      notify("PPTX je stažené. Otevřete ho v PowerPointu a zkontrolujte vzhled.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setPptxBusy(false);
    }
  }

  async function handleVideo() {
    setVideoBusy(true);
    try {
      const { id } = await startVideo(cfg, voice);
      setJob({
        id,
        status: "running",
        progress: 1,
        step: "Zařazeno do fronty…",
        log: ["Úloha vytvořena"],
      });
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setVideoBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Nová prezentace</h2>
          <p>
            Vyberte zákazníka a moduly, zkontrolujte souhrn a vyexportujte prezentaci nebo
            namluvené video. Vše se skládá z jednoho obsahu – texty se zadávají jen jednou.
          </p>
        </div>
        <div className="spacer" />
        <div className="pill pill-blue">{modulesLabel(chosen.length)}</div>
      </div>

      <div className="steps">
        {STEPS.map((label, i) => (
          <button
            key={label}
            className={`step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
            onClick={() => setStep(i)}
          >
            <span className="num">{i < step ? "✓" : i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {step === 0 && <ClientStep content={content} cfg={cfg} patch={patch} onNext={() => setStep(1)} />}
      {step === 1 && (
        <TopicsStep
          content={content}
          cfg={cfg}
          patch={patch}
          toggleTopic={toggleTopic}
          toggleCategory={toggleCategory}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <SummaryStep
          content={content}
          cfg={cfg}
          patch={patch}
          warnings={warnings}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <PreviewStep
          content={content}
          setContent={setContent}
          isAdmin={isAdmin}
          cfg={cfg}
          deck={deck}
          notify={notify}
          voice={voice}
          setVoice={setVoice}
          voices={voices}
          handlePptx={handlePptx}
          pptxBusy={pptxBusy}
          handleVideo={handleVideo}
          videoBusy={videoBusy}
          job={job}
          setJob={setJob}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Zákazník                                                         */
/* ------------------------------------------------------------------ */

function ClientStep({
  content,
  cfg,
  patch,
  onNext,
}: {
  content: Content;
  cfg: BuilderCfg;
  patch: (p: Partial<BuilderCfg>) => void;
  onNext: () => void;
}) {
  return (
    <div className="builder-grid">
      <div className="stack">
        <div className="card">
          <div className="card-head">
            <h3>Kdo je zákazník</h3>
            <span className="hint">Údaje se propíšou do titulního a závěrečného slidu</span>
          </div>
          <div className="card-pad">
            <div className="form-grid">
              <div className="field span-2">
                <label>Název organizace</label>
                <input
                  className="input"
                  placeholder="např. Oblastní nemocnice Demo"
                  value={cfg.customer}
                  onChange={(e) => patch({ customer: e.target.value })}
                />
                <span className="hint">Použije se na titulním slidu a v komentáři k videu.</span>
              </div>
              <div className="field">
                <label>Obchodník</label>
                <select
                  className="select"
                  value={cfg.salespersonId}
                  onChange={(e) => patch({ salespersonId: e.target.value })}
                >
                  {content.salespeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} – {p.role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Datum nabídky</label>
                <input
                  className="input"
                  type="date"
                  value={cfg.date}
                  onChange={(e) => patch({ date: e.target.value })}
                />
              </div>
              <div className="field span-2">
                <label>Segment zákazníka</label>
                <div className="chips">
                  {content.sectors.map((s) => (
                    <button
                      key={s.id}
                      className={`chip ${cfg.sector === s.id ? "is-active" : ""}`}
                      onClick={() => patch({ sector: s.id })}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <span className="hint">
                  Segment rozhoduje o referencích a doporučených modulech.
                </span>
              </div>
              <div className="field span-2">
                <label>Název prezentace (nepovinné)</label>
                <input
                  className="input"
                  placeholder={`Automaticky: Personální a mzdové procesy pro ${getSector(content, cfg.sector).short.toLowerCase()}`}
                  value={cfg.presentationTitle}
                  onChange={(e) => patch({ presentationTitle: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="row">
            <div>
              <div style={{ fontSize: 13, fontWeight: 650 }}>Odkaz na cenovou kalkulaci (Excel)</div>
              <div className="small muted" style={{ marginTop: 3 }}>
                Nepovinné. Odkaz se vloží na souhrnný slide jako klikatelný odkaz.
              </div>
            </div>
            <div className="spacer" />
          </div>
          <input
            className="input"
            style={{ marginTop: 12 }}
            placeholder="https://… (SharePoint, OneDrive, příloha)"
            value={cfg.excelUrl}
            onChange={(e) => patch({ excelUrl: e.target.value })}
          />
        </div>
      </div>

      <div className="side-col">
        <div className="card card-pad">
          <div className="s-eyebrow" style={{ fontSize: 10 }}>
            Jak to funguje
          </div>
          <h3 style={{ margin: "8px 0 10px", fontSize: 16 }}>Od výběru k hotové prezentaci</h3>
          <ol className="small muted" style={{ paddingLeft: 18, lineHeight: 1.65, margin: 0 }}>
            <li>Vyplníte zákazníka a segment.</li>
            <li>Naklikáte moduly na kole.</li>
            <li>Systém sestaví souhrn a pevné bloky.</li>
            <li>Vyexportujete PPTX nebo namluvené MP4.</li>
          </ol>
          <div className="tip" style={{ marginTop: 14 }}>
            <b>Princip:</b> obsah se neopisuje do slidů ručně. Texty a komentáře jsou v
            knihovně a prezentace se z nich skládá.
          </div>
        </div>
        <div className="card card-pad">
          <div className="row">
            <span className="pill pill-red">Neveřejné</span>
            <span className="small muted">na každém slidu</span>
          </div>
          <p className="small muted" style={{ lineHeight: 1.55, marginBottom: 0 }}>
            Označení je součástí šablony a nedá se omylem vypnout. Do prezentace se dostanou
            pouze data z knihovny, žádná firemní data se neposílají do AI.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Témata                                                           */
/* ------------------------------------------------------------------ */

function TopicsStep({
  content,
  cfg,
  patch,
  toggleTopic,
  toggleCategory,
  onNext,
  onBack,
}: {
  content: Content;
  cfg: BuilderCfg;
  patch: (p: Partial<BuilderCfg>) => void;
  toggleTopic: (id: string) => void;
  toggleCategory: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [onlySector, setOnlySector] = useState(false);

  const modules = content.topics.filter((t) => {
    if (t.enabled === false) return false;
    if (cat !== "all" && t.categoryId !== cat) return false;
    if (onlySector && t.sectors && !t.sectors.includes(cfg.sector)) return false;
    const needle = q.trim().toLowerCase();
    if (needle) {
      const hay = `${t.title} ${t.subtitle || ""} ${t.description || ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const groups = content.categories
    .map((c) => ({ ...c, topics: modules.filter((t) => t.categoryId === c.id) }))
    .filter((g) => g.topics.length > 0);

  const chosen = selectedTopics(content, cfg.topicIds);

  return (
    <div className="builder-grid">
      <div className="stack">
        <div className="card">
          <div className="card-head">
            <h3>Vyberte oblasti a moduly</h3>
            <span className="hint">Kliknutím na oblast vyberete celou skupinu</span>
          </div>
          <Wheel content={content} selectedIds={cfg.topicIds} onToggleCategory={toggleCategory} />
          <div className="wheel-legend">
            {content.categories.map((c) => (
              <span key={c.id}>
                <i style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
            <span>
              <i style={{ background: "#E7EEF7" }} />
              nevybráno
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Moduly</h3>
            <span className="hint">{modules.length} z {content.topics.length}</span>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div className="search" style={{ flex: "1 1 220px" }}>
              <span className="mag">⌕</span>
              <input
                className="input"
                placeholder="Hledat modul…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select className="select" style={{ width: 210 }} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="all">Všechny oblasti</option>
              {content.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              className={`chip ${onlySector ? "is-active" : ""}`}
              onClick={() => setOnlySector((v) => !v)}
            >
              Jen pro {getSector(content, cfg.sector).short.toLowerCase()}
            </button>
          </div>

          {groups.map((g) => {
            const ids = content.topics.filter((t) => t.categoryId === g.id).map((t) => t.id);
            const all = ids.length > 0 && ids.every((id) => cfg.topicIds.includes(id));
            const some = ids.some((id) => cfg.topicIds.includes(id));
            return (
              <div key={g.id}>
                <div className="module-group-head">
                  <span className="dot" style={{ background: g.color }} />
                  <b>{g.name}</b>
                  <span className="group-count">{g.topics.length}</span>
                  <span className="spacer" />
                  <button className="btn btn-sm" onClick={() => toggleCategory(g.id)}>
                    {all ? "Odznačit vše" : some ? "Doplnit vše" : "Vybrat vše"}
                  </button>
                </div>
                <div className="topic-list">
                  {g.topics.map((t) => {
                    const selected = cfg.topicIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        className={`topic-row ${selected ? "is-selected" : ""}`}
                        onClick={() => toggleTopic(t.id)}
                      >
                        <span className="check">{selected ? "✓" : ""}</span>
                        <span>
                          <div className="t-title">
                            {t.title}
                            {t.badge ? <span className="badge-inline">{t.badge}</span> : null}
                          </div>
                          <div className="t-sub">{t.subtitle}</div>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {groups.length === 0 && <div className="empty">Žádný modul neodpovídá filtru.</div>}
        </div>
      </div>

      <div className="side-col">
        <div className="card">
          <div className="card-head">
            <h3>Vybráno</h3>
            <span className="hint">{modulesLabel(cfg.topicIds.length)}</span>
          </div>
          <div className="card-pad" style={{ paddingTop: 12 }}>
            {chosen.length ? (
              <div className="selected-list">
                {chosen.map((t: any, i: number) => (
                  <div className="selected-item" key={t.id}>
                    <span className="idx">{i + 1}</span>
                    <span className="name">{t.title}</span>
                    <button
                      className="x"
                      title="Odebrat"
                      onClick={() => patch({ topicIds: cfg.topicIds.filter((x) => x !== t.id) })}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="small muted">Zatím nic. Klikněte na oblast nebo modul.</div>
            )}
          </div>
          <div className="summary-bar">
            <div>
              <div className="count">Rozsah nabídky</div>
              <div className="total">{modulesLabel(cfg.topicIds.length)}</div>
            </div>
            <div className="spacer" />
            <button className="btn" onClick={onBack}>Zpět</button>
            <button className="btn btn-primary" onClick={onNext} disabled={!cfg.topicIds.length}>
              Pokračovat
            </button>
          </div>
        </div>

        <div className="card card-pad">
          <div className="row">
            <button
              className="btn btn-sm"
              onClick={() =>
                patch({
                  topicIds: content.topics.filter((t) => t.enabled !== false).map((t) => t.id),
                })
              }
            >
              Vybrat vše
            </button>
            <button className="btn btn-sm" onClick={() => patch({ topicIds: [] })}>
              Vyčistit
            </button>
          </div>
          <p className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 0 }}>
            Kolo vybírá celou oblast, jednotlivé moduly zapnete v seznamu. Nový modul stačí
            přidat v knihovně obsahu – kolo se přizpůsobí samo.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Souhrn                                                           */
/* ------------------------------------------------------------------ */

function SummaryStep({
  content,
  cfg,
  patch,
  warnings,
  onNext,
  onBack,
}: {
  content: Content;
  cfg: BuilderCfg;
  patch: (p: Partial<BuilderCfg>) => void;
  warnings: string[];
  onNext: () => void;
  onBack: () => void;
}) {
  const topics = selectedTopics(content, cfg.topicIds);
  const groups = content.categories
    .map((c) => ({ ...c, topics: topics.filter((t) => t.categoryId === c.id) }))
    .filter((g) => g.topics.length > 0);

  function move(id: string, dir: -1 | 1) {
    const ids = [...cfg.topicIds];
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    patch({ topicIds: ids });
  }

  return (
    <div className="summary-layout">
      <div className="stack">
        <div className="card">
          <div className="card-head">
            <h3>Souhrnná obrazovka</h3>
            <span className="hint">Přesně to, co uvidí zákazník na konci prezentace</span>
          </div>
          <div className="card-pad">
            {groups.map((g) => (
              <div key={g.id} className="summary-group">
                <div className="summary-group-head">
                  <span className="dot" style={{ background: g.color }} />
                  <b>{g.name}</b>
                  <span className="group-count">{g.topics.length}</span>
                </div>
                {g.topics.map((t: any) => (
                  <div className="summary-row" key={t.id}>
                    <span className="nm">{t.title}</span>
                    {t.badge ? <span className="badge-inline">{t.badge}</span> : null}
                    <span className="spacer" />
                    <span className="tools">
                      <button title="Nahoru" onClick={() => move(t.id, -1)}>↑</button>
                      <button title="Dolů" onClick={() => move(t.id, 1)}>↓</button>
                      <button
                        title="Odebrat"
                        onClick={() => patch({ topicIds: cfg.topicIds.filter((x) => x !== t.id) })}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {topics.length === 0 && <div className="empty">Nejsou vybrány žádné moduly.</div>}
            <div style={{ marginTop: 16 }}>
              <div className="field">
                <label>Poznámka na souhrnný slide</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Např. Nabídka vychází z požadavků na mzdy, personalistiku a reporting."
                  value={cfg.note}
                  onChange={(e) => patch({ note: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Pevné bloky</h3>
          </div>
          <div className="card-pad stack" style={{ gap: 12 }}>
            <div className="toggle-row">
              <div>
                <div className="txt">Slide „O společnosti Vema“</div>
                <div className="sub">Historie, čísla a pilíře společnosti</div>
              </div>
              <div className="spacer" />
              <button
                className={`switch ${cfg.includeCompany ? "on" : ""}`}
                onClick={() => patch({ includeCompany: !cfg.includeCompany })}
              />
            </div>
            <div className="toggle-row">
              <div>
                <div className="txt">Slide s referencemi</div>
                <div className="sub">Obrázek s logy zákazníků podle segmentu</div>
              </div>
              <div className="spacer" />
              <button
                className={`switch ${cfg.includeReferences ? "on" : ""}`}
                onClick={() => patch({ includeReferences: !cfg.includeReferences })}
              />
            </div>
            <div className="toggle-row">
              <div>
                <div className="txt">Souhrnný slide</div>
                <div className="sub">Přehled vybraných modulů podle oblastí</div>
              </div>
              <div className="spacer" />
              <button
                className={`switch ${cfg.includeSummary ? "on" : ""}`}
                onClick={() => patch({ includeSummary: !cfg.includeSummary })}
              />
            </div>
            <div className="toggle-row">
              <div>
                <div className="txt">Kontakt a další kroky</div>
                <div className="sub">Obchodník, telefon, e-mail</div>
              </div>
              <div className="spacer" />
              <button
                className={`switch ${cfg.includeContact ? "on" : ""}`}
                onClick={() => patch({ includeContact: !cfg.includeContact })}
              />
            </div>

            <div className="field">
              <label>Odkaz na Excel s kalkulací</label>
              <input
                className="input"
                placeholder="https://…"
                value={cfg.excelUrl}
                onChange={(e) => patch({ excelUrl: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="side-col">
        {warnings.length > 0 ? (
          <div className="warn-box">
            <b className="small">Ještě doladit</b>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="ok-box">Vše je vyplněné. Můžete pokračovat na náhled.</div>
        )}

        <div className="card card-pad">
          <div className="row">
            <span className="pill pill-red">Neveřejné</span>
            <span className="tiny muted">pevně na každém slidu</span>
          </div>
          <p className="tiny muted" style={{ lineHeight: 1.5, margin: "10px 0 0" }}>
            Všechna data v této ukázce jsou veřejné informace. Do prezentace se dostane pouze
            obsah z knihovny, žádná firemní data se neposílají do AI.
          </p>
        </div>

        <div className="row">
          <button className="btn" onClick={onBack}>Zpět</button>
          <div className="spacer" />
          <button className="btn btn-primary" onClick={onNext}>Pokračovat na náhled</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Náhled a export                                                  */
/* ------------------------------------------------------------------ */

const TYPE_LABEL: Record<string, string> = {
  cover: "Titul",
  overview: "Kolo",
  company: "O nás",
  topic: "Téma",
  references: "Reference",
  summary: "Souhrn",
  contact: "Kontakt",
};

function PreviewStep({
  content,
  setContent,
  isAdmin,
  cfg,
  deck,
  notify,
  voice,
  setVoice,
  voices,
  handlePptx,
  pptxBusy,
  handleVideo,
  videoBusy,
  job,
  setJob,
  onBack,
}: {
  content: Content;
  setContent: (c: Content) => void;
  isAdmin: boolean;
  cfg: BuilderCfg;
  deck: any;
  notify: (msg: string, err?: boolean) => void;
  voice: string;
  setVoice: (v: string) => void;
  voices: Voice[];
  handlePptx: () => void;
  pptxBusy: boolean;
  handleVideo: () => void;
  videoBusy: boolean;
  job: VideoJob | null;
  setJob: (j: VideoJob | null) => void;
  onBack: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [narr, setNarr] = useState("");
  const [saving, setSaving] = useState(false);
  const slides = deck.slides as any[];
  const safeIndex = Math.min(index, Math.max(slides.length - 1, 0));
  const current = slides[safeIndex];

  useEffect(() => {
    if (index > slides.length - 1) setIndex(Math.max(slides.length - 1, 0));
  }, [slides.length, index]);

  useEffect(() => {
    if (current?.type !== "topic") return;
    const topic = content.topics.find((t) => t.id === current.topic.id);
    setNarr(topic?.narration || "");
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveNarr() {
    if (!current || current.type !== "topic") return;
    setSaving(true);
    try {
      const updated = await patchTopic(current.topic.id, { narration: narr });
      setContent(updated);
      notify("Komentář pro voice-over je uložený.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="preview-layout">
        <div className="thumbs">
          {slides.map((s, i) => (
            <button
              key={s.id}
              className={`thumb ${i === safeIndex ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
            >
              <div className="frame">
                <SlideView slide={s} content={content} cfg={cfg} />
              </div>
              <div className="cap">
                <b>{String(i + 1).padStart(2, "0")}</b>
                {TYPE_LABEL[s.type] || s.type}
              </div>
            </button>
          ))}
        </div>

        <div>
          <div className="preview-stage">
            {current ? <SlideView slide={current} content={content} cfg={cfg} /> : null}
          </div>
          <div className="preview-meta">
            <b>
              Slide {safeIndex + 1} / {slides.length}
            </b>
            <span>·</span>
            <span>{current?.title || ""}</span>
            <div className="spacer" />
            <button className="btn btn-sm" onClick={() => setIndex(Math.max(0, safeIndex - 1))}>←</button>
            <button
              className="btn btn-sm"
              onClick={() => setIndex(Math.min(slides.length - 1, safeIndex + 1))}
            >
              →
            </button>
          </div>

          {current?.type === "topic" && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-head">
                <h3>Komentář pro voice-over</h3>
                <span className="hint">
                  {isAdmin
                    ? "Uloží se do knihovny obsahu a použije se i v PPTX poznámkách"
                    : "Upravit komentář může jen administrátor"}
                </span>
              </div>
              <div className="card-pad">
                <textarea
                  readOnly={!isAdmin}
                  className="textarea"
                  rows={3}
                  value={narr}
                  onChange={(e) => setNarr(e.target.value)}
                />
                <div className="row" style={{ marginTop: 10 }}>
                  <span className="tiny muted">{narr.trim().split(/\s+/).filter(Boolean).length} slov</span>
                  <div className="spacer" />
                  {isAdmin && (
                    <button className="btn btn-sm btn-primary" disabled={saving} onClick={saveNarr}>
                      {saving ? "Ukládám…" : "Uložit komentář"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="export-panel">
          <div className="stack">
            <div className="card card-pad">
              <div className="s-eyebrow" style={{ fontSize: 10 }}>Výstup 1</div>
              <h3 style={{ margin: "6px 0 8px" }}>PowerPoint (PPTX)</h3>
              <p className="small muted" style={{ marginTop: 0, lineHeight: 1.5 }}>
                Plně editovatelná prezentace 16:9 se zachovaným vizuálním stylem. Komentáře jsou
                uložené i v poznámkách slidů.
              </p>
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handlePptx} disabled={pptxBusy}>
                {pptxBusy ? "Generuji…" : "Stáhnout PPTX"}
              </button>
            </div>

            <div className="card card-pad">
              <div className="s-eyebrow" style={{ fontSize: 10 }}>Výstup 2</div>
              <h3 style={{ margin: "6px 0 8px" }}>Namluvené MP4</h3>
              <p className="small muted" style={{ marginTop: 0, lineHeight: 1.5 }}>
                Každý slide se převede na obrázek, k němu se vygeneruje český komentář a vše se
                spojí do videa. Délka slidu se řídí délkou komentáře.
              </p>

              <div className="field" style={{ marginTop: 10 }}>
                <label>Hlas</label>
                <select className="select" value={voice} onChange={(e) => setVoice(e.target.value)}>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                {voice !== "none" && (
                  <audio
                    key={voice}
                    controls
                    preload="none"
                    src={voiceSampleUrl(voice)}
                    style={{ width: "100%", height: 34, marginTop: 6 }}
                  />
                )}
                <span className="hint">Přehrajte ukázku a porovnejte hlasy před vytvořením videa.</span>
              </div>

              <button
                className="btn btn-accent"
                style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
                onClick={handleVideo}
                disabled={videoBusy || job?.status === "running" || job?.status === "queued"}
              >
                {videoBusy
                  ? "Spouštím…"
                  : job?.status === "running"
                    ? "Generuji video…"
                    : "Vygenerovat MP4"}
              </button>

              {job && (
                <div style={{ marginTop: 14 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="tiny muted">{job.step}</span>
                    <span className="tiny muted">{Math.round(job.progress)} %</span>
                  </div>
                  <div className="progress" style={{ marginTop: 6 }}>
                    <i style={{ width: `${Math.max(2, Math.min(100, job.progress))}%` }} />
                  </div>
                  {job.log?.length ? (
                    <div className="job-log" style={{ marginTop: 10 }}>
                      {job.log.map((l, i) => (
                        <div key={i}>› {l}</div>
                      ))}
                    </div>
                  ) : null}
                  {job.status === "done" && job.url ? (
                    <a className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} href={job.url}>
                      Stáhnout video
                    </a>
                  ) : null}
                  {job.status === "error" ? (
                    <div className="warn-box" style={{ marginTop: 10 }}>
                      <b className="small">Video se nepovedlo</b>
                      <div className="tiny" style={{ marginTop: 4 }}>{job.error}</div>
                      <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setJob(null)}>
                        Zkusit znovu
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <div className="narr">
                  <b>Co se namluví:</b> komentáře k titulku, výběru, referencím, souhrnu a
                  kontaktu jsou v administraci. Komentáře jednotlivých modulů upravíte přímo u
                  slidu vlevo.
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <div className="row">
                <button className="btn" onClick={onBack}>← Zpět na souhrn</button>
              </div>
              <p className="tiny muted" style={{ marginBottom: 0, lineHeight: 1.5 }}>
                Tip: nejdřív zkontrolujte PPTX v PowerPointu. Teprve pak generujte video – ušetříte
                čas, pokud je potřeba upravit text.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
