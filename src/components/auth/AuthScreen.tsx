import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setNotice(
          "Account created. If a confirmation email is required, check your inbox to finish signing in.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Could not sign in with Google. Please try again.");
        setBusy(false);
        return;
      }
      if (result.redirected) return; // browser navigates away
    } catch {
      setError("Could not sign in with Google. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="gm gm-auth">
      <div className="gm-auth-card">
        <div className="gm-auth-brand">
          <h1>Reservation Management</h1>
          <p>Smart restaurant reservations</p>
        </div>

        <h2 className="gm-auth-title">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h2>

        <button
          type="button"
          className="gm-auth-google"
          onClick={handleGoogle}
          disabled={busy}
        >
          <span style={{ fontSize: 18 }}>🇬</span> Continue with Google
        </button>

        <div className="gm-auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleEmail} className="gm-auth-form">
          <label className="gm-auth-label">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
            />
          </label>
          <label className="gm-auth-label">
            Password
            <input
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="gm-auth-error">{error}</p>}
          {notice && <p className="gm-auth-notice">{notice}</p>}

          <button
            type="submit"
            className="gm-btn gm-btn-primary gm-auth-submit"
            disabled={busy}
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="gm-auth-toggle">
          {mode === "signin"
            ? "New to Reservation Management?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setNotice("");
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
