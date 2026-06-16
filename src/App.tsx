/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Menu, Loader2, RefreshCw } from "lucide-react";

// Types & Defaults
import { Guest, TableConfig, RsvpStatus, EntryType } from "./types";
import { initialGuests, initialTables, initialStaff } from "./data/mockData";

// Config
import { clientConfig } from "./lib/config";

// Auth
import { supabase } from "@/integrations/supabase/client";

// Cloud persistence (account-scoped, survives updates / works across devices)
import {
  loadReservations,
  loadTables,
  loadStaff,
  insertReservation,
  updateReservation,
  deleteReservation,
  bulkUpdateStatus,
  bulkDeleteReservations,
  clearAllReservations,
  importReservations,
  replaceTables,
  replaceStaff,
} from "./lib/db";

// Specialized Views & Overlays
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import ReservationsView from "./components/ReservationsView";
import TableMapView from "./components/TableMapView";
import EntryModal from "./components/EntryModal";
import StaffManagerModal from "./components/StaffManagerModal";
import SyncConfigPanel from "./components/SyncConfigPanel";
import LoginScreen from "./components/LoginScreen";
import ConfirmModal from "./components/ConfirmModal";

// Timezone Utilities
import {
  getDetectedTimezone,
  getSystemTime24InTimezone,
  POPULAR_TIMEZONES
} from "./utils/timezone";


export default function App() {
  const [loggedUsername, setLoggedUsername] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedUsername(session?.user?.email ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setLoggedUsername(data.session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Per-account localStorage key namespace (UI prefs only — not credentials)
  const getAccountKey = (keyName: string) => {
    if (!loggedUsername) return `guest_rsvp_mngr_${keyName}`;
    const safeUser = loggedUsername.toLowerCase().trim().replace(/[@.]/g, "_");
    return `guest_rsvp_mngr_${safeUser}_${keyName}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggedUsername(null);
    showToast("🔓 Logged out of your session successfully");
  };

  // Navigation Tabs state: "dashboard" | "reservations" | "tablemap"
  const [activeTab, setActiveTab] = useState<"dashboard" | "reservations" | "tablemap">("dashboard");

  // Restaurant Custom Brand Configuration (populated from env, overridable by user)
  const [restaurantName, setRestaurantName] = useState(clientConfig.appName);
  const [restaurantPhoto, setRestaurantPhoto] = useState<string | null>(null);


  const handleSaveRestaurantName = (name: string) => {
    setRestaurantName(name);
    localStorage.setItem(getAccountKey("restaurant_name"), name);
    showToast(`🏨 Restaurant updated to: ${name}`);
  };

  const handleSaveRestaurantPhoto = (photo: string | null) => {
    setRestaurantPhoto(photo);
    if (photo) {
      localStorage.setItem(getAccountKey("restaurant_photo"), photo);
      showToast(`📸 Restaurant photo updated successfully`);
    } else {
      localStorage.removeItem(getAccountKey("restaurant_photo"));
      showToast(`🗑️ Restaurant logo reset to default`);
    }
  };

  // Timezone & real-time clock state control
  const [timezone, setTimezone] = useState("AUTO");
  const [currentTime, setCurrentTime] = useState("");

  const activeTz = timezone === "AUTO" ? getDetectedTimezone() : timezone;

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(getSystemTime24InTimezone(activeTz));
    };
    updateTime(); // run immediately
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeTz]);

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem(getAccountKey("timezone"), tz);
    showToast(`App timezone switched to: ${tz === "AUTO" ? getDetectedTimezone() : tz}`);
  };

  // Mobile navigation drawer toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core Database States
  const [guests, setRawGuests] = useState<Guest[]>([]);
  const setGuests = React.useCallback((value: Guest[] | ((prev: Guest[]) => Guest[])) => {
    setRawGuests(prev => {
      const resolved = typeof value === "function" ? value(prev) : value;
      return resolved.map(g => {
        let cleanDate = g.date || "";
        if (cleanDate && (cleanDate.includes("T") || cleanDate.includes("Z"))) {
          try {
            const d = new Date(cleanDate);
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              cleanDate = `${year}-${month}-${day}`;
            } else {
              cleanDate = cleanDate.split("T")[0];
            }
          } catch (e) {
            cleanDate = cleanDate.split("T")[0];
          }
        }
        return { ...g, date: cleanDate };
      });
    });
  }, []);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [staffList, setStaffList] = useState<string[]>([]);
  const [scriptUrl, setScriptUrl] = useState("");

  // Storage and autosave preference states
  const [storageMode, setStorageMode] = useState<"local" | "google_sync">("local");
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Modals state control
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryModalInitialType, setEntryModalInitialType] = useState<"Reservation" | "Walk-In">("Reservation");
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Custom confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Global background sync loader
  const [isSyncing, setIsSyncing] = useState(false);

  // Elite Toast alerting system
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3500);
  };

  // LOAD ALL ACCOUNT DATA FROM THE CLOUD DATABASE (persists across updates)
  useEffect(() => {
    if (!loggedUsername) return;
    let cancelled = false;

    const cachedName = localStorage.getItem("restaurant_name");
    const cachedPhoto = localStorage.getItem("restaurant_photo");
    const cachedTz = localStorage.getItem("timezone");

    (async () => {
      try {
        setIsSyncing(true);
        const [loadedGuests, loadedTablesRaw, loadedStaffRaw] = await Promise.all([
          loadReservations(),
          loadTables(),
          loadStaff(),
        ]);

        // First-time setup: seed default tables / staff into the account.
        let loadedTables = loadedTablesRaw;
        if (loadedTables.length === 0) {
          await replaceTables(initialTables);
          loadedTables = initialTables;
        }
        let loadedStaff = loadedStaffRaw;
        if (loadedStaff.length === 0) {
          await replaceStaff(initialStaff);
          loadedStaff = initialStaff;
        }

        if (cancelled) return;
        setGuests(loadedGuests);
        setTables(loadedTables);
        setStaffList(loadedStaff);
      } catch (err) {
        console.error("Failed to load cloud data", err);
        if (!cancelled) showToast("⚠️ Could not load your saved data. Please refresh.");
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    })();

    // Brand Name & Photo (UI prefs kept in local storage)
    const defaultName = cachedName || clientConfig.appName;
    setRestaurantName(defaultName);
    if (!cachedName) {
      localStorage.setItem("restaurant_name", clientConfig.appName);
    }
    setRestaurantPhoto(cachedPhoto || null);

    // Timezone
    if (cachedTz) {
      setTimezone(cachedTz);
    } else {
      setTimezone("AUTO");
      localStorage.setItem("timezone", "AUTO");
    }

    setStorageMode("local");
    setAutoSave(true);

    return () => {
      cancelled = true;
    };
  }, [loggedUsername]);

  // Mirror the live datasets into local storage so helper components (entry
  // modal conflict checks, table icon lookups) stay in sync. The database
  // remains the source of truth.
  useEffect(() => {
    if (!loggedUsername) return;
    localStorage.setItem("restaurant_reservations", JSON.stringify(guests));
  }, [guests, loggedUsername]);

  useEffect(() => {
    if (!loggedUsername) return;
    localStorage.setItem("guest_rsvp_mngr_tables", JSON.stringify(tables));
  }, [tables, loggedUsername]);

  useEffect(() => {
    if (!loggedUsername) return;
    localStorage.setItem("guest_rsvp_mngr_staff", JSON.stringify(staffList));
  }, [staffList, loggedUsername]);

  // 1. ADD / UPDATE BOOKING ACTION
  const handleSaveGuest = async (savedGuest: Guest) => {
    const exists = guests.some(g => g.id === savedGuest.id);
    setIsEntryModalOpen(false);
    setGuestToEdit(null);
    try {
      if (exists) {
        const updated = await updateReservation(savedGuest, loggedUsername || "");
        setGuests(prev => prev.map(g => (g.id === savedGuest.id ? updated : g)));
        showToast(`✏️ ${savedGuest.name}'s details updated`);
      } else {
        const created = await insertReservation(savedGuest, loggedUsername || "");
        setGuests(prev => [created, ...prev]);
        showToast(`✅ Added reservation for ${savedGuest.name}`);
      }
    } catch (err) {
      console.error(err);
      showToast("⚠️ Failed to save booking. Please try again.");
      setGuests(await loadReservations());
    }
  };

  const handleUpdateGuestStatus = async (id: string, newStatus: RsvpStatus) => {
    setGuests(prev => prev.map(g => (g.id === id ? { ...g, status: newStatus } : g)));
    showToast(`⚡ Status updated to: ${newStatus}`);
    try {
      await bulkUpdateStatus([id], newStatus);
    } catch (err) {
      console.error(err);
      setGuests(await loadReservations());
    }
  };

  // 2. DELETE BOOKING ACTION
  const handleDeleteGuest = (id: string) => {
    const target = guests.find(g => g.id === id);
    if (!target) return;

    setConfirmState({
      isOpen: true,
      title: "Remove Booking",
      message: `Are you absolutely sure you want to remove the booking for ${target.name}?`,
      onConfirm: async () => {
        setGuests(prev => prev.filter(g => g.id !== id));
        showToast(`🗑️ ${target.name}'s reservation deleted`);
        try {
          await deleteReservation(id);
        } catch (err) {
          console.error(err);
          setGuests(await loadReservations());
        }
      }
    });
  };

  const handleBulkUpdateGuestStatus = async (ids: string[], newStatus: RsvpStatus) => {
    setGuests(prev => prev.map(g => ids.includes(g.id) ? { ...g, status: newStatus } : g));
    showToast(`⚡ Bulk updated status of ${ids.length} reservation(s) to: ${newStatus}`);
    try {
      await bulkUpdateStatus(ids, newStatus);
    } catch (err) {
      console.error(err);
      setGuests(await loadReservations());
    }
  };

  const handleBulkDeleteGuests = (ids: string[]) => {
    setConfirmState({
      isOpen: true,
      title: "Bulk Delete Bookings",
      message: `Are you absolutely sure you want to delete the ${ids.length} selected reservation(s)?`,
      onConfirm: async () => {
        setGuests(prev => prev.filter(g => !ids.includes(g.id)));
        showToast(`🗑️ Bulk deleted ${ids.length} reservation(s)`);
        try {
          await bulkDeleteReservations(ids);
        } catch (err) {
          console.error(err);
          setGuests(await loadReservations());
        }
      }
    });
  };

  // 3. EDIT TRIGGER: Pre-populate and show entry modal
  const handleEditGuestClick = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsEntryModalOpen(true);
  };

  // 4. QUICK WALK-IN / NEW BOOKING DIRECT OVERRIDES
  const handleOpenEntryModalDirect = (type: "Reservation" | "Walk-In") => {
    setEntryModalInitialType(type);
    setGuestToEdit(null);
    setIsEntryModalOpen(true);
  };

  // 5. UPDATE GUEST SEATING TABLE DIRECTLY FROM MAP
  const handleUpdateGuestTableDirect = async (guestId: string, tableName: string, forceStatus?: RsvpStatus) => {
    const target = guests.find(g => g.id === guestId);
    if (!target) return;
    const updatedGuest = { ...target, table: tableName, status: forceStatus || target.status };
    setGuests(prev => prev.map(g => (g.id === guestId ? updatedGuest : g)));
    showToast(`🔗 Assigned table to guest`);
    try {
      await updateReservation(updatedGuest, loggedUsername || "");
    } catch (err) {
      console.error(err);
      setGuests(await loadReservations());
    }
  };

  // 6. GENERAL TABLES MANAGER CONF CONFIG SAVE
  const handleUpdateTableConfig = async (newTables: TableConfig[]) => {
    setTables(newTables);
    showToast("⚙️ Table deck configurations updated!");
    try {
      await replaceTables(newTables);
    } catch (err) {
      console.error(err);
      setTables(await loadTables());
    }
  };

  // 7. CREW MEMBERS CREATION/REMOVAL
  const handleAddStaff = async (name: string) => {
    if (staffList.includes(name)) {
      showToast("👤 Staff member name already exists");
      return;
    }
    const updated = [...staffList, name];
    setStaffList(updated);
    showToast(`👤 Waiting staff ${name} registered`);
    try {
      await replaceStaff(updated);
    } catch (err) {
      console.error(err);
      setStaffList(await loadStaff());
    }
  };

  const handleRemoveStaff = async (index: number) => {
    const targetName = staffList[index];
    const updated = staffList.filter((_, i) => i !== index);
    setStaffList(updated);
    showToast(`🗑️ ${targetName} removed from waitstaff`);
    try {
      await replaceStaff(updated);
    } catch (err) {
      console.error(err);
      setStaffList(await loadStaff());
    }
  };

  // 7.5 STORAGE & AUTO-SAVE MANAGEMENT HANDLERS (Simplified offline local fallback)
  const handleUpdateStorageMode = (mode: "local" | "google_sync") => {
    setStorageMode("local");
    setAutoSave(true);
  };

  const handleUpdateAutoSave = (enabled: boolean) => {
    setAutoSave(true);
  };

  const handleManualSaveAll = () => {
    localStorage.setItem("restaurant_reservations", JSON.stringify(guests));
    localStorage.setItem("guest_rsvp_mngr_tables", JSON.stringify(tables));
    localStorage.setItem("guest_rsvp_mngr_staff", JSON.stringify(staffList));
    showToast("💾 Database memory persisted down to browser LocalStorage!");
  };

  const handleDiscardChanges = () => {
    showToast("ℹ️ Auto-saving is active. All interactions are automatically stored.");
  };

  const handleSaveSyncUrl = (url: string) => {};
  const handleTestSync = async () => true;

  // 7.8 JSON DATABASE BACKUP AND RESTORATION HANDLERS
  const handleImportGuests = async (imported: Guest[]) => {
    try {
      const saved = await importReservations(imported, loggedUsername || "");
      setGuests(saved);
      showToast(`📊 Restore completed: Loaded ${saved.length} reservations!`);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Restore failed. Please try again.");
    }
  };

  const handleClearAllGuests = async () => {
    setGuests([]);
    showToast("🧹 Database wiped. Clear reservation logs.");
    try {
      await clearAllReservations();
    } catch (err) {
      console.error(err);
      setGuests(await loadReservations());
    }
  };

  // 9. EXPORT RECORD TO CSV CLIENT DOWNLOAD
  const exportCSV = () => {
    const headers = ["ID", "Name", "Phone", "Type", "Date", "Time", "Pax", "Table Assigned", "Status", "Booked By", "Special Request Notes"];
    
    const rows = guests.map(r => [
      r.id,
      r.name,
      r.phone || "",
      r.type,
      r.date,
      r.time,
      r.pax,
      r.table,
      r.status,
      r.staff || "",
      (r.notes || "").replace(/\n/g, " ")
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast("💾 Reservation list exported as CSV");
  };

  // Local helper: Friendly date string for topbar
  const formatFriendlyDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', timeZone: activeTz };
    return new Date().toLocaleDateString(undefined, options);
  };

  if (!loggedUsername) {
    return (
      <div id="guest-rsvp-manager-login-screen-wrap" className="min-h-screen bg-[#f3f6fa]">
        <div
          id="applet-toast-banner"
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl bg-navy border border-gold text-gold font-bold text-xs shadow-xl transition-all duration-300 transform z-[2100] flex items-center gap-2.5 ${
            isToastVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span>{toastMessage}</span>
        </div>
        <LoginScreen isSyncing={false} />
      </div>
    );
  }

  return (
    <div id="guest-rsvp-manager-applet" className="min-h-screen bg-cream text-navy font-sans antialiased flex flex-col lg:flex-row relative">
      
      {/* Royal Luxury Toast Alert messages */}
      <div
        id="applet-toast-banner"
        className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl bg-navy border border-gold text-gold font-bold text-xs shadow-xl transition-all duration-300 transform z-[2100] flex items-center gap-2.5 ${
          isToastVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
        <span>{toastMessage}</span>
      </div>

      {/* Sidebar navigation control */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openEntryModal={handleOpenEntryModalDirect}
        openStaffModal={() => setIsStaffModalOpen(true)}
        openSyncModal={() => setIsSyncModalOpen(true)}
        exportCSV={exportCSV}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isSynced={false}
        sheetUrlConfigured={false}
        username={loggedUsername}
        onLogout={handleLogout}
        restaurantName={restaurantName}
        setRestaurantName={handleSaveRestaurantName}
        restaurantPhoto={restaurantPhoto}
        setRestaurantPhoto={handleSaveRestaurantPhoto}
        hasUnsavedChanges={false}
        onManualSave={handleManualSaveAll}
      />

      {/* Primary content view main stage body */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* Elite top navigation bar */}
        <header className="bg-white border-b border-gray-200 min-h-[72px] sticky top-0 z-30 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Hamburger trigger */}
            <button
               id="sidebar-toggle-hamburger"
               onClick={() => setIsSidebarOpen(true)}
               className="lg:hidden p-2.5 bg-slate-50 border border-gray-200 text-navy rounded-xl hover:bg-slate-100 transition cursor-pointer"
               title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="font-serif text-xl font-extrabold text-navy leading-none">
                {activeTab === "dashboard" && "Dashboard Snapshots"}
                {activeTab === "reservations" && "Reservations Registry"}
                {activeTab === "tablemap" && "Dining Floor Grid"}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-1 uppercase">
                {activeTab === "dashboard" && "Live Metrics Analytics & Snapshot"}
                {activeTab === "reservations" && "Search, Filter, Export & Modify List"}
                {activeTab === "tablemap" && "Interactive Seating map and linking"}
              </p>
            </div>

            {/* Date Indicator tag */}
            <span id="header-today-date-badge" className="hidden sm:inline-block bg-gold-pale border border-gold-light text-gold text-xs font-bold px-4 py-1.5 rounded-full uppercase ml-2 tracking-wide">
              📅 {formatFriendlyDate()} <span className="ml-1 text-navy opacity-80">🕒 {currentTime}</span>
            </span>
          </div>

          {/* Quick Action headers inside the Topbar */}
          <div className="flex items-center gap-2">

            <button
              id="header-quick-walkin-btn"
              onClick={() => handleOpenEntryModalDirect("Walk-In")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              🚶 Log Walk-In
            </button>

            <button
              id="header-quick-booking-btn"
              onClick={() => handleOpenEntryModalDirect("Reservation")}
              className="px-4 py-2 bg-gold hover:bg-gold-light text-white font-bold text-xs rounded-full border border-gold-light transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              ➕ Book Reservation
            </button>
          </div>
        </header>

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div id="unsaved-changes-banner" className="bg-amber-100 border-b border-amber-300 px-6 py-2.5 flex items-center justify-between text-navy text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="truncate">You have unsaved changes in-memory (Autosave is suspended). Please save or synchronise manually.</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                id="banner-discard-btn"
                onClick={handleDiscardChanges}
                className="px-3.5 py-1 text-slate-600 bg-white hover:bg-slate-50 border border-slate-250 rounded-lg text-[10px] font-bold transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                id="banner-save-btn"
                onClick={handleManualSaveAll}
                className="px-4 py-1 text-white bg-amber-500 hover:bg-amber-600 rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs"
              >
                Save All
              </button>
            </div>
          </div>
        )}

        {/* Content view body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === "dashboard" && (
            <DashboardView
              guests={guests}
              onEditGuest={handleEditGuestClick}
              onDeleteGuest={handleDeleteGuest}
              onUpdateStatus={handleUpdateGuestStatus}
              timezone={activeTz}
              tables={tables}
            />
          )}

          {activeTab === "reservations" && (
            <ReservationsView
              guests={guests}
              onEditGuest={handleEditGuestClick}
              onDeleteGuest={handleDeleteGuest}
              onUpdateStatus={handleUpdateGuestStatus}
              onBulkUpdateStatus={handleBulkUpdateGuestStatus}
              onBulkDeleteGuests={handleBulkDeleteGuests}
              tables={tables}
            />
          )}

          {activeTab === "tablemap" && (
            <TableMapView
              guests={guests}
              tables={tables}
              onUpdateTableConfig={handleUpdateTableConfig}
              onUpdateGuestTable={handleUpdateGuestTableDirect}
              openEntryModal={handleOpenEntryModalDirect}
              timezone={activeTz}
            />
          )}
        </main>

      </div>

      {/* 1. GUEST BOOKING ADD/EDIT MODAL OVERLAY */}
      <EntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setGuestToEdit(null);
        }}
        onSave={handleSaveGuest}
        guestToEdit={guestToEdit}
        tables={tables}
        staffList={staffList}
        initialType={entryModalInitialType}
        timezone={activeTz}
        guestsKey={getAccountKey("guests")}
      />

      {/* 2. CREW/STAFF manager modal overlay */}
      <StaffManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        onAddStaff={handleAddStaff}
        onRemoveStaff={handleRemoveStaff}
      />

      {/* 3. OFFLINE STANDALONE LOCAL STORAGE DATABASE HUB */}
      <SyncConfigPanel
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        guests={guests}
        onImportGuests={handleImportGuests}
        onClearAllGuests={handleClearAllGuests}
      />

      {/* 4. CUSTOM CONFIRMATION ACTION DIALOG OVERLAY */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />



    </div>
  );
}
