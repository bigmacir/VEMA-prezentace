import { useEffect, useMemo, useState } from "react";
import { resetContent, saveContent } from "../api";
import type { Content, Topic } from "../types";

const TABS = [
  { id: "topics", label: "Moduly a komentáře" },
  { id: "fixed", label: "Pevné texty" },
  { id: "refs", label: "Reference" },
  { id: "people", label: "Obchodníci" },
  { id: "data", label: "Data a záloha" },
];

const NARRATION_LABELS: Record<string, string> = {
  cover: "Titulní slide",
  overview: "Výběr modulů (kolo)",
  company: "O společnosti",
  references: "Reference",
  summary: "Souhrn",
  contact: "Kontakt / závěr",
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function Admin({
  content,
  setContent,
  notify,
}: {
  content: Content;
  setContent: (c: Content) => void;
  notify: (msg: string, err?: boolean) => void;
}) {
  const [tab, setTab] = useState("topics");
  const [draft, setDraft] = useState<Content>(() => clone(content));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(clone(content));
    setDirty(false);
  }, [content.meta.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  function edit(mutator: (d: Content) => void) {
    setDraft((prev) => {
      const next = clone(prev);
      mutator(next);
      return next;
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await saveContent(draft);
      setContent(updated);
      setDirty(false);
      notify("Obsah je uložený. Změny se projeví v nových prezentacích.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!window.confirm("Opravdu vrátit knihovnu do ukázkového stavu? Vaše úpravy se ztratí.")) return;
    try {
      const updated = await resetContent();
      setContent(updated);
      notify("Knihovna je vrácená do demo stavu.");
    } catch (e) {
      notify((e as Error).message, true);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Knihovna obsahu</h2>
          <p>
            Jediné místo, kde se spravují texty, komentáře pro voice-over a pevné bloky.
            Prezentace i video se z tohoto obsahu skládají automaticky.
          </p>
        </div>
        <div className="spacer" />
        <span className={`pill ${dirty ? "pill-red" : "pill-blue"}`}>
          {dirty ? "Neuložené změny" : `Verze ${content.meta.version}`}
        </span>
        <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
          {saving ? "Ukládám…" : "Uložit změny"}
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "topics" && (
        <TopicsAdmin draft={draft} edit={edit} notify={notify} />
      )}
      {tab === "fixed" && <FixedAdmin draft={draft} edit={edit} />}
      {tab === "refs" && <RefsAdmin draft={draft} edit={edit} />}
      {tab === "people" && <PeopleAdmin draft={draft} edit={edit} />}
      {tab === "data" && (
        <DataAdmin
          draft={draft}
          edit={edit}
          save={save}
          reset={reset}
          notify={notify}
        />
      )}

      {dirty && (
        <div className="summary-bar" style={{ position: "sticky", bottom: 0, marginTop: 20, borderRadius: 12, border: "1px solid var(--line)" }}>
          <span className="small">Máte neuložené změny v knihovně obsahu.</span>
          <div className="spacer" />
          <button className="btn" onClick={() => setDraft(clone(content))}>Zahodit</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>Uložit změny</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TopicEditorCard({
  topic,
  categories,
  sectors,
  onChange,
  onDelete,
}: {
  topic: Topic;
  categories: Content["categories"];
  sectors: Content["sectors"];
  onChange: (patch: Partial<Topic>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`admin-topic ${open ? "is-open" : ""}`}>
      <button className="head" onClick={() => setOpen((v) => !v)}>
        <span
          className="dot"
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: categories.find((c) => c.id === topic.categoryId)?.color || "#1665d8",
          }}
        />
        <b style={{ fontSize: 13 }}>{topic.title || "(bez názvu)"}</b>
        <span className="tiny muted">{categories.find((c) => c.id === topic.categoryId)?.name}</span>
        {topic.enabled === false && <span className="tag warn">vypnuto</span>}
        {!String(topic.narration || "").trim() && <span className="tag warn">chybí komentář</span>}
        <span className="spacer" />
        {topic.badge ? <span className="tag ok">{topic.badge}</span> : null}
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="body">
          <div className="field">
            <label>Název modulu</label>
            <input className="input" value={topic.title} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <div className="field">
            <label>Kategorie</label>
            <select
              className="select"
              value={topic.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Krátký popis (podtitul)</label>
            <input className="input" value={topic.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} />
          </div>
          <div className="field">
            <label>Označení / kód modulu</label>
            <input
              className="input"
              placeholder="Např. ODZ, JMHZ"
              value={topic.code || ""}
              onChange={(e) => onChange({ code: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Štítek (nepovinné)</label>
            <input
              className="input"
              placeholder="Např. Novinka"
              value={topic.badge || ""}
              onChange={(e) => onChange({ badge: e.target.value })}
            />
            <span className="hint">Zobrazí se jako zvýrazněný štítek u názvu modulu.</span>
          </div>
          <div className="field">
            <label>Popis na slidu</label>
            <textarea
              className="textarea"
              rows={3}
              value={topic.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Komentář pro voice-over</label>
            <textarea
              className="textarea"
              rows={4}
              value={topic.narration || ""}
              onChange={(e) => onChange({ narration: e.target.value })}
              placeholder="Co má být u tohoto modulu namluveno…"
            />
            <span className="hint">
              {(topic.narration || "").trim().split(/\s+/).filter(Boolean).length} slov ≈{" "}
              {Math.round(((topic.narration || "").trim().split(/\s+/).filter(Boolean).length / 2.5) || 0)} s
            </span>
          </div>
          <div className="field span-2">
            <label>Odrážky</label>
            <div className="bullet-editor">
              {(topic.bullets || []).map((b, i) => (
                <div className="bullet-line" key={i}>
                  <input
                    className="input"
                    value={b}
                    onChange={(e) => {
                      const next = [...(topic.bullets || [])];
                      next[i] = e.target.value;
                      onChange({ bullets: next });
                    }}
                  />
                  <button
                    className="icon-btn"
                    onClick={() => onChange({ bullets: (topic.bullets || []).filter((_, idx) => idx !== i) })}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div>
                <button className="btn btn-sm" onClick={() => onChange({ bullets: [...(topic.bullets || []), ""] })}>
                  + Přidat odrážku
                </button>
              </div>
            </div>
          </div>
          <div className="field span-2">
            <label>Vhodné pro segmenty</label>
            <div className="chips">
              {sectors.map((s) => {
                const active = (topic.sectors || []).includes(s.id);
                return (
                  <button
                    key={s.id}
                    className={`chip ${active ? "is-active" : ""}`}
                    onClick={() =>
                      onChange({
                        sectors: active
                          ? (topic.sectors || []).filter((x) => x !== s.id)
                          : [...(topic.sectors || []), s.id],
                      })
                    }
                  >
                    {s.short}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="row span-2" style={{ marginTop: 4 }}>
            <div className="toggle-row" style={{ border: 0, padding: 0 }}>
              <div className="txt">Zobrazovat v nabídce</div>
              <button
                className={`switch ${topic.enabled !== false ? "on" : ""}`}
                onClick={() => onChange({ enabled: topic.enabled === false })}
              />
            </div>
            <div className="spacer" />
            <button className="btn btn-sm btn-danger" onClick={onDelete}>Odebrat modul</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopicsAdmin({
  draft,
  edit,
  notify,
}: {
  draft: Content;
  edit: (m: (d: Content) => void) => void;
  notify: (msg: string, err?: boolean) => void;
}) {
  return (
    <div className="stack">
      <div className="tip">
        <b>Jak to funguje:</b> každý modul má texty, odrážky a komentář. Když změníte
        komentář tady, použije se v náhledu, v poznámkách PPTX i ve videu. Změny se ukládají
        tlačítkem „Uložit změny“ nahoře.
      </div>
      {draft.topics.map((t) => (
        <TopicEditorCard
          key={t.id}
          topic={t}
          categories={draft.categories}
          sectors={draft.sectors}
          onChange={(patch) =>
            edit((d) => {
              const found = d.topics.find((x) => x.id === t.id);
              if (found) Object.assign(found, patch);
            })
          }
          onDelete={() => {
            edit((d) => {
              d.topics = d.topics.filter((x) => x.id !== t.id);
            });
            notify("Modul odebrán z knihovny. Nezapomeňte uložit změny.");
          }}
        />
      ))}
      <div>
        <button
          className="btn"
          onClick={() =>
            edit((d) => {
              d.topics.push({
                id: `topic-${Date.now().toString(36)}`,
                categoryId: d.categories[0]?.id || "hr",
                title: "Nový modul",
                subtitle: "",
                description: "",
                bullets: [],
                narration: "",
                sectors: d.sectors.map((s) => s.id),
                enabled: true,
              });
            })
          }
        >
          + Přidat modul
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FixedAdmin({
  draft,
  edit,
}: {
  draft: Content;
  edit: (m: (d: Content) => void) => void;
}) {
  const c = draft.company;
  return (
    <div className="stack">
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>Slide „O společnosti“</h3></div>
          <div className="card-pad stack">
            <div className="field">
              <label>Nadpis</label>
              <input className="input" value={c.title} onChange={(e) => edit((d) => { d.company.title = e.target.value; })} />
            </div>
            <div className="field">
              <label>Odstavce (oddělené prázdným řádkem)</label>
              <textarea
                className="textarea"
                rows={7}
                value={c.paragraphs.join("\n\n")}
                onChange={(e) =>
                  edit((d) => {
                    d.company.paragraphs = e.target.value.split(/\n\s*\n/).filter((x) => x.trim());
                  })
                }
              />
            </div>
            <div className="field">
              <label>Pilíře (jeden na řádek)</label>
              <textarea
                className="textarea"
                rows={4}
                value={c.bullets.join("\n")}
                onChange={(e) =>
                  edit((d) => {
                    d.company.bullets = e.target.value.split("\n").filter((x) => x.trim());
                  })
                }
              />
            </div>
            <div className="field">
              <label>Časová osa (formát: rok | text)</label>
              <textarea
                className="textarea"
                rows={5}
                value={(c.timeline || []).map((t) => `${t.year} | ${t.text}`).join("\n")}
                onChange={(e) =>
                  edit((d) => {
                    d.company.timeline = e.target.value
                      .split("\n")
                      .map((line) => line.split("|").map((x) => x.trim()))
                      .filter((p) => p[0])
                      .map((p) => ({ year: p[0], text: p[1] || "" }));
                  })
                }
              />
            </div>
            <div className="field">
              <label>Čísla (formát: hodnota | popisek)</label>
              <textarea
                className="textarea"
                rows={5}
                value={c.stats.map((s) => `${s.value} | ${s.label}`).join("\n")}
                onChange={(e) =>
                  edit((d) => {
                    d.company.stats = e.target.value
                      .split("\n")
                      .map((line) => line.split("|").map((x) => x.trim()))
                      .filter((p) => p[0])
                      .map((p) => ({ value: p[0], label: p[1] || "" }));
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>Komentáře pevných slidů</h3></div>
            <div className="card-pad stack">
              {Object.keys(NARRATION_LABELS).map((key) => (
                <div className="field" key={key}>
                  <label>{NARRATION_LABELS[key]}</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={draft.narrations[key] || ""}
                    onChange={(e) => edit((d) => { d.narrations[key] = e.target.value; })}
                  />
                </div>
              ))}
              <div className="tip">
                Můžete použít zástupné texty: <b>{"{customer}"}</b>, <b>{"{sector}"}</b>,{" "}
                <b>{"{salesperson}"}</b>, <b>{"{count}"}</b>, <b>{"{modules}"}</b>, <b>{"{topics}"}</b>,{" "}
                <b>{"{categories}"}</b>,{" "}
                <b>{"{date}"}</b>.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>Další kroky a poznámky</h3></div>
          <div className="card-pad stack">
            <div className="field">
              <label>Další kroky (jeden na řádek)</label>
              <textarea
                className="textarea"
                rows={5}
                value={draft.settings.nextSteps.join("\n")}
                onChange={(e) =>
                  edit((d) => {
                    d.settings.nextSteps = e.target.value.split("\n").filter((x) => x.trim());
                  })
                }
              />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Brand a označení</h3></div>
          <div className="card-pad stack">
            <div className="field">
              <label>Označení na každém slidu</label>
              <input
                className="input"
                value={draft.brand.confidentialityLabel}
                onChange={(e) => edit((d) => { d.brand.confidentialityLabel = e.target.value; })}
              />
            </div>
            <div className="field">
              <label>Patička</label>
              <input
                className="input"
                value={draft.brand.footer}
                onChange={(e) => edit((d) => { d.brand.footer = e.target.value; })}
              />
            </div>
            <p className="tiny muted" style={{ lineHeight: 1.55 }}>
              Používá se oficiální logo Vema a firemní barvy. Šablona je připravená pro
              doplnění finálních fontů a případných grafických prvků.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RefsAdmin({
  draft,
  edit,
}: {
  draft: Content;
  edit: (m: (d: Content) => void) => void;
}) {
  return (
    <div className="stack">
      <div className="tip">
        <b>Reference</b> jsou v nabídce řešené jako hotové slidy z originální prezentace –
        obrázek s logy zákazníků pro každý segment. Pokud se reference změní, nahraďte obrázek
        v projektu (složka <code>public/references</code>) a sem vložte novou cestu.
      </div>
      {draft.sectors.map((sector) => {
        const path = draft.referenceImages?.[sector.id] || "";
        return (
          <div className="card card-pad" key={sector.id}>
            <div className="grid-2">
              <div className="stack" style={{ gap: 10 }}>
                <div className="field">
                  <label>{sector.name}</label>
                  <input
                    className="input"
                    value={path}
                    onChange={(e) =>
                      edit((d) => {
                        d.referenceImages = { ...(d.referenceImages || {}), [sector.id]: e.target.value };
                      })
                    }
                  />
                  <span className="hint">{sector.description}</span>
                </div>
                <div className="tiny muted">
                  Doporučený formát 1920 × 1080 px, stejný jako originální slide.
                </div>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                {path ? <img src={path} alt={sector.name} style={{ width: "100%", display: "block" }} /> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PeopleAdmin({
  draft,
  edit,
}: {
  draft: Content;
  edit: (m: (d: Content) => void) => void;
}) {
  return (
    <div className="stack">
      <div className="tip">Kontakty se propisují na závěrečný slide a do titulní stránky.</div>
      {draft.salespeople.map((p) => (
        <div className="card card-pad" key={p.id}>
          <div className="grid-3">
            <div className="field">
              <label>Jméno</label>
              <input className="input" value={p.name} onChange={(e) => edit((d) => { const x = d.salespeople.find((y) => y.id === p.id); if (x) x.name = e.target.value; })} />
            </div>
            <div className="field">
              <label>Role</label>
              <input className="input" value={p.role} onChange={(e) => edit((d) => { const x = d.salespeople.find((y) => y.id === p.id); if (x) x.role = e.target.value; })} />
            </div>
            <div className="field">
              <label>Telefon</label>
              <input className="input" value={p.phone} onChange={(e) => edit((d) => { const x = d.salespeople.find((y) => y.id === p.id); if (x) x.phone = e.target.value; })} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input className="input" value={p.email} onChange={(e) => edit((d) => { const x = d.salespeople.find((y) => y.id === p.id); if (x) x.email = e.target.value; })} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="spacer" />
            <button className="btn btn-sm btn-danger" onClick={() => edit((d) => { d.salespeople = d.salespeople.filter((x) => x.id !== p.id); })}>
              Odebrat
            </button>
          </div>
        </div>
      ))}
      <div>
        <button
          className="btn"
          onClick={() =>
            edit((d) => {
              d.salespeople.push({
                id: `person-${Date.now().toString(36)}`,
                name: "Nový obchodník",
                role: "Obchodní konzultant",
                phone: "",
                email: "",
              });
            })
          }
        >
          + Přidat obchodníka
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DataAdmin({
  draft,
  edit,
  save,
  reset,
  notify,
}: {
  draft: Content;
  edit: (m: (d: Content) => void) => void;
  save: () => void;
  reset: () => void;
  notify: (msg: string, err?: boolean) => void;
}) {
  const json = useMemo(() => JSON.stringify(draft, null, 2), [draft]);
  const [importText, setImportText] = useState("");

  function download() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vema-content.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport() {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.topics || !parsed.categories) throw new Error("Chybí topics nebo categories.");
      edit((d) => {
        Object.keys(parsed).forEach((key) => {
          (d as any)[key] = parsed[key];
        });
      });
      setImportText("");
      notify("Data načtena do editoru. Nezapomeňte je uložit.");
    } catch (e) {
      notify(`Import selhal: ${(e as Error).message}`, true);
    }
  }

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-head"><h3>Záloha knihovny</h3></div>
        <div className="card-pad stack">
          <p className="small muted" style={{ marginTop: 0, lineHeight: 1.55 }}>
            Celý obsah je v jednom JSON souboru. Můžete si ho stáhnout pro zálohu nebo přenést do
            jiného počítače.
          </p>
          <div className="row">
            <button className="btn" onClick={download}>Stáhnout JSON</button>
            <button className="btn" onClick={save}>Uložit změny</button>
          </div>
          <div className="field">
            <label>Import JSON</label>
            <textarea
              className="textarea"
              rows={8}
              placeholder="Vložte obsah souboru…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>
          <button className="btn" onClick={doImport} disabled={!importText.trim()}>Načíst do editoru</button>
          <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />
          <div className="row">
            <button className="btn btn-danger" onClick={reset}>Vrátit ukázková data</button>
            <span className="tiny muted">Přepíše knihovnu demo obsahem.</span>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h3>Náhled JSON</h3>
          <span className="hint">jen pro čtení</span>
        </div>
        <div className="card-pad">
          <textarea className="textarea" rows={22} readOnly value={json} style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 }} />
        </div>
      </div>
    </div>
  );
}
