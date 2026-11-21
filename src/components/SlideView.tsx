import { useMemo } from "react";
import { categoryWheelSVG } from "../../shared/wheel.js";
import { enrichTopic, modulesLabel } from "../../shared/model.js";
import type { BuilderCfg, Content, DeckSlide, Topic } from "../types";

function Logo({ content, dark = false }: { content: Content; dark?: boolean }) {
  return (
    <img
      className="s-logo"
      src={dark ? content.brand.logoWhite : content.brand.logo}
      alt="Vema"
    />
  );
}

function Footer({ slide, dark = false }: { slide: DeckSlide; dark?: boolean }) {
  return (
    <div className={`s-foot ${dark ? "dark" : ""}`}>
      <span>Vema · personální a mzdové systémy · vema.cz</span>
      <span className="grow" />
      <span>{String(slide.page ?? "").padStart(2, "0")}</span>
      <span className="s-pill">{String(slide.confidentiality || "Neveřejné")}</span>
    </div>
  );
}

function Wheel({
  content,
  cfg,
  currentCategoryId,
  selectedIds,
}: {
  content: Content;
  cfg: BuilderCfg;
  currentCategoryId?: string | null;
  selectedIds?: string[];
}) {
  const topics = useMemo<Topic[]>(
    () =>
      content.topics
        .filter((t) => t.enabled !== false)
        .map((t) => enrichTopic(content, t)),
    [content],
  );
  const html = useMemo(
    () =>
      categoryWheelSVG({
        categories: content.categories,
        topics,
        selectedIds: selectedIds ?? cfg.topicIds,
        currentCategoryId: currentCategoryId ?? null,
        size: 720,
      }),
    [content.categories, topics, selectedIds, cfg.topicIds, currentCategoryId],
  );
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function SlideView({
  slide,
  content,
  cfg,
}: {
  slide: DeckSlide;
  content: Content;
  cfg: BuilderCfg;
}) {
  const s = slide as any;

  if (s.type === "cover") {
    return (
      <div className="slide s-cover">
        <div className="orb1" />
        <div className="orb2" />
        <div className="orb3" />
        <div style={{ position: "absolute", left: "3.4cqw", top: "3.4cqw" }}>
          <Logo content={content} dark />
        </div>
        <div className="inner">
          <div className="bar" />
          <div className="s-eyebrow">{s.eyebrow}</div>
          <h1>{s.title}</h1>
          <div className="cust">{s.subtitle}</div>
          <div className="meta">
            {(s.meta || []).map((m: any) => (
              <div key={m.label}>
                <b>{m.label}</b>
                <span>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
        <Footer slide={slide} dark />
      </div>
    );
  }

  if (s.type === "overview") {
    return (
      <div className="slide s-overview">
        <Logo content={content} />
        <div className="s-page">{String(s.page).padStart(2, "0")}</div>
        <div className="s-wheel">
          <Wheel
            content={content}
            cfg={cfg}
            selectedIds={s.topics.map((t: any) => t.id)}
          />
        </div>
        <div className="right">
          <div className="s-eyebrow">{s.eyebrow}</div>
          <h1 style={{ marginTop: "0.9cqw" }}>{s.title}</h1>
          <div className="sub">{s.subtitle}</div>
          <div className="groups">
            {s.groups.map((g: any) => (
              <div className="group" key={g.id}>
                <span className="dot" style={{ background: g.color }} />
                <span className="nm">{g.name}</span>
                <span className="cnt">{modulesLabel(g.topics.length)}</span>
              </div>
            ))}
          </div>
          <div className="total-line">
            Celkem <b>{modulesLabel(s.topics.length)}</b>
          </div>
        </div>
        <Footer slide={slide} />
      </div>
    );
  }

  if (s.type === "company") {
    return (
      <div className="slide s-company">
        <Logo content={content} />
        <div className="s-page">{String(s.page).padStart(2, "0")}</div>
        <div className="s-head">
          <div className="s-eyebrow">{s.eyebrow}</div>
          <h1>{s.title}</h1>
        </div>
        <div className="copy">
          {(s.paragraphs || []).map((p: string, i: number) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="timeline">
          {(s.timeline || []).map((t: any) => (
            <div className="tl" key={t.year}>
              <b>{t.year}</b>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
        <div className="stats">
          {(s.stats || []).slice(0, 4).map((st: any) => (
            <div key={st.label}>
              <b>{st.value}</b>
              <span>{st.label}</span>
            </div>
          ))}
        </div>
        <div className="bullets">
          {(s.bullets || []).slice(0, 4).map((b: string, i: number) => (
            <div key={i}>
              <i />
              <span>{b}</span>
            </div>
          ))}
        </div>
        <Footer slide={slide} />
      </div>
    );
  }

  if (s.type === "topic") {
    const topic = s.topic;
    return (
      <div className="slide s-topic">
        <div className="bar" />
        <Logo content={content} />
        <div className="s-page">{String(s.page).padStart(2, "0")}</div>
        <div className="s-wheel">
          <Wheel
            content={content}
            cfg={cfg}
            currentCategoryId={topic.categoryId}
            selectedIds={s.selectedIds || cfg.topicIds}
          />
        </div>
        <div className="content">
          <div className="eyebrow-row">
            <div className="s-eyebrow" style={{ color: topic.categoryColor }}>
              {s.eyebrow}
            </div>
            {s.badge ? <span className="badge">{s.badge}</span> : null}
          </div>
          <h1>{s.title}</h1>
          <div className="sub">{s.subtitle}</div>
          <div className="rule" style={{ background: topic.categoryColor }} />
          <div className="desc">{s.description}</div>
          <div className="bullets">
            {(s.bullets || []).slice(0, 5).map((b: string, i: number) => (
              <div key={i}>
                <i />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
        <Footer slide={slide} />
      </div>
    );
  }

  if (s.type === "references") {
    return (
      <div className="slide s-refs">
        <img className="ref-img" src={s.image} alt={`Reference – ${s.sector.name}`} />
        <div className="ref-overlay">
          <span className="s-pill">Neveřejné</span>
          <span className="ref-page">{String(s.page).padStart(2, "0")}</span>
        </div>
      </div>
    );
  }

  if (s.type === "summary") {
    return (
      <div className="slide s-summary">
        <Logo content={content} />
        <div className="s-page">{String(s.page).padStart(2, "0")}</div>
        <div className="s-head">
          <div className="s-eyebrow">{s.eyebrow}</div>
          <h1>{s.title}</h1>
        </div>
        <div className="groups2">
          {(s.groups || []).map((g: any) => (
            <div className="g2" key={g.id}>
              <div className="g2-head">
                <span className="dot" style={{ background: g.color }} />
                <b>{g.name}</b>
              </div>
              <ul>
                {g.topics.map((t: any) => (
                  <li key={t.id}>{t.title}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {s.excelUrl ? (
          <div className="excel">
            <b>Podrobná kalkulace (Excel)</b>
            <span>{s.excelUrl}</span>
          </div>
        ) : null}
        {s.note ? <div className="note2">{s.note}</div> : null}
        <div className="pricenote">Nabídka obsahuje {modulesLabel(s.count)}.</div>
        <Footer slide={slide} />
      </div>
    );
  }

  if (s.type === "contact") {
    return (
      <div className="slide s-contact">
        <div className="orb" />
        <Logo content={content} dark />
        <div className="inner">
          <div className="s-eyebrow">{s.eyebrow}</div>
          <h1>{s.title}</h1>
          <div className="sub">{s.subtitle}</div>
          <div className="person">
            <b>{s.salesperson.name}</b>
            <div className="role">{s.salesperson.role}</div>
            <div className="line">
              <span>{s.salesperson.phone}</span>
              <span>{s.salesperson.email}</span>
            </div>
            {s.salesperson.note ? <div className="demo">{s.salesperson.note}</div> : null}
          </div>
        </div>
        <div className="steps2">
          <div className="lbl">DALŠÍ KROKY</div>
          {(s.nextSteps || []).slice(0, 4).map((st: string, i: number) => (
            <div className="st" key={i}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span>{st}</span>
            </div>
          ))}
        </div>
        <Footer slide={slide} dark />
      </div>
    );
  }

  return <div className="slide" />;
}
