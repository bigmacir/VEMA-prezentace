// Sdílená logika: z obsahu + konfigurace obchodníka sestaví "deck" (seznam slidů).
// Stejný deck používá náhled v prohlížeči, generátor PPTX i generátor videa.

export const DEFAULT_CFG = {
  customer: "",
  sector: "verejna-sprava",
  salespersonId: "vema",
  presentationTitle: "",
  topicIds: [],
  includeCompany: true,
  includeReferences: true,
  includeSummary: true,
  includeContact: true,
  excelUrl: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

export function pluralCs(n, one, few, many) {
  const x = Math.abs(Number(n) || 0) % 100;
  const y = x % 10;
  if (x === 1) return one;
  if (y >= 2 && y <= 4) return few;
  return many;
}

export function modulesLabel(n) {
  return `${n} ${pluralCs(n, "modul", "moduly", "modulů")}`;
}

export function areasLabel(n) {
  return `${n} ${pluralCs(n, "oblast", "oblasti", "oblastí")}`;
}

export function formatDateCs(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function joinCs(items = []) {
  const list = items.filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} a ${list[list.length - 1]}`;
}

export function getSector(content, id) {
  return content.sectors.find((s) => s.id === id) || content.sectors[0];
}

export function getSalesperson(content, id) {
  return content.salespeople.find((p) => p.id === id) || content.salespeople[0] || {
    name: "Obchodní konzultant",
    role: "Vema",
    phone: "",
    email: "",
  };
}

export function getCategory(content, id) {
  return (
    content.categories.find((c) => c.id === id) || {
      id: "other",
      name: "Další",
      color: "#607D99",
    }
  );
}

export function enrichTopic(content, topic) {
  const category = getCategory(content, topic.categoryId);
  return { ...topic, categoryName: category.name, categoryColor: category.color };
}

export function selectedTopics(content, ids = []) {
  const map = new Map(content.topics.map((t) => [t.id, t]));
  return ids
    .map((id) => map.get(id))
    .filter(Boolean)
    .map((t) => enrichTopic(content, t));
}

export function categoryGroups(content, ids = []) {
  const topics = selectedTopics(content, ids);
  return content.categories
    .map((category) => ({
      ...category,
      topics: topics.filter((t) => t.categoryId === category.id),
    }))
    .filter((c) => c.topics.length > 0);
}

export function normalizeCfg(cfg = {}) {
  return {
    ...DEFAULT_CFG,
    ...cfg,
    topicIds: Array.isArray(cfg.topicIds) ? [...new Set(cfg.topicIds)] : [],
  };
}

export function applyTemplate(template, vars) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined && vars[key] !== null && vars[key] !== ""
      ? String(vars[key])
      : "",
  ).replace(/ {2,}/g, " ").trim();
}

/**
 * @param {object} content
 * @param {object} rawCfg
 * @returns {{slides: object[], topics: object[], salesperson: object, sector: object, cfg: object}}
 */
export function buildDeck(content, rawCfg) {
  const cfg = normalizeCfg(rawCfg);
  const topics = selectedTopics(content, cfg.topicIds);
  const groups = categoryGroups(content, cfg.topicIds);
  const sector = getSector(content, cfg.sector);
  const salesperson = getSalesperson(content, cfg.salespersonId);
  const confidentiality = content.brand.confidentialityLabel;
  const customer = cfg.customer.trim() || "vaše organizace";
  const dateLabel = formatDateCs(cfg.date);
  const referenceImage = (content.referenceImages || {})[cfg.sector] || null;

  const vars = {
    customer,
    sector: sector.name,
    salesperson: salesperson.name,
    count: String(topics.length),
    modules: modulesLabel(topics.length),
    topics: joinCs(topics.map((t) => t.title)),
    categories: joinCs(groups.map((g) => g.name)),
    // Ceny se v prezentaci neuvádějí. Staré šablony s {price}/{priceSentence} dostanou prázdný text.
    price: "",
    priceSentence: "",
    date: dateLabel,
  };

  const narrations = content.narrations || {};
  const narration = (key) => applyTemplate(narrations[key], vars);

  const slides = [];
  const title =
    cfg.presentationTitle.trim() ||
    `Personální a mzdové procesy pro ${sector.proTitle || sector.short.toLowerCase()}`;

  slides.push({
    id: "cover",
    type: "cover",
    eyebrow: "Nabídka řešení",
    title,
    subtitle: customer,
    meta: [
      { label: "Připravil", value: salesperson.name },
      { label: "Datum", value: dateLabel },
      { label: "Segment", value: sector.name },
    ],
    confidentiality,
    narration: narration("cover"),
  });

  if (topics.length > 0) {
    slides.push({
      id: "overview",
      type: "overview",
      eyebrow: "Výběr modulů",
      title: "Vybrali jsme pro vás",
      subtitle: `${modulesLabel(topics.length)} · ${areasLabel(groups.length)}`,
      topics,
      groups,
      confidentiality,
      narration: narration("overview"),
    });
  }

  if (cfg.includeCompany) {
    slides.push({
      id: "company",
      type: "company",
      eyebrow: content.company.eyebrow,
      title: content.company.title,
      paragraphs: content.company.paragraphs,
      stats: content.company.stats,
      timeline: content.company.timeline || [],
      bullets: content.company.bullets,
      confidentiality,
      narration: narration("company"),
    });
  }

  topics.forEach((topic, index) => {
    slides.push({
      id: `topic-${topic.id}`,
      type: "topic",
      eyebrow: topic.categoryName,
      title: topic.title,
      subtitle: topic.subtitle,
      description: topic.description,
      bullets: topic.bullets || [],
      badge: topic.badge || "",
      topic,
      selectedIds: topics.map((t) => t.id),
      index: index + 1,
      total: topics.length,
      confidentiality,
      narration: topic.narration || topic.description || "",
    });
  });

  if (cfg.includeReferences && referenceImage) {
    slides.push({
      id: "references",
      type: "references",
      eyebrow: "Reference",
      title: "Reference",
      subtitle: "Vybrané organizace, které používají řešení Vema",
      sector,
      image: referenceImage,
      confidentiality,
      narration: narration("references"),
    });
  }

  if (cfg.includeSummary) {
    slides.push({
      id: "summary",
      type: "summary",
      eyebrow: "Souhrn nabídky",
      title: "Co pro vás připravíme",
      groups,
      count: topics.length,
      countLabel: modulesLabel(topics.length),
      excelUrl: cfg.excelUrl.trim(),
      note: cfg.note.trim(),
      confidentiality,
      narration: narration("summary"),
    });
  }

  if (cfg.includeContact) {
    slides.push({
      id: "contact",
      type: "contact",
      eyebrow: "Kontakt",
      title: "Děkujeme za pozornost",
      subtitle: "Jsme připraveni pokračovat podle vašich potřeb.",
      salesperson,
      nextSteps: content.settings.nextSteps || [],
      customer,
      confidentiality,
      narration: narration("contact"),
    });
  }

  slides.forEach((slide, i) => {
    slide.page = i + 1;
    slide.totalPages = slides.length;
  });

  return { slides, topics, groups, salesperson, sector, cfg };
}

export function deckWarnings(content, cfg) {
  const warnings = [];
  if (!cfg.customer.trim())
    warnings.push("Chybí název zákazníka – na titulním slidu bude „vaše organizace“.");
  if (!cfg.topicIds.length) warnings.push("Nejsou vybrány žádné moduly.");
  const noNarration = selectedTopics(content, cfg.topicIds).filter(
    (t) => !String(t.narration || "").trim(),
  );
  if (noNarration.length)
    warnings.push("U některých modulů chybí komentář pro voice-over.");
  if (!cfg.includeReferences) warnings.push("Slide s referencemi je vypnutý.");
  if (cfg.includeReferences && !(content.referenceImages || {})[cfg.sector])
    warnings.push("Pro tento segment chybí obrázek referencí.");
  return warnings;
}
