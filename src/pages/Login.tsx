import { useState, type FormEvent } from "react";
import { login } from "../api";
import type { Role } from "../types";

export function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      const { role } = await login(password);
      onLogin(role);
    } catch (err) {
      setError((err as Error).message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <img src="/brand/vema-logo-white.png" alt="Vema" />
          <span>prezentér</span>
        </div>
        <div className="login-body">
          <h2>Přihlášení</h2>
          <p className="small muted" style={{ marginTop: 0, lineHeight: 1.55 }}>
            Zadejte heslo obchodníka (sestavení a export prezentací) nebo heslo administrátora
            (navíc úpravy knihovny obsahu).
          </p>
          <div className="field">
            <label htmlFor="pw">Heslo</label>
            <input
              id="pw"
              className="input"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
            disabled={busy || !password}
          >
            {busy ? "Přihlašuji…" : "Přihlásit"}
          </button>
        </div>
      </form>
    </div>
  );
}
