// Přihlášení se dvěma sdílenými hesly:
//   USER_PASSWORD  – obchodník: výběr modulů, náhled, export PPTX/MP4
//   ADMIN_PASSWORD – administrátor: navíc úpravy knihovny obsahu
// Po přihlášení server vydá podepsanou HttpOnly cookie (HMAC-SHA256), bez databáze.
import crypto from "node:crypto";

const COOKIE = "vema_session";
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 12);
const IS_PROD = process.env.NODE_ENV === "production";

// Zpětná kompatibilita: původní APP_PASSWORD funguje jako heslo obchodníka.
let USER_PASSWORD = process.env.USER_PASSWORD || process.env.APP_PASSWORD || "";
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

if (!USER_PASSWORD || !ADMIN_PASSWORD) {
  if (IS_PROD) {
    console.error(
      "Chybí USER_PASSWORD nebo ADMIN_PASSWORD. V produkci je nutné nastavit obě hesla.",
    );
    process.exit(1);
  }
  USER_PASSWORD ||= "obchodnik";
  ADMIN_PASSWORD ||= "admin";
  console.warn(
    `[auth] Vývojový režim: hesla nejsou nastavená, používám výchozí ` +
      `(obchodník: "${USER_PASSWORD}", admin: "${ADMIN_PASSWORD}").`,
  );
}
if (USER_PASSWORD === ADMIN_PASSWORD) {
  console.error("USER_PASSWORD a ADMIN_PASSWORD musí být různá.");
  process.exit(1);
}

// Tajemství pro podpis cookie. Bez SESSION_SECRET se odvodí z hesel:
// změna hesla tak automaticky odhlásí všechny přihlášené.
const SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash("sha256").update(`vema|${USER_PASSWORD}|${ADMIN_PASSWORD}`).digest("hex");

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function sign(data) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

function issueToken(role) {
  const payload = Buffer.from(
    JSON.stringify({ role, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    if (data.role !== "user" && data.role !== "admin") return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(req, res, value, maxAgeSec) {
  const parts = [
    `${COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (req.secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

// Jednoduchá ochrana proti hádání hesla: max. 10 pokusů / 15 min z jedné IP.
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.since > 15 * 60 * 1000) {
    attempts.set(ip, { since: now, count: 0 });
    return false;
  }
  return entry.count >= 10;
}
function recordFailure(ip) {
  const entry = attempts.get(ip);
  if (entry) entry.count += 1;
}

/** Připojí session (pokud je) na req.session = { role }. */
export function sessionMiddleware(req, res, next) {
  req.session = readToken(parseCookies(req.headers.cookie)[COOKIE]);
  next();
}

export function requireLogin(req, res, next) {
  if (req.session) return next();
  res.status(401).json({ error: "Přihlaste se prosím." });
}

export function requireAdmin(req, res, next) {
  if (!req.session) return res.status(401).json({ error: "Přihlaste se prosím." });
  if (req.session.role !== "admin")
    return res.status(403).json({ error: "Tuto akci smí provést jen administrátor." });
  next();
}

export function authRoutes(app) {
  app.post("/api/auth/login", (req, res) => {
    const ip = req.ip || "unknown";
    if (tooManyAttempts(ip)) {
      return res.status(429).json({ error: "Příliš mnoho pokusů. Zkuste to za 15 minut." });
    }
    const password = String(req.body?.password || "");
    let role = null;
    if (password && safeEqual(password, ADMIN_PASSWORD)) role = "admin";
    else if (password && safeEqual(password, USER_PASSWORD)) role = "user";
    if (!role) {
      recordFailure(ip);
      return res.status(401).json({ error: "Nesprávné heslo." });
    }
    attempts.delete(ip);
    setCookie(req, res, issueToken(role), SESSION_HOURS * 3600);
    res.json({ role });
  });

  app.post("/api/auth/logout", (req, res) => {
    setCookie(req, res, "", 0);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session) return res.status(401).json({ error: "Nepřihlášen." });
    res.json({ role: req.session.role });
  });
}
