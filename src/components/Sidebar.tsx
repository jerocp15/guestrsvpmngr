/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { LayoutDashboard, CalendarRange, Map, UserPlus, Footprints, Users, FileSpreadsheet, Printer, Shield, LogOut, Camera, Check, X, Pencil, Trash2, Database } from "lucide-react";

interface SidebarProps {
  activeTab: "dashboard" | "reservations" | "tablemap";
  setActiveTab: (tab: "dashboard" | "reservations" | "tablemap") => void;
  openEntryModal: (type: "Reservation" | "Walk-In") => void;
  openStaffModal: () => void;
  openSyncModal: () => void;
  exportCSV: () => void;
  isOpen: boolean;
  onClose: () => void;
  isSynced: boolean;
  sheetUrlConfigured: boolean;
  username: string | null;
  onLogout: () => void;
  restaurantName: string;
  setRestaurantName: (name: string) => void;
  restaurantPhoto: string | null;
  setRestaurantPhoto: (photo: string | null) => void;
  hasUnsavedChanges: boolean;
  onManualSave: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  openEntryModal,
  openStaffModal,
  openSyncModal,
  exportCSV,
  isOpen,
  onClose,
  isSynced,
  sheetUrlConfigured,
  username,
  onLogout,
  restaurantName,
  setRestaurantName,
  restaurantPhoto,
  setRestaurantPhoto,
  hasUnsavedChanges,
  onManualSave
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(restaurantName);

  const handleNameSave = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setRestaurantName(trimmed);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setTempName(restaurantName);
      setIsEditingName(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setRestaurantPhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-overlay-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 z-40 lg:hidden transition-opacity"

        />
      )}

      <aside
        id="app-sidebar-container"
        className={`fixed lg:sticky top-0 left-0 bottom-0 w-[270px] bg-navy text-white flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Logo & Header */}
        <div id="brand-restaurant-header" className="p-7 border-b border-slate-600">
          <div className="flex items-center gap-3">
            {/* Custom Photo or default icon */}
            <div className="relative group shrink-0">
              <div 
                id="restaurant-avatar-frame"
                onClick={triggerUpload}
                className="w-12 h-12 rounded-full overflow-hidden border border-slate-500 bg-slate-800 flex items-center justify-center cursor-pointer hover:border-gold transition-all duration-300 relative group"
                title="Click to change restaurant photo"
              >
                {restaurantPhoto ? (
                  <img src={restaurantPhoto} alt="Restaurant Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-2xl" role="img" aria-label="Guest Manager Logo">📋</span>
                )}
                {/* Hover Camera overlay */}
                <div className="absolute inset-0 bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="restaurant-photo-file-input"
              />
              {/* Reset photo button */}
              {restaurantPhoto && (
                <button
                  id="reset-restaurant-photo-btn"
                  onClick={() => setRestaurantPhoto(null)}
                  className="absolute -bottom-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition cursor-pointer"
                  title="Remove photo"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    id="edit-restaurant-name-input"
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-slate-700 text-white font-serif text-sm px-1.5 py-1 rounded border border-slate-500 focus:border-gold outline-none"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      id="save-restaurant-name-btn"
                      onClick={handleNameSave}
                      className="p-1 rounded bg-[#bf8f30] hover:bg-gold-light text-white transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="cancel-restaurant-name-btn"
                      onClick={() => {
                        setTempName(restaurantName);
                        setIsEditingName(false);
                      }}
                      className="p-1 rounded bg-slate-600 hover:bg-slate-500 text-slate-300 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/title">
                  <h1 
                    id="restaurant-name-heading"
                    onClick={() => {
                      setTempName(restaurantName);
                      setIsEditingName(true);
                    }}
                    className="font-serif text-lg font-bold tracking-tight text-white leading-tight cursor-pointer hover:text-gold transition truncate max-w-[145px]"
                    title="Click to edit name"
                  >
                    {restaurantName}
                  </h1>
                  <button
                    id="toggle-edit-restaurant-name-btn"
                    onClick={() => {
                      setTempName(restaurantName);
                      setIsEditingName(true);
                    }}
                    className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-600 transition cursor-pointer group-hover/title:opacity-100 lg:opacity-0"
                    title="Edit Name"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-300 font-medium tracking-wide mt-1 uppercase">
                {sheetUrlConfigured ? "Google Sheets Link" : "Standalone Local"}
              </p>
            </div>
          </div>
        </div>

        {/* User Session Role Profile card */}
        <div id="sidebar-role-profile-badge" className="mx-4 mt-5 p-3.5 bg-slate-800 border border-slate-600 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-900 text-amber-200">
              <Shield className="w-4 h-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest leading-none">Gmail Account</p>
              <h4 className="text-[11px] text-white font-black leading-none mt-1 truncate max-w-[125px]" title={username || "Manager"}>
                {username ? username : "demo@gmail.com"}
              </h4>
            </div>
          </div>
          <button
            id="sidebar-session-logout-btn"
            onClick={onLogout}
            title="Sign out of physical dashboard"
            className="p-1.5 px-2.5 border border-rose-600 text-rose-300 bg-rose-900 hover:bg-rose-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shrink-0"
          >
            <LogOut className="w-3 h-3" />
            <span>Out</span>
          </button>
        </div>

        {/* Sidebar Navigations */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-4">
          {/* Main Views */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider px-3 mb-2.5">
              Main
            </div>
            <div className="space-y-1">
              <button
                id="sidebar-nav-dashboard"
                onClick={() => {
                  setActiveTab("dashboard");
                  onClose();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "dashboard"
                    ? "bg-amber-700 text-white border-l-2 border-amber-400 font-semibold"
                    : "text-white hover:bg-slate-700 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span>Dashboard</span>
              </button>

              <button
                id="sidebar-nav-reservations"
                onClick={() => {
                  setActiveTab("reservations");
                  onClose();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "reservations"
                    ? "bg-amber-700 text-white border-l-2 border-amber-400 font-semibold"
                    : "text-white hover:bg-slate-700 hover:text-white"
                }`}
              >
                <CalendarRange className="w-5 h-5 shrink-0" />
                <span>All Reservations</span>
              </button>

              <button
                id="sidebar-nav-tablemap"
                onClick={() => {
                  setActiveTab("tablemap");
                  onClose();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "tablemap"
                    ? "bg-amber-700 text-white border-l-2 border-amber-400 font-semibold"
                    : "text-white hover:bg-slate-700 hover:text-white"
                }`}
              >
                <Map className="w-5 h-5 shrink-0" />
                <span>Table Map</span>
              </button>
            </div>
          </div>

          {/* Quick Creator Operations */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider px-3 mb-2.5">
              Actions
            </div>
            <div className="space-y-1">
              <button
                id="sidebar-action-reservation"
                onClick={() => {
                  openEntryModal("Reservation");
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-slate-700 hover:text-white transition-all text-left"
              >
                <UserPlus className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>Add Reservation</span>
              </button>

              <button
                id="sidebar-action-walkin"
                onClick={() => {
                  openEntryModal("Walk-In");
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-slate-700 hover:text-white transition-all text-left"
              >
                <Footprints className="w-5 h-5 shrink-0 text-amber-400" />
                <span>Log Walk-In</span>
              </button>
            </div>
          </div>

          {/* Configuration and Tools */}
          <div>
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider px-3 mb-2.5">
              Tools
            </div>
            <div className="space-y-1">
              {/* Manage Staff is open to all accounts */}
              <button
                id="sidebar-tool-staff"
                onClick={() => {
                  openStaffModal();
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-slate-700 hover:text-white transition-all text-left cursor-pointer"
              >
                <Users className="w-5 h-5 shrink-0 text-blue-400" />
                <span>Manage Staff</span>
              </button>

              <button
                id="sidebar-tool-sync"
                onClick={() => {
                  openSyncModal();
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-slate-700 hover:text-white transition-all text-left cursor-pointer"
              >
                <Database className="w-5 h-5 shrink-0 text-[#e5c583]" />
                <span>Database Hub</span>
              </button>

              <div
                id="sidebar-tool-save-local"
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all text-left text-emerald-400 bg-emerald-550/10 border-l-2 border-emerald-500"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-base shrink-0" role="img" aria-label="Auto Save">🛡️</span>
                  <span>Auto-Save Active</span>
                </div>
              </div>

              <button
                id="sidebar-tool-export"
                onClick={() => {
                  exportCSV();
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-slate-700 hover:text-white transition-all text-left"
              >
                <FileSpreadsheet className="w-5 h-5 shrink-0 text-teal-400" />
                <span>Export CSV</span>
              </button>

              <button
                id="sidebar-tool-print"
                onClick={() => {
                  window.print();
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-slate-700 hover:text-white transition-all text-left"
              >
                <Printer className="w-5 h-5 shrink-0 text-violet-400" />
                <span>Print View</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Footer State indicators */}
        <div className="p-5 border-t border-slate-600 text-center">
          <p className="text-[11px] text-slate-300 font-medium tracking-wide">
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Offline Local Database
            </span>
          </p>
          <p className="text-[9px] text-slate-400 mt-1 uppercase font-semibold">
            Vite & React Platform
          </p>
        </div>
      </aside>
    </>
  );
}
