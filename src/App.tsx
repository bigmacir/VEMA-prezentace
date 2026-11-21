import { useEffect, useRef, useState } from "react";
import { fetchContent, getSession, logout } from "./api";
import { EMPTY_CFG, type BuilderCfg, type Content, type Role } from "./types";
import { Builder } from "./pages/Builder";
import { Admin } from "./pages/Admin";
import { Help } from "./pages/Help";
import { Login } from "./pages/Login";

type Route = "builder" | "admin" | "help";

const LS_KEY = "vema-poc-cfg-v1";

export default function App() {
  // undefined = ještě ověřuji, null = nepřihlášen
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>("builder");
  const [cfg, setCfgState] = useState<BuilderCfg>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? { ...EMPTY_CFG, ...JSON.parse(raw) } : EMPTY_CFG;
    } catch {
      return EMPTY_CFG;
    }
  });
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const timer = useRef<number | null>(null);

  const notify = (msg: string, err = false) => {
    setToast({ msg, err });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4200);
  };

  const setCfg = (next: BuilderCfg) => {
    setCfgState(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  useEffect(() => {
    getSession()
      .then((s) => setRole(s?.role ?? null))
      .catch(() => setRole(null));
    const onUnauthorized = () => setRole(null);
    window.addEventListener("vema:unauthorized", onUnauthorized);
    return () => window.removeEventListener("vema:unauthorized", onUnauthorized);
  }, []);

  useEffect(() => {
    if (!role) return;
    setError(null);
    fetchContent()
      .then(setContent)
      .catch((e) => setError(e.message || "Nepodařilo se načíst obsah."));
  }, [role]);

  // Obchodník do administrace nesmí – kdyby tam zůstal po odhlášení admina.
  useEffect(() => {
    if (role === "user" && route === "admin") setRoute("builder");
  }, [role, route]);

  async function handleLogout() {
    await logout().catch(() => {});
    setRole(null);
    setContent(null);
    setRoute("builder");
  }

  if (role === undefined) {
    return <div className="empty" style={{ padding: 48 }}>Načítám…</div>;
  }
  if (role === null) {
    return <Login onLogin={setRole} />;
  }

  const isAdmin = role === "admin";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="side-brand">
          <img src="/brand/vema-logo-white.png" alt="Vema" />
          <small>prezentér</small>
        </div>
        <nav className="side-nav">
          <button className={route === "builder" ? "is-active" : ""} onClick={() => setRoute("builder")}>
            <span className="ico">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <span className="txt">Nová prezentace</span>
          </button>
          {isAdmin && (
          <button className={route === "admin" ? "is-active" : ""} onClick={() => setRoute("admin")}>
            <span className="ico">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16.5A1.5 1.5 0 0 1 18.5 21H6.5A2.5 2.5 0 0 1 4 18.5Z" />
                <path d="M8 7h8M8 11h8M8 15h5" />
              </svg>
            </span>
            <span className="txt">Knihovna obsahu</span>
          </button>
          )}
          <button className={route === "help" ? "is-active" : ""} onClick={() => setRoute("help")}>
            <span className="ico">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16.5v.5M9.6 9.2a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.3 1-1.3 2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="txt">Jak to funguje</span>
          </button>
        </nav>
        <div className="side-note">
          <b>Proof of concept</b>
          Data z podkladů Vema. AI používáme jen na voice-over.
          <span className="tag">VEŘEJNÁ DATA</span>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div>
            <h1>Vema prezentér</h1>
            <div className="sub">Konfigurátor obchodních prezentací · proof of concept</div>
          </div>
          <div className="topbar-actions">
            {content && <span className="demo-badge">Interní ukázka · verze {content.meta.version}</span>}
            <span className={`role-badge ${isAdmin ? "is-admin" : ""}`}>
              {isAdmin ? "Administrátor" : "Obchodník"}
            </span>
            <button className="btn btn-sm" onClick={handleLogout}>
              Odhlásit
            </button>
          </div>
        </div>

        {error && (
          <div className="page">
            <div className="card card-pad">
              <b>Obsah se nepodařilo načíst.</b>
              <p className="small muted">{error}</p>
              <p className="small muted">
                Spusťte prosím backend: <code>npm run dev</code> (API běží na portu 8787).
              </p>
            </div>
          </div>
        )}

        {!error && !content && (
          <div className="page">
            <div className="empty">Načítám knihovnu obsahu…</div>
          </div>
        )}

        {content && route === "builder" && (
          <Builder
            content={content}
            setContent={setContent}
            cfg={cfg}
            setCfg={setCfg}
            notify={notify}
            isAdmin={isAdmin}
          />
        )}
        {content && isAdmin && route === "admin" && (
          <Admin content={content} setContent={setContent} notify={notify} />
        )}
        {content && route === "help" && <Help content={content} />}
      </div>

      {toast && <div className={`toast ${toast.err ? "err" : ""}`}>{toast.msg}</div>}
    </div>
  );
}
