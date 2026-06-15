/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Guest, TableConfig, RsvpStatus } from "../types";
import { Calendar, RefreshCw, Settings2, Plus, X, Trash2, CheckCircle2 } from "lucide-react";
import { getTodayStringInTimezone } from "../utils/timezone";

interface TableMapViewProps {
  guests: Guest[];
  tables: TableConfig[];
  onUpdateTableConfig: (updatedTables: TableConfig[]) => void;
  onUpdateGuestTable: (guestId: string, tableName: string, status?: RsvpStatus) => void;
  openEntryModal: (type: "Reservation", prefilledTable?: string) => void;
  timezone?: string;
}

export default function TableMapView({
  guests,
  tables,
  onUpdateTableConfig,
  onUpdateGuestTable,
  openEntryModal,
  timezone
}: TableMapViewProps) {
  // Map date selection
  const getTodayString = () => {
    return getTodayStringInTimezone(timezone || "UTC");
  };

  const [mapDate, setMapDate] = useState(getTodayString());

  // Dynamic mapDate reset when timezone changes
  React.useEffect(() => {
    setMapDate(getTodayString());
  }, [timezone]);

  // Table Manager Modal
  const [isTMOpen, setIsTMOpen] = useState(false);
  const [localTables, setLocalTables] = useState<TableConfig[]>([]);

  // Individual Table Status Edit Modal
  const [isTSOpen, setIsTSOpen] = useState(false);
  const [selectedTableIndex, setSelectedTableIndex] = useState<number | null>(null);
  const [selectedOverride, setSelectedOverride] = useState<string>("");

  // Helper: check table status for specific date
  const getTableState = (table: TableConfig, dateStr: string) => {
    if (table.override) return table.override; // "available" or "unavailable"

    // Find if a guest is assigned to this table on this date
    // Statuses that count as holding a table: Confirmed, Seated, Pending
    const activeGuest = guests.find(
      g => g.table === table.name && g.date === dateStr && [RsvpStatus.CONFIRMED, RsvpStatus.SEATED, RsvpStatus.PENDING].includes(g.status)
    );

    if (!activeGuest) return "available";
    return activeGuest.status === RsvpStatus.SEATED ? "seated" : "reserved"; // "seated" translates to occupied, "reserved" translates to blue
  };

  // Metrics counting
  let availableCount = 0;
  let reservedCount = 0;
  let occupiedCount = 0;
  let blockedCount = 0;

  tables.forEach(t => {
    const state = getTableState(t, mapDate);
    if (state === "available") availableCount++;
    else if (state === "reserved") reservedCount++;
    else if (state === "seated") occupiedCount++;
    else if (state === "unavailable") blockedCount++;
  });

  // Open general Table Config Manager
  const handleOpenTM = () => {
    setLocalTables(JSON.parse(JSON.stringify(tables)));
    setIsTMOpen(true);
  };

  const handleAddTableRow = () => {
    const newNo = localTables.length + 1;
    const newRow: TableConfig = {
      name: `Table ${newNo}`,
      capacity: 4,
      icon: "🔥",
      override: ""
    };
    setLocalTables([...localTables, newRow]);
  };

  const handleRemoveTableRow = (idx: number) => {
    setLocalTables(localTables.filter((_, i) => i !== idx));
  };

  const handleSaveTM = () => {
    onUpdateTableConfig(localTables);
    setIsTMOpen(false);
  };

  // Open individual status update dialog
  const handleOpenTS = (idx: number) => {
    setSelectedTableIndex(idx);
    const table = tables[idx];
    setSelectedOverride(table.override || "");
    setIsTSOpen(true);
  };

  const handleApplyTableStatus = () => {
    if (selectedTableIndex === null) return;
    const updated = [...tables];
    updated[selectedTableIndex].override = selectedOverride;
    onUpdateTableConfig(updated);

    // If linking a reservation, update the guest's assigned table
    const selectEl = document.getElementById("ts-rsvp-select") as HTMLSelectElement;
    if (selectEl && selectEl.value) {
      const gId = selectEl.value;
      const tName = tables[selectedTableIndex].name;
      // Also check if they want to auto-seat them based on status selected
      let newStatus: RsvpStatus | undefined;
      if (selectedOverride === "seated") {
        newStatus = RsvpStatus.SEATED;
      } else if (selectedOverride === "reserved") {
        newStatus = RsvpStatus.CONFIRMED;
      }
      onUpdateGuestTable(gId, tName, newStatus);
    }

    setIsTSOpen(false);
    setSelectedTableIndex(null);
  };

  // Get active linked guest for table on mapDate
  const getLinkedGuest = (tName: string) => {
    return guests.find(
      g => g.table === tName && g.date === mapDate && [RsvpStatus.CONFIRMED, RsvpStatus.SEATED, RsvpStatus.PENDING].includes(g.status)
    );
  };

  // Daily reservations that can be linked
  const eligibleReservationsForDate = guests.filter(
    g => g.date === mapDate && [RsvpStatus.CONFIRMED, RsvpStatus.PENDING].includes(g.status)
  );

  return (
    <div id="table-map-manager-view" className="space-y-6 animate-fadeIn pb-12">
      {/* Title */}
      <div>
        <h2 className="font-serif text-3xl font-bold text-navy tracking-tight">
          Dining Floor Table Map
        </h2>
        <p className="text-sm text-[#4b5c73] mt-1 font-medium">
          Visualize real-time seating inventory. Map is synchronized for any selected calendar date.
        </p>
      </div>

      {/* Map controller row */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Calendar picker */}
          <div className="bg-white rounded-full px-4 py-2 border border-gray-150 shadow-xs flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#c9972c]" />
            <input
              type="date"
              value={mapDate}
              onChange={(e) => setMapDate(e.target.value)}
              className="text-xs font-bold text-navy bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
            />
          </div>

          <button
            onClick={() => setMapDate(getTodayString())}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-gray-150 rounded-full text-xs font-semibold text-navy-soft flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Today
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleOpenTM}
            className="px-5 py-2 bg-navy hover:bg-navy-mid border border-[#243652] rounded-full text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-gold-light" />
            Manage Table Config
          </button>

          <button
            onClick={() => openEntryModal("Reservation")}
            className="px-5 py-2 bg-gold hover:bg-gold-light border border-[#b28525] rounded-full text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            New Reservation
          </button>
        </div>
      </div>

      {/* Summary states panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white px-5 py-4 border border-gray-150 rounded-2xl flex items-center justify-between shadow-2xs">
          <span className="text-xs font-bold text-[#8a9ab5] uppercase">🟢 Available</span>
          <span className="font-serif text-2xl font-bold text-emerald-600">{availableCount}</span>
        </div>

        <div className="bg-white px-5 py-4 border border-gray-150 rounded-2xl flex items-center justify-between shadow-2xs">
          <span className="text-xs font-bold text-[#8a9ab5] uppercase">🔵 Reserved</span>
          <span className="font-serif text-2xl font-bold text-indigo-600">{reservedCount}</span>
        </div>

        <div className="bg-white px-5 py-4 border border-gray-150 rounded-2xl flex items-center justify-between shadow-2xs">
          <span className="text-xs font-bold text-[#8a9ab5] uppercase">🟠 Occupied</span>
          <span className="font-serif text-2xl font-bold text-amber-500">{occupiedCount}</span>
        </div>

        <div className="bg-white px-5 py-4 border border-gray-150 rounded-2xl flex items-center justify-between shadow-2xs">
          <span className="text-xs font-bold text-[#8a9ab5] uppercase">🔴 Reserved</span>
          <span className="font-serif text-2xl font-bold text-rose-600">{blockedCount}</span>
        </div>
      </div>

      {/* Table Map grid cards container */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="p-6 md:p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
          {tables.map((t, idx) => {
            const state = getTableState(t, mapDate);
            const activeGuestObj = getLinkedGuest(t.name);

            // Setup border classes based on dining state
            let borderCls = "border-emerald-300 ring-2 ring-emerald-50 bg-emerald-500/5 hover:bg-emerald-500/10";
            let statusBadge = <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold uppercase py-0.5 px-2 rounded-md">Available</span>;

            if (state === "reserved") {
              borderCls = "border-indigo-300 ring-2 ring-indigo-50 bg-indigo-500/5 hover:bg-indigo-500/10";
              statusBadge = <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold uppercase py-0.5 px-2 rounded-md">Reserved</span>;
            } else if (state === "seated") {
              borderCls = "border-amber-300 ring-2 ring-amber-50 bg-amber-500/5 hover:bg-amber-500/10";
              statusBadge = <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold uppercase py-0.5 px-2 rounded-md">Occupied</span>;
            } else if (state === "unavailable") {
              borderCls = "border-rose-200 ring-2 ring-rose-50 bg-rose-500/5 hover:bg-rose-500/10";
              statusBadge = <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-800 font-bold uppercase py-0.5 px-2 rounded-md">Reserved</span>;
            }

            return (
              <div
                key={idx}
                onClick={() => handleOpenTS(idx)}
                className={`border-2 rounded-2xl p-5 text-center cursor-pointer transition transform active:scale-98 ${borderCls} h-44 flex flex-col justify-between`}
              >
                <div>
                  <span className="text-3xl block mb-1">{t.icon || "🔥"}</span>
                  <h4 className="font-serif text-sm font-bold text-navy leading-tight">
                    {t.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide">
                    Cap: 👤 {t.capacity} max
                  </p>
                </div>

                {/* Match Link information */}
                <div className="my-2 min-h-6">
                  {activeGuestObj ? (
                    <div className="text-[11px] font-bold text-[#c9972c] truncate bg-amber-50/70 py-1 px-1.5 rounded-lg border border-gold-light" title={`Assigned to ${activeGuestObj.name}`}>
                      🔗 {activeGuestObj.name}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium italic">— Vacant —</span>
                  )}
                </div>

                <div>
                  {statusBadge}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-8 py-5 border-t border-gray-150 bg-slate-50 flex flex-wrap justify-between items-center text-xs font-semibold text-[#4b5c73] gap-4">
          <div className="flex flex-wrap gap-5">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" /> Booked</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Occupied/Seated</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full" /> Reserved</span>
          </div>
          <p className="text-[11px] text-[#8a9ab5] font-medium leading-none">
            💡 Tip: Click on any table to link guests, set manual overrides, or free up seats
          </p>
        </div>
      </div>

      {/* INDIVIDUAL TABLE STATUS CONTROL DIALOG */}
      {isTSOpen && selectedTableIndex !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-fadeIn">
            {/* Header */}
            <div className="bg-navy px-6 py-5 flex items-center justify-between text-white">
              <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                <span>{tables[selectedTableIndex].icon}</span>
                <span>{tables[selectedTableIndex].name} - Seating Status</span>
              </h3>
              <button
                onClick={() => setIsTSOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Overrides Selection buttons */}
              <div>
                <label className="block text-xs font-bold text-[#8a9ab5] uppercase tracking-wider mb-2.5">
                  Force Table Status override
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setSelectedOverride("")}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      selectedOverride === ""
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    Auto (Available)
                  </button>

                  <button
                    onClick={() => setSelectedOverride("unavailable")}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      selectedOverride === "unavailable"
                        ? "border-rose-500 bg-rose-50 text-rose-800"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    🚫 Reserve Table
                  </button>
                </div>
              </div>

              {/* Linking helper select */}
              {selectedOverride !== "unavailable" && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold text-[#8a9ab5] uppercase tracking-wider">
                    🔗 Associate guest reservation
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Assign a scheduled guest for <b>{mapDate}</b> directly to this table.
                  </p>
                  <select
                    id="ts-rsvp-select"
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
                  >
                    <option value="">— Choose Scheduled Guest —</option>
                    {eligibleReservationsForDate.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} (pax: {g.pax} · {g.time || "No time"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-150 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsTSOpen(false)}
                className="px-4 py-2 border border-slate-250 bg-white text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyTableStatus}
                className="px-4 py-2 bg-navy hover:bg-navy-mid text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERAL TABLE DECK MANAGER DIALOG */}
      {isTMOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl animate-fadeIn flex flex-col">
            {/* Header */}
            <div className="bg-navy px-6 py-5 flex items-center justify-between text-white shrink-0">
              <div>
                <h3 className="font-serif text-lg font-bold">
                  ⚙️ Physical Tables Manager
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  Update your overall seating configurations, sitting capacities, and custom design icons.
                </p>
              </div>
              <button
                onClick={() => setIsTMOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/95 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="hidden-scrollbar overflow-y-auto p-6 flex-1 space-y-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-[#8a9ab5] uppercase">
                  ACTIVE tables ({localTables.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddTableRow}
                  className="px-3.5 py-1.5 bg-gold/15 hover:bg-gold/25 text-gold text-xs font-bold rounded-xl border border-gold-light/40 flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Table Row
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-55 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <th className="py-2.5 px-3 w-20">Icon</th>
                      <th className="py-2.5 px-3">Unique Name</th>
                      <th className="py-2.5 px-3 w-28">Sitting Cap</th>
                      <th className="py-2.5 px-3 w-36">Reserved State</th>
                      <th className="py-2.5 px-3 text-right w-16">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {localTables.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30">
                        {/* Icon emoji select */}
                        <td className="py-2 px-3">
                          <select
                            value={t.icon}
                            onChange={(e) => {
                              const updated = [...localTables];
                              updated[idx].icon = e.target.value;
                              setLocalTables(updated);
                            }}
                            className="bg-slate-100 border border-slate-200 rounded-md py-1 px-1.5 text-navy font-bold focus:outline-none focus:ring-1 focus:ring-gold"
                          >
                            <option value="🔥">🔥 Fire</option>
                            <option value="💧">💧 Water</option>
                            <option value="🍹">🍹 Bar Drink</option>
                          </select>
                        </td>

                        {/* Name input */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => {
                              const updated = [...localTables];
                              updated[idx].name = e.target.value;
                              setLocalTables(updated);
                            }}
                            placeholder="Table 1"
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-md py-1 px-2.5 text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gold"
                          />
                        </td>

                        {/* Seats Capacity */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={t.capacity}
                            onChange={(e) => {
                              const updated = [...localTables];
                              updated[idx].capacity = parseInt(e.target.value) || 2;
                              setLocalTables(updated);
                            }}
                            className="w-20 bg-slate-50/50 border border-slate-200 rounded-md py-1 px-2 text-navy font-bold focus:outline-none focus:ring-1 focus:ring-gold"
                          />
                        </td>

                        {/* Overriding state */}
                        <td className="py-2 px-3">
                          <select
                            value={t.override}
                            onChange={(e) => {
                              const updated = [...localTables];
                              updated[idx].override = e.target.value;
                              setLocalTables(updated);
                            }}
                            className="bg-slate-100 border border-slate-200 rounded-md py-1 px-1.5 text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gold text-[11px]"
                          >
                            <option value="">Auto (Seatable)</option>
                            <option value="unavailable">🚫 Reserved</option>
                          </select>
                        </td>

                        {/* Row removal */}
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveTableRow(idx)}
                            className="p-1.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-150 flex justify-end gap-2 text-xs shrink-0">
              <button
                onClick={() => setIsTMOpen(false)}
                className="px-4 py-2 border border-slate-250 bg-white text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTM}
                className="px-4 py-2 bg-navy hover:bg-navy-mid text-white font-bold rounded-lg transition cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
