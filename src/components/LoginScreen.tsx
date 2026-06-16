/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Lock, LogIn, Sparkles, CheckCircle2, Mail, UserPlus, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

interface LoginScreenProps {
  onLoginSuccess?: (username: string) => void;
  isSyncing?: boolean;
  scriptUrl?: string;
  onSaveUrl?: (url: string) => void;
}

export default function LoginScreen({ isSyncing = false }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [successAuth, setSuccessAuth] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Recovery (real Supabase email-based reset)
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");

  useEffect(() => {
    // If a recovery link brought the user here, surface helpful info.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setInfoMsg("Recovery link detected. Please sign in with a new password after resetting it via the email link.");
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg("Please fill in all credentials.");
      return;
    }

    setBusy(true);
    try {
      if (activeTab === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        if (data.user) setSuccessAuth(data.user.email ?? cleanEmail);
      } else {
        if (cleanPassword.length < 8) {
          setErrorMsg("Password must be at least 8 characters long.");
          return;
        }
        if (cleanPassword !== confirmPassword) {
          setErrorMsg("Passwords do not match.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        if (data.session && data.user) {
          setSuccessAuth(data.user.email ?? cleanEmail);
        } else {
          setInfoMsg("Account created. Check your email to confirm, then sign in.");
          setActiveTab("signin");
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg("");
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setErrorMsg(result.error instanceof Error ? result.error.message : "Google sign-in failed.");
      }
      // On success, onAuthStateChange in App will pick up the session.
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");
    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setRecoveryError("Enter the email used for your account.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setRecoveryError(error.message);
      return;
    }
    setRecoverySuccess("If an account exists for that email, a reset link has been sent.");
  };

  return (
    <div id="login-screen-bg" className="min-h-screen bg-[#f3f6fa] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-150 relative">

        <div id="login-header-banner" className="bg-[#0b1b3d] text-white p-7 relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="text-4xl p-3 bg-white/10 rounded-2xl mb-3" role="img" aria-label="Logo">📋</span>
            <h1 className="font-serif text-2xl font-black tracking-tight text-white leading-tight">
              Seating & RSVP Portal
            </h1>
            <p className="text-[10px] text-slate-350 font-bold tracking-widest mt-1.5 uppercase">
              Secure Account Gateway
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-extrabold tracking-wider bg-white/10 text-white/95">
              {isSyncing ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Server-Verified Auth</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-7">
          {successAuth ? (
            <div id="login-success-state" className="py-10 flex flex-col items-center text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-navy">Identity Verified</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Welcome, <br />
                  <span className="text-[#bf8f30] font-bold text-sm truncate block mt-1.5">{successAuth}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#bf8f30] mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                  Accounts are <span className="text-navy font-bold">server-verified</span> with encrypted passwords. Your reservations are private to your account.
                </p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-150 relative">
                <button
                  type="button"
                  onClick={() => { setActiveTab("signin"); setErrorMsg(""); }}
                  className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "signin" ? "bg-white text-navy shadow-xs" : "text-slate-500 hover:text-navy"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5" />Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("register"); setErrorMsg(""); }}
                  className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "register" ? "bg-white text-navy shadow-xs" : "text-slate-500 hover:text-navy"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />Create Account</span>
                </button>
              </div>

              <div className="space-y-4 pb-2">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleBusy}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-slate-50 text-[#1f1f1f] font-medium text-sm rounded-xl border border-slate-200 shadow-2xs cursor-pointer transition disabled:opacity-60"
                >
                  <GoogleIcon />
                  <span className="font-semibold text-xs tracking-wide">
                    {googleBusy ? "Redirecting to Google..." : "Continue with Google"}
                  </span>
                </button>
                <div className="flex items-center justify-center gap-2 py-0.5">
                  <span className="h-[1px] bg-slate-200 flex-grow" />
                  <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest px-1">or log in with credentials</span>
                  <span className="h-[1px] bg-slate-200 flex-grow" />
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest" htmlFor="login-email-input">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="login-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-gold rounded-xl text-navy font-bold text-xs focus:outline-none focus:ring-1 focus:ring-gold transition shadow-2xs"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest" htmlFor="login-password-input">
                      Password
                    </label>
                    {activeTab === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecoveryOpen(true);
                          setRecoveryError("");
                          setRecoverySuccess("");
                          setRecoveryEmail(email);
                        }}
                        className="text-[10px] text-indigo-650 hover:text-indigo-850 font-bold hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="login-password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={activeTab === "register" ? "Create a secure password (min 8)" : "Enter password"}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-gold rounded-xl text-navy font-bold text-xs focus:outline-none focus:ring-1 focus:ring-gold transition shadow-2xs"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {activeTab === "register" && (
                  <div className="space-y-1 animate-fadeIn">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest" htmlFor="login-confirm-password-input">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-confirm-password-input"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-gold rounded-xl text-navy font-bold text-xs focus:outline-none focus:ring-1 focus:ring-gold transition shadow-2xs"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl font-semibold leading-relaxed">
                    {errorMsg}
                  </div>
                )}
                {infoMsg && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl font-semibold leading-relaxed">
                    {infoMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-navy hover:bg-[#132852] text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-navy shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                >
                  {activeTab === "signin" ? (
                    <><LogIn className="w-3.5 h-3.5 text-gold" /><span>{busy ? "Signing in..." : "Unlock Workspace"}</span></>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5 text-gold" /><span>{busy ? "Creating..." : "Create Account"}</span></>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md">
          <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="h-1 bg-[#bf8f30]" />
            <div className="p-8">
              <h2 className="text-lg font-serif font-bold text-navy mb-2">Reset your password</h2>
              <p className="text-xs text-slate-600 mb-4">
                Enter the email used for your account. We'll send a secure password reset link.
              </p>
              <form onSubmit={handleRecoveryRequest} className="space-y-4">
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#bf8f30] rounded-xl text-navy font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#bf8f30]"
                />
                {recoveryError && <p className="text-[10px] text-rose-500 font-bold">⚠️ {recoveryError}</p>}
                {recoverySuccess && <p className="text-[11px] text-emerald-700 font-semibold">{recoverySuccess}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRecoveryOpen(false)}
                    className="flex-1 py-2 border border-slate-250 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-2 bg-navy hover:bg-[#132852] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
