import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";
import sharp from "sharp";
import { THEME, FONT, SLIDE } from "../shared/theme.js";
import { buildDeck, enrichTopic, modulesLabel } from "../shared/model.js";
import { categoryWheelSVG } from "../shared/wheel.js";

const W = SLIDE.width;
const H = SLIDE.height;
const M = 0.72;
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

const C = {
  navy: THEME.navy.replace("#", ""),
  primary: THEME.primary.replace("#", ""),
  accent: THEME.accent.replace("#", ""),
  ink: THEME.ink.replace("#", ""),
  muted: THEME.muted.replace("#", ""),
  line: THEME.line.replace("#", ""),
  white: "FFFFFF",
  darkText: "A8C4D4",
  danger: "C0364A",
};

function fileDataUri(relPath) {
  const file = path.join(PUBLIC, relPath.replace(/^\//, ""));
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
  return `${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

const LOGO = fileDataUri("brand/vema-logo.png");
const LOGO_WHITE = fileDataUri("brand/vema-logo-white.png");

export function slugify(text) {
  return (
    String(text || "nabidka")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "nabidka"
  );
}

async function wheelPng({ categories, topics, selectedIds, currentCategoryId }, size = 1100) {
  const svg = categoryWheelSVG({ categories, topics, selectedIds, currentCategoryId, size });
  const png = await sharp(Buffer.from(svg), { density: 200 }).png().toBuffer();
  return `image/png;base64,${png.toString("base64")}`;
}

function addLogo(slide, { dark = false, x = M, y = 0.42, height = 0.42 } = {}) {
  const ratio = 477 / 147;
  slide.addImage({ data: dark ? LOGO_WHITE : LOGO, x, y, w: height * ratio, h: height });
}

function footer(slide, { page, confidentiality, dark = false }) {
  const lineColor = dark ? "1B4A5E" : C.line;
  const textColor = dark ? "86A9BB" : "7D8E9C";
  slide.addShape("rect", {
    x: M, y: H - 0.62, w: W - M * 2, h: 0.012,
    fill: { color: lineColor }, line: { color: lineColor, width: 0 },
  });
  slide.addText("Vema · personální a mzdové systémy · vema.cz", {
    x: M, y: H - 0.55, w: 6.5, h: 0.3,
    fontFace: FONT, fontSize: 8, color: textColor, valign: "middle", margin: 0,
  });
  const pillW = 1.15;
  const pillX = W - M - pillW;
  slide.addShape("roundRect", {
    x: pillX, y: H - 0.57, w: pillW, h: 0.26,
    fill: { color: dark ? "123F52" : "F3F6F9" },
    line: { color: dark ? "2A5A6E" : "E3EAF1", width: 0.75 },
    rectRadius: 0.13,
  });
  slide.addText(confidentiality, {
    x: pillX, y: H - 0.57, w: pillW, h: 0.26,
    fontFace: FONT, fontSize: 7.5, bold: true, color: dark ? "FFC9D1" : C.danger,
    align: "center", valign: "middle", charSpacing: 1, margin: 0,
  });
  slide.addText(String(page).padStart(2, "0"), {
    x: pillX - 0.55, y: H - 0.55, w: 0.45, h: 0.3,
    fontFace: FONT, fontSize: 8, color: textColor, align: "right", valign: "middle", margin: 0,
  });
}

function eyebrow(slide, text, { x = M, y = 1.02, w = 6, color = C.primary } = {}) {
  slide.addText(String(text || "").toUpperCase(), {
    x, y, w, h: 0.28,
    fontFace: FONT, fontSize: 9, bold: true, color, charSpacing: 1.6,
    valign: "middle", margin: 0,
  });
}

function header(slide, s, { width = 11.8 } = {}) {
  addLogo(slide);
  eyebrow(slide, s.eyebrow, { y: 1.02 });
  slide.addText(s.title, {
    x: M, y: 1.3, w: width, h: 0.75,
    fontFace: FONT, fontSize: 27, bold: true, color: C.navy, valign: "middle", margin: 0,
  });
  slide.addText(`${String(s.page).padStart(2, "0")} / ${String(s.totalPages).padStart(2, "0")}`, {
    x: W - M - 1.2, y: 0.5, w: 1.2, h: 0.32,
    fontFace: FONT, fontSize: 9, color: "93A4B2", align: "right", valign: "middle", margin: 0,
  });
}

function coverSlide(s, slide) {
  s.background = { color: C.navy };
  s.addShape("ellipse", {
    x: 8.3, y: -1.7, w: 7.2, h: 7.2,
    fill: { color: C.primary, transparency: 100 },
    line: { color: "1E5670", width: 1.1 },
  });
  s.addShape("ellipse", {
    x: 10.1, y: 4.1, w: 4.8, h: 4.8,
    fill: { color: C.primary, transparency: 82 }, line: { color: C.primary, width: 0 },
  });
  s.addShape("ellipse", {
    x: 11.35, y: 0.95, w: 1.25, h: 1.25,
    fill: { color: C.accent, transparency: 90 }, line: { color: C.accent, width: 1 },
  });
  addLogo(s, { dark: true, y: 0.55, height: 0.5 });
  s.addShape("rect", {
    x: M, y: 2.05, w: 0.62, h: 0.065,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
  eyebrow(s, slide.eyebrow, { y: 2.3, color: C.accent });
  s.addText(slide.title, {
    x: M, y: 2.62, w: 8.5, h: 1.9,
    fontFace: FONT, fontSize: 36, bold: true, color: C.white,
    lineSpacingMultiple: 1.02, valign: "top", margin: 0,
  });
  s.addText(slide.subtitle, {
    x: M, y: 4.58, w: 8.5, h: 0.55,
    fontFace: FONT, fontSize: 19, color: "BBD6E5", valign: "middle", margin: 0,
  });
  const metaY = 5.62;
  (slide.meta || []).forEach((item, i) => {
    const x = M + i * 2.85;
    s.addText(String(item.label).toUpperCase(), {
      x, y: metaY, w: 2.7, h: 0.24,
      fontFace: FONT, fontSize: 7.5, bold: true, color: "6F95A8", charSpacing: 1.2, margin: 0,
    });
    s.addText(item.value, {
      x, y: metaY + 0.26, w: 2.7, h: 0.36,
      fontFace: FONT, fontSize: 11, color: C.white, margin: 0,
    });
  });
  footer(s, { page: slide.page, confidentiality: slide.confidentiality, dark: true });
}

function overviewSlide(s, slide) {
  s.background = { color: C.white };
  addLogo(s);
  s.addText(`${String(slide.page).padStart(2, "0")} / ${String(slide.totalPages).padStart(2, "0")}`, {
    x: W - M - 1.2, y: 0.5, w: 1.2, h: 0.32,
    fontFace: FONT, fontSize: 9, color: "93A4B2", align: "right", valign: "middle", margin: 0,
  });
  s.addImage({ data: slide.wheelData, x: 0.25, y: 1.25, w: 5.55, h: 5.55 });

  const x = 6.35;
  eyebrow(s, slide.eyebrow, { x, y: 1.35 });
  s.addText(slide.title, {
    x, y: 1.63, w: 6.2, h: 0.7,
    fontFace: FONT, fontSize: 27, bold: true, color: C.navy, valign: "middle", margin: 0,
  });
  s.addText(slide.subtitle, {
    x, y: 2.38, w: 6.2, h: 0.4,
    fontFace: FONT, fontSize: 11.5, color: C.muted, margin: 0,
  });
  const groups = slide.groups.slice(0, 6);
  const rowH = 0.58;
  groups.forEach((g, i) => {
    const y = 3.0 + i * rowH;
    s.addShape("ellipse", {
      x, y: y + rowH / 2 - 0.055, w: 0.11, h: 0.11,
      fill: { color: g.color.replace("#", "") }, line: { color: g.color.replace("#", ""), width: 0 },
    });
    s.addText(g.name, {
      x: x + 0.25, y, w: 4.4, h: rowH,
      fontFace: FONT, fontSize: 11, bold: true, color: C.navy, valign: "middle", margin: 0,
    });
    s.addText(modulesLabel(g.topics.length), {
      x: x + 4.75, y, w: 1.35, h: rowH,
      fontFace: FONT, fontSize: 9, color: "8A9AA7", align: "right", valign: "middle", margin: 0,
    });
    s.addShape("rect", {
      x, y: y + rowH - 0.01, w: 6.1, h: 0.008,
      fill: { color: "EDF2F7" }, line: { color: "EDF2F7", width: 0 },
    });
  });
  s.addText(`Celkem ${modulesLabel(slide.topics.length)}`, {
    x, y: 6.55, w: 6.1, h: 0.3,
    fontFace: FONT, fontSize: 10, color: C.muted, margin: 0,
  });
  footer(s, { page: slide.page, confidentiality: slide.confidentiality });
}

function companySlide(s, slide) {
  s.background = { color: C.white };
  header(s, slide);
  s.addText((slide.paragraphs || []).join("\n\n"), {
    x: M, y: 2.3, w: 7.1, h: 2.45,
    fontFace: FONT, fontSize: 10.3, color: C.ink, lineSpacingMultiple: 1.24, valign: "top", margin: 0,
  });
  (slide.timeline || []).slice(0, 4).forEach((item, i) => {
    const tx = M + (i % 2) * 3.7;
    const ty = 4.95 + Math.floor(i / 2) * 0.82;
    s.addText(item.year, {
      x: tx, y: ty, w: 0.9, h: 0.55,
      fontFace: FONT, fontSize: 15, bold: true, color: C.primary, valign: "top", margin: 0,
    });
    s.addText(item.text, {
      x: tx + 0.95, y: ty, w: 2.55, h: 0.72,
      fontFace: FONT, fontSize: 7.6, color: C.muted, lineSpacingMultiple: 1.1, valign: "top", margin: 0,
    });
  });

  const cardX = 8.35;
  s.addShape("roundRect", {
    x: cardX, y: 2.1, w: 4.25, h: 2.45,
    fill: { color: "F5F9FE" }, line: { color: "E1EBF5", width: 1 }, rectRadius: 0.08,
  });
  (slide.stats || []).slice(0, 4).forEach((stat, i) => {
    const sx = cardX + 0.32 + (i % 2) * 1.95;
    const sy = 2.4 + Math.floor(i / 2) * 0.95;
    s.addText(stat.value, {
      x: sx, y: sy, w: 1.8, h: 0.45,
      fontFace: FONT, fontSize: 21, bold: true, color: C.primary, margin: 0,
    });
    s.addText(stat.label, {
      x: sx, y: sy + 0.45, w: 1.8, h: 0.3,
      fontFace: FONT, fontSize: 7.5, color: C.muted, margin: 0,
    });
  });
  (slide.bullets || []).slice(0, 4).forEach((b, i) => {
    const by = 4.95 + i * 0.42;
    s.addShape("rect", {
      x: cardX, y: by + 0.03, w: 0.065, h: 0.3,
      fill: { color: C.accent }, line: { color: C.accent, width: 0 },
    });
    s.addText(b, {
      x: cardX + 0.18, y: by, w: 4.0, h: 0.38,
      fontFace: FONT, fontSize: 8.4, color: C.muted, valign: "middle", margin: 0,
    });
  });
  footer(s, { page: slide.page, confidentiality: slide.confidentiality });
}

function topicSlide(s, slide) {
  const topic = slide.topic;
  s.background = { color: C.white };
  s.addShape("rect", {
    x: 0, y: 0, w: W, h: 0.11,
    fill: { color: C.primary }, line: { color: C.primary, width: 0 },
  });
  addLogo(s);
  s.addText(`${String(slide.page).padStart(2, "0")} / ${String(slide.totalPages).padStart(2, "0")}`, {
    x: W - M - 1.2, y: 0.5, w: 1.2, h: 0.32,
    fontFace: FONT, fontSize: 9, color: "93A4B2", align: "right", valign: "middle", margin: 0,
  });
  s.addImage({ data: slide.wheelData, x: 0.22, y: 1.2, w: 5.55, h: 5.55 });

  const x = 6.45;
  eyebrow(s, slide.eyebrow, { x, y: 1.18, w: 4.6, color: topic.categoryColor.replace("#", "") });
  if (slide.badge) {
    s.addShape("roundRect", {
      x: x + 4.55, y: 1.13, w: 1.15, h: 0.32,
      fill: { color: "EAF9D9" }, line: { color: "C9EDA0", width: 0.75 }, rectRadius: 0.16,
    });
    s.addText(String(slide.badge).toUpperCase(), {
      x: x + 4.55, y: 1.13, w: 1.15, h: 0.32,
      fontFace: FONT, fontSize: 7, bold: true, color: "0B5C2E", align: "center", valign: "middle", charSpacing: 0.8, margin: 0,
    });
  }
  s.addText(slide.title, {
    x, y: 1.52, w: 6.15, h: 0.82,
    fontFace: FONT, fontSize: 27, bold: true, color: C.navy, valign: "middle", margin: 0,
  });
  s.addText(slide.subtitle || "", {
    x, y: 2.34, w: 6.15, h: 0.42,
    fontFace: FONT, fontSize: 12.5, color: C.muted, valign: "middle", margin: 0,
  });
  s.addShape("rect", {
    x, y: 2.93, w: 0.55, h: 0.045,
    fill: { color: topic.categoryColor.replace("#", "") }, line: { color: topic.categoryColor.replace("#", ""), width: 0 },
  });
  s.addText(slide.description || "", {
    x, y: 3.12, w: 6.1, h: 1.05,
    fontFace: FONT, fontSize: 10.2, color: C.ink, lineSpacingMultiple: 1.24, valign: "top", margin: 0,
  });
  (slide.bullets || []).slice(0, 5).forEach((b, i) => {
    const by = 4.22 + i * 0.42;
    s.addShape("ellipse", {
      x, y: by + 0.14, w: 0.075, h: 0.075,
      fill: { color: C.accent }, line: { color: C.accent, width: 0 },
    });
    s.addText(b, {
      x: x + 0.22, y: by, w: 5.9, h: 0.38,
      fontFace: FONT, fontSize: 9.4, color: C.ink, valign: "middle", margin: 0,
    });
  });
  footer(s, { page: slide.page, confidentiality: slide.confidentiality });
}

function referencesSlide(s, slide) {
  s.background = { color: C.white };
  const data = fileDataUri(slide.image);
  s.addImage({ data, x: 0, y: 0, w: W, h: H });
  s.addShape("roundRect", {
    x: M, y: H - 0.55, w: 1.2, h: 0.28,
    fill: { color: "FFFFFF", transparency: 12 },
    line: { color: "E3EAF1", width: 0.75 }, rectRadius: 0.14,
  });
  s.addText(slide.confidentiality, {
    x: M, y: H - 0.55, w: 1.2, h: 0.28,
    fontFace: FONT, fontSize: 7.5, bold: true, color: C.danger,
    align: "center", valign: "middle", charSpacing: 1, margin: 0,
  });
  s.addText(String(slide.page).padStart(2, "0"), {
    x: M + 1.35, y: H - 0.55, w: 0.5, h: 0.28,
    fontFace: FONT, fontSize: 8, color: "93A4B2", valign: "middle", margin: 0,
  });
}

function summaryColumns(s, slide) {
  const groups = slide.groups || [];
  const lineHeight = 0.205;
  const headerHeight = 0.27;
  const totalLines = groups.reduce((sum, g) => sum + 1 + g.topics.length, 0);
  const perColumn = Math.ceil(totalLines / 2);

  let col = 0;
  let y = 2.1;
  let lines = 0;
  const colX = [M, 4.75];

  groups.forEach((g) => {
    const needed = 1 + g.topics.length;
    if (col === 0 && lines + needed > perColumn && lines > 0) {
      col = 1;
      y = 2.1;
      lines = 0;
    }
    const x = colX[col];
    s.addShape("ellipse", {
      x, y: y + 0.09, w: 0.09, h: 0.09,
      fill: { color: g.color.replace("#", "") }, line: { color: g.color.replace("#", ""), width: 0 },
    });
    s.addText(g.name.toUpperCase(), {
      x: x + 0.18, y, w: 3.55, h: headerHeight,
      fontFace: FONT, fontSize: 7.4, bold: true, color: C.navy, charSpacing: 0.4, valign: "middle", margin: 0,
    });
    y += headerHeight;
    g.topics.forEach((t) => {
      s.addText(t.title, {
        x: x + 0.22, y, w: 3.5, h: lineHeight,
        fontFace: FONT, fontSize: 7.8, color: "435A6C", valign: "middle", margin: 0,
      });
      y += lineHeight;
      lines += 1;
    });
    lines += 1;
    y += 0.08;
  });
}

function summarySlide(s, slide) {
  s.background = { color: C.white };
  header(s, slide);
  summaryColumns(s, slide);

  const cardX = 8.85;
  let y = 2.1;
  if (slide.excelUrl) {
    s.addShape("roundRect", {
      x: cardX, y, w: 3.77, h: 0.75,
      fill: { color: "F1F7FF" }, line: { color: "D8E7FB", width: 1 }, rectRadius: 0.06,
    });
    s.addText("Podrobná kalkulace (Excel)", {
      x: cardX + 0.25, y: y + 0.12, w: 3.3, h: 0.24,
      fontFace: FONT, fontSize: 8, bold: true, color: C.primary, margin: 0,
    });
    s.addText(slide.excelUrl, {
      x: cardX + 0.25, y: y + 0.34, w: 3.3, h: 0.28,
      fontFace: FONT, fontSize: 8.5, color: C.muted, hyperlink: { url: slide.excelUrl }, margin: 0,
    });
    y += 0.92;
  }
  if (slide.note) {
    s.addText(slide.note, {
      x: cardX, y, w: 3.77, h: 1.0,
      fontFace: FONT, fontSize: 8, color: C.muted, lineSpacingMultiple: 1.15, valign: "top", margin: 0,
    });
  }
  s.addText(`Nabídka obsahuje ${slide.countLabel || modulesLabel(slide.count)}.`, {
    x: M, y: 6.2, w: 7.6, h: 0.3,
    fontFace: FONT, fontSize: 7.5, color: "94A3B0", margin: 0,
  });
  footer(s, { page: slide.page, confidentiality: slide.confidentiality });
}

function contactSlide(s, slide) {
  s.background = { color: C.navy };
  s.addShape("ellipse", {
    x: 9.0, y: -1.9, w: 6.5, h: 6.5,
    fill: { color: C.primary, transparency: 100 }, line: { color: "1E5670", width: 1 },
  });
  addLogo(s, { dark: true, y: 0.5, height: 0.5 });
  eyebrow(s, slide.eyebrow, { y: 1.55, color: C.accent });
  s.addText(slide.title, {
    x: M, y: 1.9, w: 6.6, h: 1.0,
    fontFace: FONT, fontSize: 31, bold: true, color: C.white, margin: 0,
  });
  s.addText(slide.subtitle, {
    x: M, y: 2.92, w: 6.2, h: 0.5,
    fontFace: FONT, fontSize: 13, color: "BBD6E5", margin: 0,
  });

  s.addShape("roundRect", {
    x: M, y: 3.75, w: 5.4, h: 2.05,
    fill: { color: "0B3B52" }, line: { color: "1B5670", width: 1 }, rectRadius: 0.08,
  });
  s.addText(slide.salesperson.name, {
    x: M + 0.32, y: 3.96, w: 4.8, h: 0.4,
    fontFace: FONT, fontSize: 16, bold: true, color: C.white, margin: 0,
  });
  s.addText(slide.salesperson.role, {
    x: M + 0.32, y: 4.34, w: 4.8, h: 0.3,
    fontFace: FONT, fontSize: 9.5, color: "9FC2D2", margin: 0,
  });
  s.addText(
    [
      { text: slide.salesperson.phone, options: { color: C.white, bold: true } },
      { text: "     " + slide.salesperson.email, options: { color: "CFE6F1" } },
    ],
    {
      x: M + 0.32, y: 4.88, w: 4.85, h: 0.35,
      fontFace: FONT, fontSize: 10.5, margin: 0,
    },
  );
  if (slide.salesperson.note) {
    s.addText(slide.salesperson.note, {
      x: M + 0.32, y: 5.38, w: 4.6, h: 0.22,
      fontFace: FONT, fontSize: 6.8, color: "6F95A8", margin: 0,
    });
  }

  const x = 7.15;
  s.addText("DALŠÍ KROKY", {
    x, y: 3.78, w: 4.9, h: 0.28,
    fontFace: FONT, fontSize: 8, bold: true, color: C.accent, charSpacing: 1.4, margin: 0,
  });
  (slide.nextSteps || []).slice(0, 4).forEach((step, i) => {
    const y = 4.18 + i * 0.55;
    s.addText(String(i + 1).padStart(2, "0"), {
      x, y, w: 0.45, h: 0.4,
      fontFace: FONT, fontSize: 10, bold: true, color: C.accent, valign: "top", margin: 0,
    });
    s.addText(step, {
      x: x + 0.48, y, w: 4.45, h: 0.48,
      fontFace: FONT, fontSize: 9.5, color: "D6E8F1", valign: "top", margin: 0,
    });
  });
  footer(s, { page: slide.page, confidentiality: slide.confidentiality, dark: true });
}

/**
 * Vygeneruje PPTX a vrátí Buffer.
 * @param {object} content
 * @param {object} cfg
 */
export async function buildPptx(content, cfg) {
  const deck = buildDeck(content, cfg);

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "VEMA_16x9", width: W, height: H });
  pptx.layout = "VEMA_16x9";
  pptx.author = "Vema prezentér (PoC)";
  pptx.company = "Vema";
  pptx.subject = "Obchodní nabídka";
  pptx.title = `Nabídka Vema – ${deck.cfg.customer || "zákazník"}`;

  const allTopics = content.topics
    .filter((t) => t.enabled !== false)
    .map((t) => enrichTopic(content, t));
  const selectedIds = deck.topics.map((t) => t.id);

  const wheelCache = new Map();
  async function wheelFor(currentCategoryId) {
    const key = currentCategoryId || "__all__";
    if (!wheelCache.has(key)) {
      wheelCache.set(
        key,
        await wheelPng({
          categories: content.categories,
          topics: allTopics,
          selectedIds,
          currentCategoryId,
        }),
      );
    }
    return wheelCache.get(key);
  }

  const overviewWheel = await wheelFor(null);

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    slide.page = i + 1;
    slide.totalPages = deck.slides.length;
    const s = pptx.addSlide();
    s.addNotes(slide.narration || "");

    if (slide.type === "cover") {
      coverSlide(s, slide);
    } else if (slide.type === "overview") {
      slide.wheelData = overviewWheel;
      overviewSlide(s, slide);
    } else if (slide.type === "company") {
      companySlide(s, slide);
    } else if (slide.type === "topic") {
      slide.wheelData = await wheelFor(slide.topic.categoryId);
      topicSlide(s, slide);
    } else if (slide.type === "references") {
      referencesSlide(s, slide);
    } else if (slide.type === "summary") {
      summarySlide(s, slide);
    } else if (slide.type === "contact") {
      contactSlide(s, slide);
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return { buffer, deck, filename: `VEMA-nabidka-${slugify(cfg.customer)}.pptx` };
}
