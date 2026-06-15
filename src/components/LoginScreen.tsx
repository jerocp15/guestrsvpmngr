/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Lock, LogIn, Sparkles, CheckCircle2, Mail, UserPlus, HelpCircle, Eye, EyeOff } from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
  isSyncing?: boolean;
  scriptUrl?: string;
  onSaveUrl?: (url: string) => void;
}

export default function LoginScreen({
  onLoginSuccess,
  isSyncing = false,
  scriptUrl,
  onSaveUrl
}: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successAuth, setSuccessAuth] = useState<string | null>(null);
  const [showSyncConfig, setShowSyncConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState(scriptUrl || "");

  // Google State variables
  const [isGoogleUiOpen, setIsGoogleUiOpen] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState("");
  const [googleCustomEmail, setGoogleCustomEmail] = useState("");
  const [showGoogleCustomInput, setShowGoogleCustomInput] = useState(false);
  const [googleError, setGoogleError] = useState("");

  // Password Visibility toggling
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Recovery States
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");
  const [recoveredAccount, setRecoveredAccount] = useState<{ email: string; password?: string } | null>(null);
  const [newRecoveryPassword, setNewRecoveryPassword] = useState("");
  const [showNewRecoveryPassword, setShowNewRecoveryPassword] = useState(false);

  const handleVerifyRecoveryEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");
    setRecoveredAccount(null);

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setRecoveryError("Please enter a valid Gmail address.");
      return;
    }

    const registryKey = "guest_rsvp_mngr_global_user_registry";
    let registryList: Array<{ email: string; password?: string }> = [];
    const registryStr = localStorage.getItem(registryKey);
    if (registryStr) {
      try {
        registryList = JSON.parse(registryStr);
      } catch (err) {
        registryList = [];
      }
    }

    const account = registryList.find(acc => acc.email.toLowerCase().trim() === cleanEmail);
    if (!account) {
      setRecoveryError("Gmail address not found in this browser's registered accounts.");
      return;
    }

    setRecoveredAccount(account);
    setRecoverySuccess("Workspace located! Overwrite your password or reveal it below.");
  };

  const handleUpdateRecoveryPassword = () => {
    if (!recoveredAccount) return;
    setRecoveryError("");

    const cleanNewPass = newRecoveryPassword.trim();
    if (cleanNewPass.length < 5) {
      setRecoveryError("New password must be at least 5 characters long.");
      return;
    }

    const registryKey = "guest_rsvp_mngr_global_user_registry";
    let registryList: Array<{ email: string; password?: string }> = [];
    const registryStr = localStorage.getItem(registryKey);
    if (registryStr) {
      try {
        registryList = JSON.parse(registryStr);
      } catch (err) {
        registryList = [];
      }
    }

    const updatedRegistry = registryList.map(acc => {
      if (acc.email.toLowerCase().trim() === recoveredAccount.email.toLowerCase().trim()) {
        return { ...acc, password: cleanNewPass };
      }
      return acc;
    });

    localStorage.setItem(registryKey, JSON.stringify(updatedRegistry));
    setRecoverySuccess(`Password for ${recoveredAccount.email} updated successfully!`);
    
    setTimeout(() => {
      setIsRecoveryOpen(false);
      setEmail(recoveredAccount.email);
      setRecoveryEmail("");
      setRecoveredAccount(null);
      setNewRecoveryPassword("");
      setRecoverySuccess("");
    }, 2000);
  };

  const handleGoogleAuth = (selectedEmail: string) => {
    setGoogleError("");
    const cleanEmail = selectedEmail.trim().toLowerCase();
    
    if (!cleanEmail) {
      setGoogleError("Please enter a valid Google account email.");
      return;
    }

    if (!cleanEmail.endsWith("@gmail.com")) {
      setGoogleError("Please use a valid Gmail address (ending in @gmail.com).");
      return;
    }

    setIsGoogleSigningIn(true);
    setSelectedGoogleEmail(cleanEmail);

    // Simulate authentic Google verification and handoff sequence
    setTimeout(() => {
      const registryKey = "guest_rsvp_mngr_global_user_registry";
      let registryList: Array<{ email: string; password?: string }> = [];
      const registryStr = localStorage.getItem(registryKey);
      if (registryStr) {
        try {
          registryList = JSON.parse(registryStr);
        } catch (err) {
          registryList = [];
        }
      }

      const exists = registryList.some(acc => acc.email.toLowerCase().trim() === cleanEmail);
      if (!exists) {
        const updatedRegistry = [...registryList, { email: cleanEmail, password: "google_authenticated_user" }];
        localStorage.setItem(registryKey, JSON.stringify(updatedRegistry));
      }

      setIsGoogleSigningIn(false);
      setIsGoogleUiOpen(false);
      triggerSuccess(cleanEmail);
    }, 1200);
  };

  useEffect(() => {
    if (scriptUrl) {
      setTempUrl(scriptUrl || "");
    }
  }, [scriptUrl]);

  // Seed default demo account if registration registry is empty
  useEffect(() => {
    const registryKey = "guest_rsvp_mngr_global_user_registry";
    const registryStr = localStorage.getItem(registryKey);
    if (!registryStr) {
      const demoAccounts = [
        { email: "demo@gmail.com", password: "demopassword" }
      ];
      localStorage.setItem(registryKey, JSON.stringify(demoAccounts));
    }
  }, []);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg("Please fill in all credentials.");
      return;
    }

    if (!cleanEmail.endsWith("@gmail.com")) {
      setErrorMsg("Please use a valid Gmail address (ending in @gmail.com).");
      return;
    }

    const registryKey = "guest_rsvp_mngr_global_user_registry";
    let registryList: Array<{ email: string; password?: string }> = [];
    const registryStr = localStorage.getItem(registryKey);
    if (registryStr) {
      try {
        registryList = JSON.parse(registryStr);
      } catch (err) {
        registryList = [];
      }
    }

    if (activeTab === "signin") {
      // Find matches in registered list
      const match = registryList.find(acc => acc.email.toLowerCase().trim() === cleanEmail);
      if (match && match.password === cleanPassword) {
        triggerSuccess(cleanEmail);
      } else {
        setErrorMsg("Incorrect Gmail address or password. Are you registered on this browser?");
      }
    } else {
      // Register Mode
      if (cleanPassword.length < 5) {
        setErrorMsg("Password must be at least 5 characters long.");
        return;
      }
      if (cleanPassword !== confirmPassword.trim()) {
        setErrorMsg("Passwords do not match.");
        return;
      }

      const exists = registryList.some(acc => acc.email.toLowerCase().trim() === cleanEmail);
      if (exists) {
        setErrorMsg("This Gmail address is already registered. Please sign in instead.");
        return;
      }

      // Add to global user registry
      const updatedRegistry = [...registryList, { email: cleanEmail, password: cleanPassword }];
      localStorage.setItem(registryKey, JSON.stringify(updatedRegistry));

      triggerSuccess(cleanEmail);
    }
  };

  const triggerSuccess = (loggedEmail: string) => {
    setSuccessAuth(loggedEmail);
    setTimeout(() => {
      onLoginSuccess(loggedEmail);
    }, 1000);
  };

  return (
    <div id="login-screen-bg" className="min-h-screen bg-[#f3f6fa] flex items-center justify-center p-4 selection:bg-gold-pale selection:text-navy">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-150 relative">
        
        {/* Visual Header Banner */}
        <div id="login-header-banner" className="bg-[#0b1b3d] text-white p-7 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-33 h-33 rounded-full bg-gold/15 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 w-33 h-33 rounded-full bg-indigo-500/10 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="text-4xl p-3 bg-white/10 rounded-2xl mb-3 shadow-xs" role="img" aria-label="Guest Manager Logo">
              📋
            </span>
            <h1 className="font-serif text-2xl font-black tracking-tight text-white leading-tight">
              Seating & RSVP Portal
            </h1>
            <p className="text-[10px] text-slate-350 font-bold tracking-widest mt-1.5 uppercase">
              Isolated Multi-User Account Gateway
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-extrabold tracking-wider bg-white/10 text-white/95">
              {isSyncing ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Connecting cloud database...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Multi-Tenant Sandbox Active</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selector & Main Form */}
        <div className="p-7">
          {successAuth ? (
            <div id="login-success-state" className="py-10 flex flex-col items-center text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-navy">Identity Verified</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Loading isolated deck for: <br />
                  <span className="text-[#bf8f30] font-bold text-sm truncate block mt-1.5">{successAuth}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Isolation Notice banner */}
              <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#bf8f30] mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                  Every account is <span className="text-navy font-bold">100% independent</span>. Your reservations, configurations, and sheet links are saved strictly to your custom Gmail slot, untouched by other users.
                </p>
              </div>

              {/* Tab Selector Toggles */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-150 relative">
                <button
                  id="tab-select-signin"
                  type="button"
                  onClick={() => {
                    setActiveTab("signin");
                    setErrorMsg("");
                  }}
                  className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "signin"
                      ? "bg-white text-navy shadow-xs"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </span>
                </button>
                <button
                  id="tab-select-register"
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setErrorMsg("");
                  }}
                  className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "register"
                      ? "bg-white text-navy shadow-xs"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    Create Account
                  </span>
                </button>
              </div>

              {/* Google Sign In option */}
              <div className="space-y-4 pb-2">
                <button
                  id="google-continue-button"
                  type="button"
                  onClick={() => {
                    setIsGoogleUiOpen(true);
                    setGoogleError("");
                    setGoogleCustomEmail("");
                    setShowGoogleCustomInput(false);
                  }}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-slate-50 text-[#1f1f1f] font-sans font-medium text-sm rounded-xl border border-slate-200 shadow-2xs cursor-pointer transition duration-150 hover:border-slate-350 focus:outline-none"
                >
                  <GoogleIcon />
                  <span className="font-semibold text-xs tracking-wide">Continue with Google</span>
                </button>
                <div className="flex items-center justify-center gap-2 py-0.5 animate-fadeIn">
                  <span className="h-[1px] bg-slate-200 flex-grow" />
                  <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest px-1 leading-none">or log in with credentials</span>
                  <span className="h-[1px] bg-slate-200 flex-grow" />
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4" id="login-form-element">
                
                {/* Email Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest" htmlFor="login-email-input">
                    Gmail Address
                  </label>
                  <div className="relative">
                    <input
                      id="login-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="username@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-gold rounded-xl text-navy font-bold text-xs focus:outline-none focus:ring-1 focus:ring-gold transition shadow-2xs"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Password Input */}
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
                          setRecoveryEmail(email); // autofill what user entered
                          setRecoveredAccount(null);
                        }}
                        className="text-[10px] text-indigo-650 hover:text-indigo-850 font-bold hover:underline cursor-pointer focus:outline-none"
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
                      placeholder={activeTab === "register" ? "Create a secure password" : "Enter password"}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-gold rounded-xl text-navy font-bold text-xs focus:outline-none focus:ring-1 focus:ring-gold transition shadow-2xs"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (only on Register) */}
                {activeTab === "register" && (
                  <div className="space-y-1 animate-fadeIn">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest" htmlFor="login-confirm-password-input">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-confirm-password-input"
                        type={showConfirmPassword ? "text" : "password"}
                        required={activeTab === "register"}
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error message alert */}
                {errorMsg && (
                  <div id="login-error-alert" className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl font-semibold leading-relaxed flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0 inline-block" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Trigger button */}
                <button
                  id="login-submit-button"
                  type="submit"
                  className="w-full py-3 bg-navy hover:bg-[#132852] text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-navy shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2 font-semibold"
                >
                  {activeTab === "signin" ? (
                    <>
                      <LogIn className="w-3.5 h-3.5 text-gold" />
                      <span>Unlock Workspace</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-gold" />
                      <span>Access Sandbox Workspace</span>
                    </>
                  )}
                </button>

              </form>
            </div>
          )}
        </div>
      </div>

      {/* Authentic Google Sign-In Simulated Portal/Modal */}
      {isGoogleUiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            
            {/* Indeterminate loader bar when authenticating */}
            <div className="h-1 bg-slate-100 relative overflow-hidden">
              {isGoogleSigningIn && (
                <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-[#4285F4] rounded-full animate-pulse" />
              )}
            </div>

            <div className="p-8 flex flex-col items-center">
              {/* Google Big Logo */}
              <div className="mb-4">
                <svg className="w-8 h-8" viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              </div>

              {/* Title & Help */}
              <h2 className="text-xl font-sans font-medium text-[#202124] text-center leading-tight">
                {isGoogleSigningIn ? "Signing you in..." : "Sign in with Google"}
              </h2>
              <p className="text-sm text-[#5f6368] text-center mt-2 leading-relaxed">
                to continue to <span className="font-bold text-navy">Seating & RSVP Portal</span>
              </p>

              {isGoogleSigningIn ? (
                <div className="py-12 flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-[#4285F4]/20 border-t-[#4285F4] rounded-full animate-spin mb-4" />
                  <p className="text-xs text-[#5f6368] font-bold tracking-wide animate-pulse">
                    Verifying Google Identity for <strong className="text-navy">{selectedGoogleEmail}</strong>
                  </p>
                </div>
              ) : (
                <div className="w-full mt-6 space-y-4">
                  {/* Account Selector Table List */}
                  {!showGoogleCustomInput ? (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {/* Option 1: Current developer email */}
                      <button
                        type="button"
                        onClick={() => handleGoogleAuth("jero.cp15@gmail.com")}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                          J
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-semibold text-xs text-slate-800 truncate">Jero</p>
                          <p className="text-[10px] text-slate-500 truncate">jero.cp15@gmail.com</p>
                        </div>
                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-[#4285F4] font-bold shrink-0">
                          ✓
                        </div>
                      </button>

                      {/* Option 2: Demo account */}
                      <button
                        type="button"
                        onClick={() => handleGoogleAuth("demo@gmail.com")}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                          D
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-semibold text-xs text-slate-800 truncate">Demo User</p>
                          <p className="text-[10px] text-slate-500 truncate">demo@gmail.com</p>
                        </div>
                      </button>

                      {/* Option 3: Manual Email login */}
                      <button
                        type="button"
                        onClick={() => setShowGoogleCustomInput(true)}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-dashed border-slate-200 hover:bg-slate-50 text-left transition cursor-pointer text-[#4285F4]"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 font-extrabold flex items-center justify-center text-sm shadow-2xs">
                          +
                        </div>
                        <div className="flex-grow">
                          <p className="font-bold text-xs text-[#4285F4]">Use another Google Account</p>
                          <p className="text-[10px] text-slate-500">Sign in with any custom Gmail address</p>
                        </div>
                      </button>
                    </div>
                  ) : (
                    /* Custom Email Form */
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Google Email ID
                        </label>
                        <input
                          type="email"
                          required
                          value={googleCustomEmail}
                          onChange={(e) => setGoogleCustomEmail(e.target.value)}
                          placeholder="yourname@gmail.com"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#4285F4] rounded-xl text-navy font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#4285F4]"
                        />
                      </div>

                      {googleError && (
                        <p className="text-[10px] text-rose-500 font-bold leading-tight">
                          ⚠️ {googleError}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowGoogleCustomInput(false);
                            setGoogleError("");
                          }}
                          className="flex-1 py-2 border border-slate-250 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-center"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGoogleAuth(googleCustomEmail)}
                          className="flex-grow py-2 bg-[#4285F4] hover:bg-[#357ae8] text-white text-xs font-bold rounded-xl cursor-pointer text-center font-semibold"
                        >
                          Verify Google Account
                        </button>
                      </div>
                    </div>
                  )}

                  {!showGoogleCustomInput && googleError && (
                    <p className="text-[10px] text-rose-500 font-bold text-center mt-2">
                      ⚠️ {googleError}
                    </p>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#5f6368] font-medium">
                    <span className="hover:underline cursor-pointer">English (United States)</span>
                    <button
                      type="button"
                      onClick={() => setIsGoogleUiOpen(false)}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Recovery Modal */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="h-1 bg-[#bf8f30]" />
            
            <div className="p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl p-2 bg-amber-50 rounded-xl" role="img" aria-label="Key">
                  🔑
                </span>
                <div>
                  <h2 className="text-lg font-serif font-bold text-navy">
                    Workspace Recovery
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Self-Service Password Retrieval
                  </p>
                </div>
              </div>

              {!recoveredAccount ? (
                /* Phase 1: Locate account */
                <form onSubmit={handleVerifyRecoveryEmail} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter your registered Gmail address below. We'll search security credentials in your sandbox browser registry.
                  </p>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Your Gmail Address
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="username@gmail.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#bf8f30] rounded-xl text-navy font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#bf8f30]"
                    />
                  </div>

                  {recoveryError && (
                    <p className="text-[10px] text-rose-500 font-bold">
                      ⚠️ {recoveryError}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryOpen(false);
                        setRecoveryError("");
                        setRecoveryEmail("");
                      }}
                      className="flex-1 py-2 border border-slate-250 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-center"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="flex-grow py-2 bg-navy hover:bg-[#132852] text-white text-xs font-bold rounded-xl cursor-pointer text-center"
                    >
                      Locate Account
                    </button>
                  </div>
                </form>
              ) : (
                /* Phase 2: Found, provide options */
                <div className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                    <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed">
                      ✓ Workspace Found for <strong className="text-navy">{recoveredAccount.email}</strong>!
                    </p>
                  </div>

                  {recoverySuccess && !recoverySuccess.includes("updated") && (
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {recoverySuccess}
                    </p>
                  )}

                  {/* Option A: Reveal existing password */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      Option A: Reveal Current Password
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type={showNewRecoveryPassword ? "text" : "password"}
                        readOnly
                        value={recoveredAccount.password || "No password"}
                        className="flex-grow px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewRecoveryPassword(!showNewRecoveryPassword)}
                        className="px-2.5 py-1 text-[10px] border border-slate-300 rounded-lg font-bold text-slate-600 bg-white hover:bg-slate-50 transition cursor-pointer"
                      >
                        {showNewRecoveryPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Option B: Set a new password */}
                  {recoveredAccount.password !== "google_authenticated_user" && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                        Option B: Overwrite & Save New Password
                      </span>
                      <div className="space-y-2">
                        <input
                          type="password"
                          placeholder="Type a new secure password"
                          value={newRecoveryPassword}
                          onChange={(e) => setNewRecoveryPassword(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateRecoveryPassword}
                          className="w-full py-1.5 bg-[#bf8f30] hover:bg-gold-light text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                        >
                          Overwrite Password
                        </button>
                      </div>
                    </div>
                  )}

                  {recoveryError && (
                    <p className="text-[10px] text-rose-500 font-bold">
                      ⚠️ {recoveryError}
                    </p>
                  )}

                  {recoverySuccess.includes("updated") && (
                    <p className="text-xs text-emerald-600 font-bold text-center animate-pulse">
                      🎉 {recoverySuccess}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryOpen(false);
                        setRecoveryError("");
                        setRecoveryEmail("");
                        setRecoveredAccount(null);
                        setNewRecoveryPassword("");
                        setRecoverySuccess("");
                      }}
                      className="py-1.5 px-4 border border-slate-250 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-center"
                    >
                      Done / Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
